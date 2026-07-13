import { AsyncLocalStorage } from "node:async_hooks";

export interface LogContext {
  requestId?: string;
  userId?: string | number;
  route?: string;
  method?: string;
}

const storage = new AsyncLocalStorage<LogContext>();

export const loggerStorage = {
  run<T>(ctx: LogContext, fn: () => T): T {
    const prev = storage.getStore();
    const merged: LogContext = { ...(prev ?? {}), ...ctx };
    return storage.run(merged, fn);
  },
  get(): LogContext | undefined {
    return storage.getStore();
  },
  set(patch: Partial<LogContext>): void {
    const store = storage.getStore();
    if (store) Object.assign(store, patch);
  },
};

export type { LogContext as LoggerContext };