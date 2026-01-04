/**
 * Acciones de búsqueda para el flujo conversacional
 * Maneja búsqueda de productos, listado de bajo stock y selección
 */

import { prisma } from '@/config/prisma';
import { messageService } from '../../message.service';
import { WhatsAppConversationSession } from '../../../schemas/whatsapp.schemas';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const STORE_URL = process.env.STORE_URL || '';

// ============================================================================
// CONSTANTES DE FORMATO
// ============================================================================

const STATE_LABELS: Record<string, string> = {
  active: '✅ Activo',
  draft: '📝 Borrador',
  out_stock: '📦 Sin stock',
  deleted: '🗑️ Eliminado',
};

// ============================================================================
// ACCIONES
// ============================================================================

class SearchActions {
  /**
   * Busca productos por nombre o categoría
   * Retorna true si la búsqueda se ejecutó (aunque no haya resultados)
   * Retorna false si no se pudo ejecutar (query vacío)
   */
  async searchProducts(
    session: WhatsAppConversationSession,
    query: string,
    searchBy: 'name' | 'category'
  ): Promise<boolean> {
    // Validar que el query no esté vacío
    if (!query || query.trim().length === 0) {
      console.log('⚠️ Query de búsqueda vacío, no se ejecuta búsqueda');
      return false; // No se ejecutó la búsqueda
    }

    try {
      let products;
      
      if (searchBy === 'category') {
        products = await this.searchByCategory(session, query);
      } else {
        products = await this.searchByName(query);
      }
      
      if (!products || products.length === 0) {
        await messageService.sendMessage(
          session.phone,
          `🔍 No encontré productos ${searchBy === 'category' ? `en la categoría "${query}"` : `que coincidan con "${query}"`}.`
        );
        session.state = 'idle';
        return true; // Se ejecutó pero sin resultados
      }
      
      session.searchResults = products.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        stock: p.stock,
        state: p.state,
      }));
      
      // Si hay solo 1 resultado O hay coincidencia exacta por título, seleccionar automáticamente
      const normalizedQuery = query.toLowerCase().trim();
      const exactMatch = products.find(p => p.title.toLowerCase().trim() === normalizedQuery);
      
      if (products.length === 1 || exactMatch) {
        const productToSelect = exactMatch || products[0];
        session.selectedProductId = productToSelect.id;
        session.state = 'editing';
        
        console.log(`✅ Producto seleccionado automáticamente: ${productToSelect.title} (coincidencia ${exactMatch ? 'exacta' : 'única'})`);
        
        // Si hay una acción pendiente, ejecutarla inmediatamente
        if (session.pendingAction) {
          await this.executePendingAction(session);
        } else {
          // Mostrar info del producto seleccionado
          const productLink = STORE_URL ? `${STORE_URL}/producto/${productToSelect.id}` : '';
          let message = `✅ Encontré: *${productToSelect.title}*\n\n`;
          message += `💰 Precio: $${Number(productToSelect.price).toLocaleString()}\n`;
          message += `📊 Stock: ${productToSelect.stock}\n`;
          message += `📋 Estado: ${productToSelect.state}\n`;
          if (productLink) {
            message += `🔗 ${productLink}\n`;
          }
          message += `\n¿Qué deseas hacer con este producto?`;
          
          await messageService.sendMessage(session.phone, message);
        }
        return true;
      }
      
      // Si hay múltiples resultados sin coincidencia exacta, mostrar lista
      const productList = this.formatProductList(session.searchResults);
      await messageService.sendMessage(session.phone, productList);
      session.state = 'selecting';
      return true; // Búsqueda exitosa
      
    } catch (error) {
      console.error('Error buscando productos:', error);
      await messageService.sendMessage(
        session.phone,
        '❌ Error al buscar productos. Intenta de nuevo.'
      );
      return true; // Se intentó ejecutar (aunque falló)
    }
  }

  /**
   * Ejecuta la acción pendiente después de seleccionar un producto
   */
  private async executePendingAction(session: WhatsAppConversationSession): Promise<void> {
    if (!session.pendingAction || !session.selectedProductId) return;
    
    const { action, data } = session.pendingAction;
    const product = session.searchResults?.find(p => p.id === session.selectedProductId);
    
    if (action === 'update_product' && data) {
      if (data.regenerate_with_ai && data.update_field === 'description') {
        // Importamos productActions aquí para evitar dependencia circular
        const { productActions } = await import('./product.actions');
        await messageService.sendMessage(
          session.phone,
          `✅ Encontré: *${product?.title}*\n\n🤖 Regenerando descripción con IA...`
        );
        await productActions.updateProduct(session, 'description', undefined, true);
      } else if (data.update_field) {
        const { productActions } = await import('./product.actions');
        await productActions.updateProduct(session, data.update_field, data.update_value, data.regenerate_with_ai);
      }
    } else if (action === 'delete_product') {
      const { productActions } = await import('./product.actions');
      await productActions.deleteProduct(session);
    }
    
    // Limpiar la acción pendiente
    session.pendingAction = undefined;
  }

  /**
   * Lista todos los productos del inventario (activos y borradores)
   */
  async listAllProducts(session: WhatsAppConversationSession): Promise<void> {
    try {
      const products = await prisma.products.findMany({
        where: { 
          state: { notIn: ['deleted'] },
        },
        take: 15,
        orderBy: { created_at: 'desc' },
        include: { category: true },
      });
      
      if (products.length === 0) {
        await messageService.sendMessage(
          session.phone,
          '📦 No tienes productos registrados aún. ¡Envía una imagen para crear el primero!'
        );
        session.state = 'idle';
        return;
      }
      
      session.searchResults = products.map(p => ({
        id: p.id,
        title: p.title,
        price: Number(p.price),
        stock: p.stock,
        state: p.state,
      }));
      
      // Contar totales por estado
      const totalActive = products.filter(p => p.state === 'active').length;
      const totalDraft = products.filter(p => p.state === 'draft').length;
      const totalOutStock = products.filter(p => p.state === 'out_stock').length;
      
      let message = `📦 *Actualmente tienes los siguientes productos en tu inventario:*\n\n`;
      
      products.forEach((p, i) => {
        const link = STORE_URL ? `${STORE_URL}/producto/${p.id}` : '';
        message += `*${i + 1}.* ${p.title}\n`;
        message += `   - Precio: $${Number(p.price).toLocaleString()}\n`;
        message += `   - Stock: ${p.stock} unidades\n`;
        message += `   - Estado: ${p.state}\n`;
        message += `   - Categoría: ${p.category?.title || 'Sin categoría'}\n`;
        if (link) {
          message += `   - Enlace: ${link}\n`;
        }
        message += '\n';
      });
      
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📊 *Resumen:* ${products.length} producto(s)\n`;
      message += `✅ Activos: ${totalActive} | 📝 Borradores: ${totalDraft} | 📦 Sin stock: ${totalOutStock}\n\n`;
      message += `¿Hay algo más en lo que pueda ayudarte?`;
      
      await messageService.sendMessage(session.phone, message);
      session.state = 'selecting';
      
    } catch (error) {
      console.error('Error listando todos los productos:', error);
      await messageService.sendMessage(
        session.phone,
        '❌ Error al obtener el inventario. Intenta de nuevo.'
      );
    }
  }

  /**
   * Lista productos con bajo stock
   */
  async listLowStockProducts(session: WhatsAppConversationSession): Promise<void> {
    try {
      const products = await prisma.products.findMany({
        where: { 
          stock: { gt: 0, lt: 3 },
          state: { notIn: ['deleted', 'out_stock'] },
        },
        take: 10,
        orderBy: { stock: 'asc' },
        include: { category: true },
      });
      
      if (products.length === 0) {
        await messageService.sendMessage(
          session.phone,
          '✅ ¡Excelente! No tienes productos con bajo stock (menos de 3 unidades).'
        );
        session.state = 'idle';
        return;
      }
      
      session.searchResults = products.map(p => ({
        id: p.id,
        title: p.title,
        price: Number(p.price),
        stock: p.stock,
        state: p.state,
      }));
      
      let message = `📊 *Productos con bajo stock (< 3 unidades):*\n\n`;
      message += this.formatProductList(session.searchResults);
      await messageService.sendMessage(session.phone, message);
      session.state = 'selecting';
      
    } catch (error) {
      console.error('Error listando productos con bajo stock:', error);
      await messageService.sendMessage(
        session.phone,
        '❌ Error al buscar productos. Intenta de nuevo.'
      );
    }
  }

  /**
   * Selecciona un producto de la lista de resultados
   */
  async selectProduct(
    session: WhatsAppConversationSession,
    index: number
  ): Promise<void> {
    if (!session.searchResults || session.searchResults.length === 0) {
      await messageService.sendMessage(
        session.phone,
        '❌ No hay productos para seleccionar. Primero busca un producto.'
      );
      return;
    }
    
    if (index < 1 || index > session.searchResults.length) {
      await messageService.sendMessage(
        session.phone,
        `❌ Número inválido. Elige un número del 1 al ${session.searchResults.length}.`
      );
      return;
    }
    
    const selected = session.searchResults[index - 1];
    session.selectedProductId = selected.id;
    session.state = 'editing';
    
    // Si hay una acción pendiente, ejecutarla
    if (session.pendingAction) {
      await this.executePendingAction(session);
      return;
    }
    
    const link = STORE_URL ? `\n🔗 ${STORE_URL}/producto/${selected.id}` : '';
    
    await messageService.sendMessage(
      session.phone,
      `✅ Seleccionaste: *${selected.title}*\n\n` +
      `💰 Precio: $${selected.price.toLocaleString()}\n` +
      `📊 Stock: ${selected.stock}\n` +
      `📋 Estado: ${selected.state}${link}\n\n` +
      `¿Qué deseas hacer?\n` +
      `• Cambiar precio, título, descripción o stock\n` +
      `• Regenerar descripción con IA\n` +
      `• Publicar (si es borrador)\n` +
      `• Marcar sin stock\n` +
      `• Eliminar`
    );
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Busca productos por categoría
   */
  private async searchByCategory(
    session: WhatsAppConversationSession,
    query: string
  ): Promise<any[] | null> {
    const category = await prisma.categories.findFirst({
      where: { 
        title: { contains: query, mode: 'insensitive' },
        status: 'active',
      },
    });
    
    if (!category) {
      await messageService.sendMessage(
        session.phone,
        `❌ No encontré la categoría "${query}". Revisa el nombre e intenta de nuevo.`
      );
      session.state = 'idle';
      return null;
    }
    
    return prisma.products.findMany({
      where: { 
        categoryId: category.id,
        state: { notIn: ['deleted'] },
      },
      take: 10,
      orderBy: { created_at: 'desc' },
      include: { category: true },
    });
  }

  /**
   * Busca productos por nombre
   */
  private async searchByName(query: string): Promise<any[]> {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 5);
    
    if (words.length === 0) {
      return prisma.products.findMany({
        where: { 
          title: { contains: query, mode: 'insensitive' },
          state: { notIn: ['deleted'] },
        },
        take: 10,
        orderBy: { created_at: 'desc' },
        include: { category: true },
      });
    }
    
    const products = await prisma.products.findMany({
      where: { 
        AND: [
          { state: { notIn: ['deleted'] } },
          { OR: words.map(word => ({ title: { contains: word, mode: 'insensitive' as const } })) },
        ],
      },
      take: 15,
      orderBy: { created_at: 'desc' },
      include: { category: true },
    });
    
    // Ordenar por relevancia
    const matchScores = products.map(p => {
      const titleLower = p.title.toLowerCase();
      const matches = words.filter(w => titleLower.includes(w)).length;
      return { product: p, score: matches };
    });
    
    matchScores.sort((a, b) => b.score - a.score);
    return matchScores.slice(0, 10).map(m => m.product);
  }

  /**
   * Formatea la lista de productos para enviar
   */
  private formatProductList(
    products: NonNullable<WhatsAppConversationSession['searchResults']>
  ): string {
    let list = '';
    products.forEach((p, i) => {
      list += `*${i + 1}.* ${p.title}\n`;
      list += `   💰 $${p.price.toLocaleString()} | 📊 Stock: ${p.stock}\n`;
      list += `   ${STATE_LABELS[p.state] || p.state}\n\n`;
    });
    
    list += `\n_Escribe el número del producto que deseas seleccionar._`;
    return list;
  }
}

export const searchActions = new SearchActions();
export default searchActions;

