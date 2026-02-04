import { prisma } from '@/config/prisma';
import { sessionManager } from './session.manager';
import { productActions } from './actions/product.actions';
import { searchActions } from './actions/search.actions';
import { messageService } from '../message.service';
import {
  WhatsAppConversationSession,
  AIConversationResponse,
} from '../../schemas/whatsapp.schemas';
type ActionData = AIConversationResponse['data'];
class ActionExecutor {
  async execute(
    session: WhatsAppConversationSession,
    aiResponse: AIConversationResponse
  ): Promise<boolean> {
    const { action, data } = aiResponse;
    switch (action) {
      case 'save_data':
        await this.handleSaveData(session, data);
        return false; 
      case 'process_ai':
        await this.handleProcessAI(session, data);
        return true; 
      case 'create_product':
        await this.handleCreateProduct(session, data);
        return true; 
      case 'cancel':
      case 'reset':
        await sessionManager.deleteSession(session.phone);
        return false;
      case 'get_product':
        if (data.product_id) {
          await productActions.getAndSendProductInfo(session.phone, data.product_id);
          return true;
        }
        return false;
      case 'search_products':
        if (data.search_by) {
          if (data.pending_action) {
            session.pendingAction = {
              action: data.pending_action.action,
              data: {
                update_field: data.pending_action.update_field,
                update_value: data.pending_action.update_value,
                regenerate_with_ai: data.pending_action.regenerate_with_ai,
              },
            };
            console.log(`📌 Acción pendiente guardada: ${data.pending_action.action} - ${data.pending_action.update_field || 'delete'}`);
          }
          const executed = await searchActions.searchProducts(
            session, 
            data.search_query || '', 
            data.search_by
          );
          return executed; 
        }
        return false;
      case 'list_all_products':
        await searchActions.listAllProducts(session);
        return true;
      case 'list_low_stock':
        await searchActions.listLowStockProducts(session);
        return true;
      case 'select_product':
        if (data.selected_index) {
          await searchActions.selectProduct(session, data.selected_index);
          return true;
        }
        return false;
      case 'update_product':
        await this.handleUpdateProduct(session, data);
        return true;
      case 'delete_product':
        await productActions.deleteProduct(session);
        return true;
      case 'end_conversation':
        await sessionManager.deleteSession(session.phone);
        return false; 
      case 'show_help':
      case 'none':
      default:
        return false;
    }
  }
  async saveDataToSession(
    session: WhatsAppConversationSession,
    data: ActionData
  ): Promise<void> {
    if (data.price !== undefined && data.price !== null) {
      session.productData.price = data.price;
    }
    if (data.stock !== undefined && data.stock !== null) {
      session.productData.stock = data.stock;
    }
    if (data.category_id) {
      session.productData.categoryId = data.category_id;
    }
    const categoryNameFromAI = data.category_name || data.category;
    if (categoryNameFromAI) {
      session.productData.categoryName = categoryNameFromAI;
      const { id: ensuredCategoryId, created } = await this.ensureCategoryExists(categoryNameFromAI);
      session.productData.categoryId = ensuredCategoryId;
      if (created) {
        await messageService.sendMessage(
          session.phone,
          `🆕 Creé la categoría "${categoryNameFromAI.trim()}" y la dejaré activa para este producto.`
        );
      }
    }
    if (data.additional_context) {
      session.productData.additionalContext = 
        (session.productData.additionalContext || '') + ' ' + data.additional_context;
    }
    if (data.draft !== undefined) {
      session.productData.draft = data.draft;
    }
    session.lastError = undefined;
  }
  private async handleSaveData(
    session: WhatsAppConversationSession,
    data: ActionData
  ): Promise<void> {
    await this.saveDataToSession(session, data);
  }
  private async handleProcessAI(
    session: WhatsAppConversationSession,
    data: ActionData
  ): Promise<void> {
    await this.saveDataToSession(session, data);
    const availableCategories = await prisma.categories.findMany({
      where: { status: 'active' },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    });
    await productActions.processWithAI(session, availableCategories);
    if (session.lastError) {
      return;
    }
    const aiResult = session.productData.aiResult;
    const suggestedCategory = aiResult?.suggestedCategory;
    if (session.productData.categoryId) {
      await productActions.createProduct(session);
      return;
    }
    if (suggestedCategory && (suggestedCategory.confidence === 'high' || suggestedCategory.confidence === 'medium')) {
      const matchedCategory = availableCategories.find(
        c => c.title.toLowerCase() === suggestedCategory.name.toLowerCase()
      );
      if (matchedCategory) {
        session.productData.categoryId = matchedCategory.id;
        session.productData.categoryName = matchedCategory.title;
        console.log(`✅ Categoría asignada automáticamente: ${matchedCategory.title} (confianza: ${suggestedCategory.confidence})`);
        await productActions.createProduct(session);
        return;
      }
    }
    if (availableCategories.length > 0) {
      const list = availableCategories.map((c, i) => `${i + 1}. ${c.title}`).join('\n');
      const priceStr = session.productData.price ? `$${Number(session.productData.price).toLocaleString()}` : '';
      const uncertaintyMessage = suggestedCategory 
        ? `No estoy seguro/a de la categoría (podría ser "${suggestedCategory.name}").`
        : `No pude identificar la categoría automáticamente.`;
      const message = `📷 Ya tengo la imagen${priceStr ? ` y el precio (${priceStr})` : ''}. ${uncertaintyMessage}\n\n📂 *Categorías disponibles:*\n${list}\n\n¿En cuál lo dejamos? Puedes escribir el número o el nombre.`;
      await messageService.sendMessage(session.phone, message);
      session.messageHistory.push({
        role: 'assistant',
        content: message,
        timestamp: new Date(),
      });
      session.categoryPromptShown = true;
      await sessionManager.saveSession(session);
    } else {
      await messageService.sendMessage(
        session.phone,
        '⚠️ No hay categorías configuradas en el sistema. Por favor, crea una categoría desde el panel administrativo antes de continuar.'
      );
    }
  }
  private async handleCreateProduct(
    session: WhatsAppConversationSession,
    data: ActionData
  ): Promise<void> {
    await this.saveDataToSession(session, data);
    await productActions.createProduct(session);
  }
  private async handleUpdateProduct(
    session: WhatsAppConversationSession,
    data: ActionData
  ): Promise<void> {
    console.log(`🔍 handleUpdateProduct - Estado actual:`, {
      selectedProductId: session.selectedProductId,
      searchResultsCount: session.searchResults?.length || 0,
      pendingAction: session.pendingAction,
      dataSelectedIndex: data.selected_index,
      dataProductName: data.product_name,
    });
    if (data.selected_index && session.searchResults && session.searchResults.length > 0) {
      const index = data.selected_index;
      if (index >= 1 && index <= session.searchResults.length) {
        const selected = session.searchResults[index - 1];
        session.selectedProductId = selected.id;
        session.state = 'editing';
        console.log(`✅ Producto seleccionado desde update_product: ${selected.title} (índice ${index})`);
        await sessionManager.saveSession(session);
      } else {
        console.log(`⚠️ Índice ${index} fuera de rango (1-${session.searchResults.length})`);
      }
    } else if (data.selected_index) {
      console.log(`⚠️ selected_index=${data.selected_index} pero searchResults está vacío o no existe`);
    }
    if (!session.selectedProductId && data.product_name) {
      const selected = await this.trySelectProductByName(session, data.product_name);
      if (!selected) {
        return; 
      }
    }
    if (data.updates && data.updates.length > 0) {
      for (const update of data.updates) {
        await productActions.updateProduct(
          session,
          update.field,
          update.value,
          update.regenerate_with_ai,
          data.user_context 
        );
      }
    } else if (data.update_field) {
      await productActions.updateProduct(
        session, 
        data.update_field, 
        data.update_value, 
        data.regenerate_with_ai,
        data.user_context 
      );
    }
  }
  private async trySelectProductByName(
    session: WhatsAppConversationSession,
    productName: string
  ): Promise<boolean> {
    const normalizedName = productName.toLowerCase().trim();
    if (session.searchResults && session.searchResults.length > 0) {
      const match = session.searchResults.find(p => 
        p.title.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(p.title.toLowerCase())
      );
      if (match) {
        session.selectedProductId = match.id;
        console.log(`✅ Producto seleccionado automáticamente de la lista: ${match.title} (ID: ${match.id})`);
        return true;
      }
    }
    const products = await prisma.products.findMany({
      where: {
        title: { contains: productName, mode: 'insensitive' },
        state: { not: 'deleted' }
      },
      take: 5
    });
    if (products.length === 0) {
      await messageService.sendMessage(
        session.phone,
        `🔍 No encontré ningún producto que coincida con "${productName}". ¿Podrías verificar el nombre o buscarlo primero?`
      );
      return false;
    }
    if (products.length === 1) {
      session.selectedProductId = products[0].id;
      session.searchResults = [{
        id: products[0].id,
        title: products[0].title,
        price: Number(products[0].price),
        stock: products[0].stock,
        state: products[0].state,
      }];
      console.log(`✅ Producto encontrado y seleccionado: ${products[0].title} (ID: ${products[0].id})`);
      return true;
    }
    session.searchResults = products.map(p => ({
      id: p.id,
      title: p.title,
      price: Number(p.price),
      stock: p.stock,
      state: p.state,
    }));
    session.state = 'selecting';
    let message = `🔍 Encontré varios productos que coinciden con "${productName}":\n\n`;
    products.forEach((p, i) => {
      message += `*${i + 1}.* ${p.title}\n   💰 $${Number(p.price).toLocaleString()} | 📊 Stock: ${p.stock}\n\n`;
    });
    message += `_Escribe el número del producto que deseas editar._`;
    await messageService.sendMessage(session.phone, message);
    await sessionManager.saveSession(session);
    return false;
  }
  private async ensureCategoryExists(categoryName: string): Promise<{ id: string; created: boolean }> {
    const normalized = categoryName.trim().toLowerCase();
    const existing = await prisma.categories.findFirst({
      where: { 
        title: { equals: normalized, mode: 'insensitive' },
        status: 'active',
      },
    });
    if (existing) {
      return { id: existing.id, created: false };
    }
    const createdCategory = await prisma.categories.create({
      data: {
        title: normalized,
        status: 'active',
        is_active: true,
      },
    });
    return { id: createdCategory.id, created: true };
  }
}
export const actionExecutor = new ActionExecutor();
export default actionExecutor;
