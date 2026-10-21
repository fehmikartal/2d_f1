/**
 * Formula 1 2D Racing - Global Configuration
 * Contains network edge endpoints for PartyKit and deployment constants.
 */

export const F1_CONFIG = {
  // Production PartyKit WebSocket server host
  // Once deployed via `npx partykit deploy`, replace this with your project URL,
  // e.g., "f1-2d-server.<your-username>.partykit.dev"
  PARTYKIT_HOST: window.PARTYKIT_HOST || "f1-2d-server.fehmikartal.partykit.dev",

  // Local development port
  DEV_PORT: 1999,

  // Outgoing telemetry rate (updates per second)
  TICK_RATE_HZ: 25,

  // Available circuits
  TRACKS: ["spa", "istanbul"]
};
