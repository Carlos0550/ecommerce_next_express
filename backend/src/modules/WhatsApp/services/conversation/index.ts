/**
 * Exportación centralizada del módulo de conversación
 */

export { sessionManager } from './session.manager';
export { timeoutWorker } from './timeout.worker';
export { aiProcessor } from './ai.processor';
export { actionExecutor } from './action.executor';
export { conversationProcessor } from './conversation.processor';
export { buildSystemPrompt, buildStateContext } from './prompt.builder';
export * from './tone.detector';
export * from './actions';

