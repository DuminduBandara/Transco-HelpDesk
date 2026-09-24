"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { RealtimeEventType, RealtimeEvent } from "@/lib/realtime";

type EventCallback = (event: RealtimeEvent) => void;

export function useRealtime(
  eventTypesToListen?: RealtimeEventType[],
  onEventReceived?: (event: RealtimeEvent) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
  const onEventReceivedRef = useRef(onEventReceived);
  onEventReceivedRef.current = onEventReceived;

  // Subscribe to specific event types
  const subscribe = useCallback(
    (type: RealtimeEventType | "*", callback: EventCallback) => {
      const current = listenersRef.current.get(type) || new Set();
      current.add(callback);
      listenersRef.current.set(type, current);

      return () => {
        const set = listenersRef.current.get(type);
        if (set) {
          set.delete(callback);
          if (set.size === 0) {
            listenersRef.current.delete(type);
          }
        }
      };
    },
    []
  );

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isCancelled = false;

    function connect() {
      if (isCancelled) return;

      try {
        eventSource = new EventSource("/api/realtime");

        eventSource.onopen = () => {
          if (!isCancelled) {
            setIsConnected(true);
            setLastSyncTime(new Date());
          }
        };

        const handleIncoming = (type: RealtimeEventType, e: MessageEvent) => {
          if (isCancelled) return;
          try {
            const data = JSON.parse(e.data);
            const eventPayload: RealtimeEvent = {
              type,
              data: data?.data ?? data,
              timestamp: data?.timestamp || new Date().toISOString(),
            };

            setLastEvent(eventPayload);
            setLastSyncTime(new Date());

            // Fire global callback
            if (onEventReceivedRef.current) {
              onEventReceivedRef.current(eventPayload);
            }

            // Dispatch to specific type listeners
            const typeListeners = listenersRef.current.get(type);
            if (typeListeners) {
              typeListeners.forEach((cb) => cb(eventPayload));
            }

            // Dispatch to wildcard listeners
            const wildcardListeners = listenersRef.current.get("*");
            if (wildcardListeners) {
              wildcardListeners.forEach((cb) => cb(eventPayload));
            }
          } catch (err) {
            console.error("[Realtime Client] Error parsing event:", err);
          }
        };

        // Listen for all standard server events
        const eventNames: RealtimeEventType[] = [
          "ticket:created",
          "ticket:updated",
          "ticket:deleted",
          "comment:created",
          "notification:created",
          "stats:updated",
          "users:updated",
        ];

        eventNames.forEach((eventName) => {
          eventSource?.addEventListener(eventName, (e: MessageEvent) => {
            handleIncoming(eventName, e);
          });
        });

        eventSource.addEventListener("connected", () => {
          if (!isCancelled) {
            setIsConnected(true);
            setLastSyncTime(new Date());
          }
        });

        eventSource.onerror = () => {
          if (isCancelled) return;
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Exponential / backoff reconnection after 4s
          reconnectTimeout = setTimeout(() => {
            if (!isCancelled) connect();
          }, 4000);
        };
      } catch (err) {
        console.warn("[Realtime Client] Could not start EventSource:", err);
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      isCancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, []);

  return {
    isConnected,
    lastEvent,
    lastSyncTime,
    subscribe,
  };
}
