/**
 * Formateador de mensajes para WhatsApp
 * Usa formato de WhatsApp: *bold*, _italic_, ~strikethrough~, ```monospace```
 * 
 * Este módulo centraliza todo el formateo de mensajes para mantener
 * consistencia en la comunicación con los usuarios.
 */

// ============================================================================
// TIPOS
// ============================================================================

interface ProductPreviewData {
  title: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  options?: { name: string; values: string[] }[];
  imageCount: number;
}

interface ProductCreatedData {
  id: string;
  title: string;
  price: number;
  stock: number;
  state?: string;
  link?: string;
}

interface CollectionStatusData {
  images: number;
  price?: number;
  stock?: number;
  category?: string;
  context?: string;
}

interface ProductListItem {
  id: string;
  title: string;
  price: number;
  stock: number;
  state: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const STATE_LABELS: Record<string, string> = {
  active: '✅ Activo',
  draft: '📝 Borrador',
  out_stock: '📦 Sin stock',
  deleted: '🗑️ Eliminado',
};

// ============================================================================
// FORMATEADOR
// ============================================================================

class MessageFormatter {
  /**
   * Formatear preview del producto antes de crear
   */
  formatProductPreview(data: ProductPreviewData): string {
    let message = `📦 *PREVIEW DEL PRODUCTO*\n\n`;
    
    message += `📝 *Título:* ${data.title}\n`;
    message += `💰 *Precio:* $${data.price.toLocaleString()}\n`;
    message += `📊 *Stock:* ${data.stock} unidades\n`;
    message += `📁 *Categoría:* ${data.category}\n`;
    message += `🖼️ *Imágenes:* ${data.imageCount}\n`;
    
    if (data.options && data.options.length > 0) {
      message += `\n*Opciones:*\n`;
      data.options.forEach(opt => {
        message += `  • ${opt.name}: ${opt.values.join(', ')}\n`;
      });
    }
    
    message += `\n📋 *Descripción:*\n`;
    message += this.truncateText(data.description, 500);
    
    message += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `¿Qué deseas hacer?\n\n`;
    message += `1️⃣ Publicar así\n`;
    message += `2️⃣ Modificar algo\n`;
    message += `3️⃣ Cancelar\n\n`;
    message += `_Escribe "1", "publicar" o envía los cambios que quieras hacer._`;
    
    return message;
  }

  /**
   * Formatear mensaje de éxito de creación
   */
  formatProductCreated(data: ProductCreatedData): string {
    const isDraft = data.state === 'draft';
    
    let message = isDraft 
      ? `✅ *¡Producto guardado como borrador!*\n\n`
      : `✅ *¡Producto creado exitosamente!*\n\n`;
    
    message += `📦 ${data.title}\n`;
    message += `💰 $${data.price.toLocaleString()}\n`;
    message += `📊 Stock: ${data.stock}\n`;
    message += `📋 Estado: ${isDraft ? 'Borrador' : 'Activo'}\n`;
    message += `🆔 ID: \`${data.id}\`\n`;
    
    if (data.link) {
      message += `🔗 Link: ${data.link}\n`;
    }
    
    message += `\n_Envía una imagen para crear otro producto._`;
    
    return message;
  }

  /**
   * Formatear mensaje de ayuda
   */
  formatHelpMessage(): string {
    return `¡Claro! 💡 Estas son las cosas que puedo hacer por ti:

📷 *Cargar producto nuevo*
   → Envíame una imagen con el precio y categoría

🔍 *Buscar productos*
   → Ej: "busca los delineadores" o "productos de Makeup"

📊 *Ver bajo stock*
   → "qué productos tienen poco stock?"

✏️ *Editar producto*
   → Busco el producto y puedes cambiar título, descripción, precio, stock, imágenes o estado

🗑️ *Eliminar producto*
   → "elimina [nombre del producto]"

📦 *Marcar sin stock*
   → "ya no tengo stock de [producto]"

¿En qué te puedo ayudar?`;
  }

  /**
   * Formatear lista de categorías
   */
  formatCategoryList(categories: { id: string; title: string }[]): string {
    let message = `📁 *Selecciona una categoría*\n\n`;
    
    categories.forEach((cat, index) => {
      message += `${index + 1}. ${cat.title}\n`;
    });
    
    message += `\n_Escribe el número de la categoría:_`;
    
    return message;
  }

  /**
   * Formatear lista de productos
   */
  formatProductList(products: ProductListItem[]): string {
    let list = '';
    
    products.forEach((p, i) => {
      list += `*${i + 1}.* ${p.title}\n`;
      list += `   💰 $${p.price.toLocaleString()} | 📊 Stock: ${p.stock}\n`;
      list += `   ${STATE_LABELS[p.state] || p.state}\n\n`;
    });
    
    list += `\n_Escribe el número del producto que deseas seleccionar._`;
    
    return list;
  }

