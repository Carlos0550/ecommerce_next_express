import { prisma } from '@/config/prisma';
import { analyzeProductImages } from '@/config/groq';
import { uploadImage } from '@/config/minio';
import { messageService } from '../../message.service';
import { sessionManager } from '../session.manager';
import { WhatsAppConversationSession } from '../../../schemas/whatsapp.schemas';
const STORE_URL = process.env.STORE_URL || process.env.FRONTEND_URL || '';
class ProductActions {
  async processWithAI(
    session: WhatsAppConversationSession,
    availableCategories?: { id: string; title: string }[]
  ): Promise<void> {
    try {
      if (session.productData.images.length === 0) {
        session.lastError = 'No hay imágenes para procesar';
        return;
      }
      const aiResult = await analyzeProductImages(
        session.productData.images,
        session.productData.additionalContext,
        availableCategories
      );
      session.productData.aiResult = aiResult;
      session.lastError = undefined;
      if (aiResult.suggestedCategory) {
        console.log(`📂 Categoría inferida por IA: ${aiResult.suggestedCategory.name} (confianza: ${aiResult.suggestedCategory.confidence})`);
      } else {
        console.log(`📂 La IA no pudo inferir una categoría`);
      }
      const previewMessage = this.formatProductPreview(session);
      session.messageHistory.push({
        role: 'assistant',
        content: `[SISTEMA: Producto procesado con IA]\n${previewMessage}`,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error procesando con IA:', error);
      session.lastError = 'Error al procesar las imágenes con IA';
      throw error;
    }
  }
  async createProduct(session: WhatsAppConversationSession): Promise<void> {
    const { productData } = session;
    if (!productData.aiResult || !productData.categoryId) {
      throw new Error('Faltan datos para crear el producto');
    }
    try {
      const productState = productData.draft ? 'draft' : 'active';
      const storedImages = await this.storeImagesToBucket(productData.images);
      const product = await prisma.products.create({
        data: {
          title: productData.aiResult.title,
          description: productData.aiResult.description,
          price: productData.price || 0,
          stock: productData.stock || 1,
          images: storedImages,
          options: productData.aiResult.options,
          categoryId: productData.categoryId,
          state: productState,
        },
      });
      const productLink = STORE_URL ? `${STORE_URL}/producto/${product.id}` : '';
      const isDraft = productState === 'draft';
      let successMessage = isDraft 
        ? `✅ *¡Producto guardado como borrador!*`
        : `✅ *¡Producto creado exitosamente!*`;
      successMessage += `
📦 ${product.title}
💰 $${product.price.toLocaleString()}
📊 Stock: ${product.stock}
📋 Estado: ${isDraft ? 'Borrador' : 'Activo'}
🆔 ID: ${product.id}`;
      if (productLink) {
        successMessage += `
🔗 Link: ${productLink}`;
      }
      await messageService.sendMessage(session.phone, successMessage);
      const previewMessage = this.formatPersistedPreview(productLink, product);
      await messageService.sendMessage(session.phone, previewMessage);
      session.messageHistory.push({
        role: 'system',
        content: `[SISTEMA: Producto creado y publicado]\nID: ${product.id}\nTítulo: ${product.title}${productLink ? `\nLink: ${productLink}` : ''}`,
        timestamp: new Date(),
      });
      session.lastError = undefined;
      session.selectedProductId = product.id;
      session.searchResults = [{
        id: product.id,
        title: product.title,
        price: Number(product.price),
        stock: product.stock,
        state: product.state,
      }];
      session.state = 'editing';
      session.productData = { images: [] };
      await sessionManager.saveSession(session);
    } catch (error) {
      console.error('Error creando producto:', error);
      session.lastError = 'Error al crear el producto en la base de datos';
      throw error;
    }
  }
  async updateProduct(
    session: WhatsAppConversationSession,
    field: string,
    value: string | number | undefined,
    regenerateWithAI?: boolean,
    userContext?: string
  ): Promise<void> {
    if (!session.selectedProductId) {
      await messageService.sendMessage(
        session.phone,
        '❌ No hay producto seleccionado. Primero busca y selecciona un producto.'
      );
      return;
    }
    try {
      const product = await prisma.products.findUnique({
        where: { id: session.selectedProductId },
        include: { category: true },
      });
      if (!product) {
        await messageService.sendMessage(session.phone, '❌ Producto no encontrado.');
        return;
      }
      const updateData: Record<string, any> = {};
      let successMessage = '';
      switch (field) {
        case 'title':
          updateData.title = value;
          successMessage = `✅ Título actualizado a: *${value}*`;
          break;
        case 'description':
          if (regenerateWithAI) {
            await messageService.sendMessage(session.phone, '🤖 Regenerando descripción con IA...');
            if (userContext && product.description) {
              console.log(`📝 Usando modelo de TEXTO para aplicar correcciones: ${userContext}`);
              const { regenerateDescriptionWithCorrections } = await import('@/config/groq');
              const correctedDescription = await regenerateDescriptionWithCorrections(
                product.description,
                product.title,
                userContext
              );
              updateData.description = correctedDescription;
              successMessage = `✅ Descripción corregida y guardada:\n\n${correctedDescription}`;
            } else {
              const images = Array.isArray(product.images) ? product.images as string[] : [];
              if (images.length === 0) {
                await messageService.sendMessage(
                  session.phone,
                  '❌ El producto no tiene imágenes para regenerar la descripción.'
                );
                return;
              }
              const aiResult = await analyzeProductImages(images, product.title);
              updateData.description = aiResult.description;
              successMessage = `✅ Descripción regenerada y guardada:\n\n${aiResult.description}`;
            }
          } else {
            updateData.description = value;
            successMessage = `✅ Descripción actualizada y guardada.`;
          }
          break;
        case 'price':
          updateData.price = Number(value);
          successMessage = `✅ Precio actualizado a: $${Number(value).toLocaleString()}`;
          break;
        case 'stock':
          updateData.stock = Number(value);
          if (product.state === 'out_stock' && Number(value) > 0) {
            updateData.state = 'active';
            successMessage = `✅ Stock actualizado a: ${value} unidades y producto reactivado.`;
          } else {
            successMessage = `✅ Stock actualizado a: ${value} unidades`;
          }
          break;
        case 'state':
          if (value === 'out_stock') {
            updateData.state = 'out_stock';
            updateData.stock = 0;
            successMessage = '📦 Producto marcado como sin stock.';
          } else if (value === 'active') {
            updateData.state = 'active';
            successMessage = '✅ Producto publicado correctamente.';
          } else if (value === 'draft') {
            updateData.state = 'draft';
            successMessage = '📝 Producto guardado como borrador.';
          }
          break;
        case 'images':
          if (session.productData.images.length > 0) {
            updateData.images = session.productData.images;
            successMessage = `✅ Imágenes actualizadas (${session.productData.images.length} imagen(es)).`;
            session.productData.images = [];
          } else {
            await messageService.sendMessage(
              session.phone,
              '❌ Primero envía las nuevas imágenes y luego pídeme que las actualice.'
            );
            return;
          }
          break;
      }
      await prisma.products.update({
        where: { id: session.selectedProductId },
        data: updateData,
      });
      const updatedProduct = await prisma.products.findUnique({
        where: { id: session.selectedProductId },
        select: { id: true, title: true, price: true, stock: true, state: true },
      });
      if (updatedProduct && session.searchResults) {
        const idx = session.searchResults.findIndex(p => p.id === session.selectedProductId);
        if (idx !== -1) {
          session.searchResults[idx] = {
            id: updatedProduct.id,
            title: updatedProduct.title,
            price: Number(updatedProduct.price),
            stock: updatedProduct.stock,
            state: updatedProduct.state,
          };
        }
      }
      await messageService.sendMessage(
        session.phone, 
        `${successMessage}\n\n¿Deseas hacer algún otro cambio o terminamos?`
      );
    } catch (error) {
      console.error('Error actualizando producto:', error);
      await messageService.sendMessage(
        session.phone,
        '❌ Error al actualizar el producto. Intenta de nuevo.'
      );
    }
  }
  async deleteProduct(session: WhatsAppConversationSession): Promise<void> {
    if (!session.selectedProductId) {
      await messageService.sendMessage(
        session.phone,
        '❌ No hay producto seleccionado. Primero busca y selecciona un producto.'
      );
      return;
    }
    try {
      const product = await prisma.products.findUnique({
        where: { id: session.selectedProductId },
      });
      if (!product) {
        await messageService.sendMessage(session.phone, '❌ Producto no encontrado.');
        return;
      }
      await prisma.products.update({
        where: { id: session.selectedProductId },
        data: { state: 'deleted' },
      });
      await messageService.sendMessage(
        session.phone,
        `🗑️ Producto *${product.title}* eliminado correctamente.`
      );
      session.selectedProductId = undefined;
      session.searchResults = undefined;
      session.state = 'idle';
    } catch (error) {
      console.error('Error eliminando producto:', error);
      await messageService.sendMessage(
        session.phone,
        '❌ Error al eliminar el producto. Intenta de nuevo.'
      );
    }
  }
  async getAndSendProductInfo(phone: string, productId: string): Promise<void> {
    try {
      const product = await prisma.products.findUnique({
        where: { id: productId },
        include: { category: true },
      });
      if (!product) {
        await messageService.sendMessage(
          phone,
          `❌ No encontré ningún producto con el ID: ${productId}`
        );
        return;
      }
      const productLink = STORE_URL ? `${STORE_URL}/producto/${product.id}` : '';
      let message = `📦 *${product.title}*
💰 Precio: $${product.price.toLocaleString()}
📊 Stock: ${product.stock}
📁 Categoría: ${product.category?.title || 'Sin categoría'}
📅 Creado: ${product.created_at.toLocaleDateString('es-AR')}
🆔 ID: ${product.id}`;
      if (productLink) {
        message += `
🔗 Link: ${productLink}`;
      }
      await messageService.sendMessage(phone, message);
    } catch (error) {
      console.error('Error buscando producto:', error);
      await messageService.sendMessage(
        phone,
        '❌ Error al buscar el producto. Por favor intenta de nuevo.'
      );
    }
  }
  formatProductPreview(session: WhatsAppConversationSession): string {
    const { productData } = session;
    if (!productData.aiResult) {
      return '❌ No hay datos del producto para mostrar.';
    }
    return `📦 *PREVIEW DEL PRODUCTO*
📝 *Título:* ${productData.aiResult.title}
📋 *Descripción:*
${productData.aiResult.description}
💰 *Precio:* $${(productData.price || 0).toLocaleString()}
📊 *Stock:* ${productData.stock || 1} unidad(es)
📁 *Categoría:* ${productData.categoryName || 'Sin categoría'}
🖼️ *Imágenes:* ${productData.images.length}
━━━━━━━━━━━━━━━━━━━━━━━━━
¿Qué deseas hacer?
1️⃣ Publicar así
2️⃣ Cambiar algo (ej: "título: Nuevo título")
3️⃣ Cancelar`;
  }
  private formatPersistedPreview(productLink: string, product: { id: string; title: string; description: string; price: any; stock: number; state: string; categoryId: string | null; images: any }): string {
    return `📦 *PREVIEW PUBLICADA*
📝 *Título:* ${product.title}
📋 *Descripción:*
${product.description}
💰 *Precio:* $${Number(product.price).toLocaleString()}
📊 *Stock:* ${product.stock}
📁 *Estado:* ${product.state}
🖼️ *Imágenes:* ${Array.isArray(product.images) ? product.images.length : 0}
🔗 *URL:* ${productLink || '(sin URL configurada)'}
¿Necesitas hacer algo más con este producto? Puedo:
• Editar título, descripción, precio, stock, imágenes o estado
• Enviarlo a borrador, eliminarlo o regenerar descripción con IA
• Crear otro producto si me envías una imagen`;
  }
  private async storeImagesToBucket(imageUrls: string[]): Promise<string[]> {
    const results = await Promise.all(
      (imageUrls || []).map(async (url, idx) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`❌ No se pudo descargar la imagen (${response.status})`, url);
            return url; 
          }
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = response.headers.get('content-type') || 'image/jpeg';
          const ext = mimeType.split('/')[1] || 'jpg';
          const fileName = `product-${Date.now()}-${Math.round(Math.random() * 1e9)}-${idx}.${ext}`;
          const uploadResult = await uploadImage(buffer, fileName, 'products', mimeType);
          if (uploadResult.url) {
            return uploadResult.url;
          }
          console.error('❌ Upload fallido, usando URL original', url);
          return url;
        } catch (error) {
          console.error('❌ Error subiendo imagen externa:', error);
          return url; 
        }
      })
    );
    return results.filter((u) => !!u);
  }
}
export const productActions = new ProductActions();
export default productActions;
