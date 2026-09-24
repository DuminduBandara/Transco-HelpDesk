import { EventEmitter } from "events";

export type RealtimeEventType =
  | "ticket:created"
  | "ticket:updated"
  | "ticket:deleted"
  | "comment:created"
  | "notification:created"
  | "stats:updated"
  | "users:updated";

export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  data?: T;
  timestamp: string;
}

// Global singleton EventEmitter across Next.js API routes & server components
declare global {
  var _realtimeEmitter: EventEmitter | undefined;
}

export const realtimeEmitter =
  globalThis._realtimeEmitter || new EventEmitter();

realtimeEmitter.setMaxListeners(250);

if (process.env.NODE_ENV !== "production") {
  globalThis._realtimeEmitter = realtimeEmitter;
}

/**
 * Broadcast an event to all connected clients and subscribers in real-time.
 */
export function broadcastRealtimeEvent<T = unknown>(
  type: RealtimeEventType,
  data?: T
): RealtimeEvent<T> {
  const event: RealtimeEvent<T> = {
    type,
    data,
    timestamp: new Date().toISOString(),
  };

  try {
    realtimeEmitter.emit("event", event);
    realtimeEmitter.emit(type, event);
  } catch (err) {
    console.error("[Realtime] Broadcast error:", err);
  }

  return event;
}
