/**
 * Worker de verificación de timeouts de sesiones
 * Envía recordatorios y cierra sesiones inactivas
 */

import { sessionManager } from './session.manager';
import { messageService } from '../message.service';
import {
  TIMEOUT_FIRST_WARNING,
  TIMEOUT_CLOSE_SESSION,
  TIMEOUT_WORKER_INTERVAL,
} from '../../constants/timeouts';

// ============================================================================
// MENSAJES
// ============================================================================

const REMINDER_MESSAGE = 
  '👋 ¿Sigues ahí? Noté que no has respondido. ¿Necesitas ayuda con algo?\n\n' +
  'Si no respondes en 30 segundos, cerraré esta conversación para liberar recursos. ' +
  'Puedes iniciar una nueva cuando quieras enviándome una imagen. 📷';

const CLOSE_SESSION_MESSAGE = 
  '👋 He cerrado esta conversación por inactividad.\n\n' +
  'Cuando quieras cargar un producto, solo envíame una imagen y empezamos de nuevo. ¡Hasta pronto! 📦';

// ============================================================================
// WORKER
// ============================================================================

class TimeoutWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Inicia el worker de verificación de timeouts
   */
  start(): void {
    if (this.isRunning) {
      console.log('⏰ Worker de timeout ya está corriendo');
      return;
    }

    console.log('⏰ Worker de timeout de sesiones iniciado');
    this.isRunning = true;
    
    this.intervalId = setInterval(async () => {
      await this.checkAllSessionTimeouts();
    }, TIMEOUT_WORKER_INTERVAL);
  }

  /**
   * Detiene el worker
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏰ Worker de timeout detenido');
  }

  /**
   * Verifica timeouts de todas las sesiones activas
   */
  async checkAllSessionTimeouts(): Promise<void> {
    try {
      const phones = await sessionManager.getActiveSessionPhones();
      
      for (const phone of phones) {
        await this.checkSingleSessionTimeout(phone);
      }
    } catch (error) {
      console.error('Error verificando timeouts de sesiones:', error);
    }
  }

  /**
   * Verifica timeout de una sesión específica
   */
  private async checkSingleSessionTimeout(phone: string): Promise<void> {
    try {
      const session = await sessionManager.getSession(phone);
      if (!session) return;

      // Solo verificar si la sesión tiene actividad
      if (session.state === 'idle' && session.productData.images.length === 0) {
        return;
      }

      const lastMsgTime = await sessionManager.getLastUserMessageTime(phone);
      if (!lastMsgTime) return;

      const now = Date.now();
      const elapsedSeconds = (now - lastMsgTime) / 1000;
      const reminderSent = await sessionManager.wasReminderSent(phone);

      if (!reminderSent && elapsedSeconds >= TIMEOUT_FIRST_WARNING) {
        await this.sendReminder(phone, elapsedSeconds);
      } else if (reminderSent) {
        await this.checkCloseSession(phone, now);
      }
    } catch (error) {
      console.error(`Error verificando timeout para ${phone}:`, error);
    }
  }

  /**
   * Envía recordatorio al usuario
   */
  private async sendReminder(phone: string, elapsedSeconds: number): Promise<void> {
    console.log(`⏰ Enviando recordatorio a ${phone} (${Math.round(elapsedSeconds)}s sin respuesta)`);
    
    try {
      await messageService.sendMessage(phone, REMINDER_MESSAGE);
      await sessionManager.markReminderSent(phone, TIMEOUT_CLOSE_SESSION + 10);
    } catch (error) {
      console.error(`Error enviando recordatorio a ${phone}:`, error);
    }
  }

  /**
   * Verifica si debe cerrar la sesión después del recordatorio
   */
  private async checkCloseSession(phone: string, now: number): Promise<void> {
    const reminderTime = await sessionManager.getReminderSentTime(phone);
    
    if (reminderTime) {
      const reminderElapsed = (now - reminderTime) / 1000;
      
      if (reminderElapsed >= TIMEOUT_CLOSE_SESSION) {
        await this.closeSession(phone);
      }
    }
  }

  /**
   * Cierra una sesión por inactividad
   */
  private async closeSession(phone: string): Promise<void> {
    console.log(`⏰ Cerrando sesión de ${phone} por inactividad`);
    
    try {
      await messageService.sendMessage(phone, CLOSE_SESSION_MESSAGE);
      await sessionManager.deleteSession(phone);
    } catch (error) {
      console.error(`Error cerrando sesión de ${phone}:`, error);
    }
  }
}

export const timeoutWorker = new TimeoutWorker();
export default timeoutWorker;

