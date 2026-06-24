export type EventHandler<T = unknown> = (payload: T) => Promise<void>;

const registry = new Map<string, EventHandler[]>();

/** Registers an in-process event handler. Used until the BullMQ outbox relay ships. */
export function registerEventHandler<T>(eventType: string, handler: EventHandler<T>): void {
  const handlers = registry.get(eventType) ?? [];
  handlers.push(handler as EventHandler);
  registry.set(eventType, handlers);
}

/** Dispatches an event to all registered handlers for that type. */
export async function dispatchEvent(eventType: string, payload: unknown): Promise<void> {
  const handlers = registry.get(eventType) ?? [];
  for (const handler of handlers) {
    await handler(payload);
  }
}

/** Returns registered event types — useful for worker wiring and diagnostics. */
export function listRegisteredEventTypes(): string[] {
  return [...registry.keys()];
}
