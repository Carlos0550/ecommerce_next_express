/**
 * Formateador de mensajes para WhatsApp
 * Usa formato de WhatsApp: *bold*, _italic_, ~strikethrough~, ```monospace```
 */

interface ProductPreviewData {
  title: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  options?: { name: string; values: string[] }[];
  imageCount: number;
}

class MessageFormatter {
  /**
   * Formatear preview del producto
   */
  formatProductPreview(data: ProductPreviewData): string {
    let message = `📦 *PREVIEW DEL PRODUCTO*\n\n`;
    
    message += `*Título:* ${data.title}\n`;
    message += `*Precio:* $${data.price.toLocaleString()}\n`;
    message += `*Stock:* ${data.stock} unidades\n`;
    message += `*Categoría:* ${data.category}\n`;
    message += `*Imágenes:* ${data.imageCount}\n`;
    
    if (data.options && data.options.length > 0) {
      message += `\n*Opciones:*\n`;
      data.options.forEach(opt => {
        message += `  • ${opt.name}: ${opt.values.join(', ')}\n`;
      });
    }
    
    message += `\n*Descripción:*\n`;
    message += this.truncateDescription(data.description, 500);
    
    message += `\n\n─────────────────\n`;
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
  formatProductCreated(product: {
    id: string;
    title: string;
    price: number;
    stock: number;
  }): string {
    return (
      `✅ *¡Producto creado exitosamente!*\n\n` +
      `📦 ${product.title}\n` +
      `💰 $${product.price.toLocaleString()}\n` +
      `📊 Stock: ${product.stock}\n\n` +
      `ID: \`${product.id}\`\n\n` +
      `_Envía una imagen para crear otro producto._`
    );
  }

  /**
   * Formatear mensaje de ayuda
   */
  formatHelpMessage(): string {
    return (
      `📚 *COMANDOS DISPONIBLES*\n\n` +
      `📷 *Enviar imagen* - Inicia la carga de un producto\n` +
      `✏️ *nuevo producto* - Inicia el proceso de carga\n` +
      `❌ *cancelar* - Cancela la operación actual\n` +
      `❓ *ayuda* - Muestra este mensaje\n\n` +
      `─────────────────\n\n` +
      `*DURANTE LA CARGA:*\n\n` +
      `Puedes enviar los datos en cualquier orden:\n` +
      `• \`precio 15990\` o \`$15990\`\n` +
      `• \`stock 10\`\n` +
      `• \`categoría Ropa\` o nombre de la categoría\n` +
      `• Cualquier texto adicional como contexto\n\n` +
      `Escribe \`listo\` cuando termines.\n\n` +
      `─────────────────\n\n` +
      `*EN EL PREVIEW:*\n\n` +
      `• \`1\` o \`publicar\` - Crea el producto\n` +
      `• \`título: Nuevo título\` - Cambia el título\n` +
      `• \`precio: 20000\` - Cambia el precio\n` +
      `• Envía un texto largo para reemplazar la descripción\n` +
      `• \`cancelar\` - Cancela todo`
    );
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
  formatWelcomeMessage(): string {
    return (
      `👋 *¡Hola! Soy tu asistente de carga de productos.*\n\n` +
      `Puedo ayudarte a crear productos rápidamente usando IA.\n\n` +
      `📷 Envíame una imagen para comenzar\n` +
      `❓ Escribe *ayuda* para ver los comandos\n\n` +
      `_Tu número está autorizado para usar este servicio._`
    );
  }

  /**
   * Formatear mensaje de no autorizado
   */
  formatUnauthorizedMessage(): string {
    return (
      `❌ *Número no autorizado*\n\n` +
      `Tu número de teléfono no está registrado para usar este servicio.\n\n` +
      `Contacta al administrador para que vincule tu número.`
    );
  }

  /**
   * Truncar descripción larga
   */
  private truncateDescription(description: string, maxLength: number): string {
    if (description.length <= maxLength) {
      return description;
    }
    
    return description.substring(0, maxLength - 3) + '...';
  }

  /**
   * Formatear mensaje de estado de datos recolectados
   */
  formatCollectionStatus(data: {
    images: number;
    price?: number;
    stock?: number;
    category?: string;
    context?: string;
  }): string {
    let message = `📝 *Estado actual*\n\n`;
    
    message += `📷 Imágenes: ${data.images}\n`;
    message += `💰 Precio: ${data.price ? `$${data.price.toLocaleString()}` : '_pendiente_'}\n`;
    message += `📊 Stock: ${data.stock || '_pendiente (default: 1)_'}\n`;
    message += `📁 Categoría: ${data.category || '_pendiente_'}\n`;
    
    if (data.context) {
      message += `\n📄 Contexto: ${this.truncateDescription(data.context, 100)}`;
    }
    
    return message;
  }
}

export const messageFormatter = new MessageFormatter();
export default messageFormatter;

