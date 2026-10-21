/**
 * Cloudflare Worker entrypoint with PartyServer routing.
 * Routes incoming WebSocket and HTTP requests matching PartyKit patterns (/parties/main/:roomId)
 * to the F1RoomServer Durable Object instance.
 */
import { routePartykitRequest } from "partyserver";
import { F1RoomServer } from "./server.js";

export { F1RoomServer };

export default {
  async fetch(request, env, ctx) {
    // Intercepts requests like /parties/main/:roomId and forwards to Durable Object
    const partyResponse = await routePartykitRequest(request, env, { cors: true });
    if (partyResponse) return partyResponse;

    return new Response(JSON.stringify({
      name: "Formula 1 2D Real-time Server",
      status: "online",
      edge: "Cloudflare Workers & PartyServer"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
