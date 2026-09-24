import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { realtimeEmitter, RealtimeEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection handshake event
      const initialPayload = JSON.stringify({
        status: "connected",
        userId: user.id,
        userRole: user.role,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${initialPayload}\n\n`)
      );

      // Event listener for all real-time broadcasts
      const onEvent = (event: RealtimeEvent) => {
        if (isClosed) return;
        try {
          const payload = JSON.stringify(event);
          controller.enqueue(
            encoder.encode(`event: ${event.type}\ndata: ${payload}\n\n`)
          );
        } catch {
          // Stream error / connection closed
        }
      };

      realtimeEmitter.on("event", onEvent);

      // Keepalive heartbeat ping every 25 seconds
      const pingInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(pingInterval);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 25000);

      // Clean up when client disconnects
      req.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(pingInterval);
        realtimeEmitter.off("event", onEvent);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