  /**
   * Formatear producto seleccionado
   */
  formatProductSelected(product: ProductListItem, link?: string): string {
    let message = `✅ Seleccionaste: *${product.title}*\n\n`;
    message += `💰 Precio: $${product.price.toLocaleString()}\n`;
    message += `📊 Stock: ${product.stock}\n`;
    message += `📋 Estado: ${product.state}`;
    
    if (link) {
      message += `\n🔗 ${link}`;
    }
    
    message += `\n\n¿Qué deseas hacer?\n`;
    message += `• Cambiar precio, título, descripción o stock\n`;
    message += `• Regenerar descripción con IA\n`;
    message += `• Publicar (si es borrador)\n`;
    message += `• Marcar sin stock\n`;
    message += `• Eliminar`;
    
    return message;
  }

  /**
   * Formatear información de un producto
   */
  formatProductInfo(product: {
    id: string;
    title: string;
    price: number;
    stock: number;
    category?: string;
    createdAt?: Date;
    link?: string;
  }): string {
    let message = `📦 *${product.title}*\n\n`;
    message += `💰 Precio: $${product.price.toLocaleString()}\n`;
    message += `📊 Stock: ${product.stock}\n`;
    
    if (product.category) {
      message += `📁 Categoría: ${product.category}\n`;
    }
    
    if (product.createdAt) {
      message += `📅 Creado: ${product.createdAt.toLocaleDateString('es-AR')}\n`;
    }
    
    message += `🆔 ID: ${product.id}`;
    
    if (product.link) {
      message += `\n🔗 Link: ${product.link}`;
    }
    
    return message;
  }

  /**
   * Formatear error
   */
  formatError(error: string): string {
    return `❌ *Error*\n\n${error}`;
  }

  /**
   * Formatear confirmación
   */
  formatConfirmation(message: string): string {
    return `✅ ${message}`;
  }

  /**
   * Formatear advertencia
   */
  formatWarning(message: string): string {
    return `⚠️ ${message}`;
  }

  /**
   * Formatear mensaje de bienvenida
   */
  formatWelcomeMessage(businessName: string, emojis: string): string {
    return `¡Hola! 👋 Soy Cleria, tu asistente para gestionar productos en *${businessName}* ${emojis}

¿Qué puedo hacer por ti?
📷 Cargar un producto nuevo (envía una imagen)
🔍 Buscar productos
📊 Ver productos con bajo stock
✏️ Editar un producto
🗑️ Eliminar un producto

💡 Escribe "ayuda" en cualquier momento para ver todas las opciones.`;
  }

  /**
   * Formatear mensaje de no autorizado
   */
  formatUnauthorizedMessage(businessName: string): string {
    return `Hola, soy Cleria el asistente de *${businessName}* 🤖

Lamentablemente no puedo atender tu solicitud porque no estás en la lista de remitentes permitidos.

Si formas parte de *${businessName}*, contacta a un administrador para que te agregue a la lista.`;
  }

  /**
   * Formatear mensaje de estado de datos recolectados
   */
  formatCollectionStatus(data: CollectionStatusData): string {
    let message = `📝 *Estado actual*\n\n`;
    
    message += `📷 Imágenes: ${data.images}\n`;
    message += `💰 Precio: ${data.price ? `$${data.price.toLocaleString()}` : '_pendiente_'}\n`;
    message += `📊 Stock: ${data.stock || '_pendiente (default: 1)_'}\n`;
    message += `📁 Categoría: ${data.category || '_pendiente_'}\n`;
    
    if (data.context) {
      message += `\n📄 Contexto: ${this.truncateText(data.context, 100)}`;
    }
    
    return message;
  }

  /**
   * Formatear mensaje de bajo stock
   */
  formatLowStockHeader(): string {
    return `📊 *Productos con bajo stock (< 3 unidades):*\n\n`;
  }

  /**
   * Formatear mensaje de recordatorio por inactividad
   */
  formatInactivityReminder(): string {
    return `👋 ¿Sigues ahí? Noté que no has respondido. ¿Necesitas ayuda con algo?

Si no respondes en 30 segundos, cerraré esta conversación para liberar recursos. Puedes iniciar una nueva cuando quieras enviándome una imagen. 📷`;
  }

  /**
   * Formatear mensaje de cierre por inactividad
   */
  formatSessionClosed(): string {
    return `👋 He cerrado esta conversación por inactividad.

Cuando quieras cargar un producto, solo envíame una imagen y empezamos de nuevo. ¡Hasta pronto! 📦`;
  }

  /**
   * Truncar texto largo
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }
}

export const messageFormatter = new MessageFormatter();
export default messageFormatter;
