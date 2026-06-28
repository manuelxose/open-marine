import type { EventListener, InternalEvent, InternalEventKind } from "./types.js";

export class EventBus {
  private readonly listeners = new Map<InternalEventKind | "*", Set<EventListener>>();

  on(kind: InternalEventKind | "*", listener: EventListener): () => void {
    const listeners = this.listeners.get(kind) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(kind, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(kind);
    };
  }

  emit(event: InternalEvent): void {
    for (const listener of this.listeners.get(event.kind) ?? []) listener(event);
    for (const listener of this.listeners.get("*") ?? []) listener(event);
  }

  clear(): void {
    this.listeners.clear();
  }
}

