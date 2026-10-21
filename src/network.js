/**
 * Real-time WebSocket Client Network Manager for 2D Formula 1
 * Connects to PartyKit room server at the edge with automatic reconnects,
 * rate-limited 25Hz player updates, and telemetry state synchronization.
 */

import { F1_CONFIG } from "./config.js";

export class NetworkManager {
  constructor(options = {}) {
    this.roomCode = null;
    this.driverName = null;
    this.team = "redbull";
    this.track = "spa";
    this.selfId = null;
    this.hostId = null;

    // PartyKit host configuration
    this.customHost = options.host || window.PARTYKIT_HOST || null;

    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimer = null;

    // Rate limiter for outgoing car transforms (configured tick rate)
    this.sendIntervalMs = Math.round(1000 / (F1_CONFIG?.TICK_RATE_HZ || 25));
    this.lastSendTime = 0;
    this.lastSentPacket = null;

    // Inbound & Outbound Event Callbacks
    this.onRoomSync = null;
    this.onPlayerJoined = null;
    this.onPlayerUpdate = null;
    this.onPlayerLeft = null;
    this.onLeaderboardUpdate = null;
    this.onTrackRecordBeaten = null;
    this.onRoomClosed = null;
    this.onStatusChange = null;
    this.onRoomError = null;

    this.action = "join";
    this.hasReceivedRoomError = false;
  }

  getPartyHost() {
    if (this.customHost) return this.customHost;

    const hostname = window.location.hostname;
    // Local development defaults to PartyKit dev server on port 1999
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `127.0.0.1:${F1_CONFIG?.DEV_PORT || 1999}`;
    }

    // Default production PartyKit host (can be overridden via window.PARTYKIT_HOST)
    return window.PARTYKIT_HOST || F1_CONFIG?.PARTYKIT_HOST || "f1-2d-server.fehmikartal.partykit.dev";
  }

  getHttpOrigin() {
    const host = this.getPartyHost();
    const isSecure = window.location.protocol === "https:" && !host.startsWith("127.0.0.1") && !host.startsWith("localhost");
    const proto = isSecure ? "https:" : "http:";
    return `${proto}//${host}`;
  }

  async fetchTrackRecords(trackId = "spa") {
    try {
      const origin = this.getHttpOrigin();
      const res = await fetch(`${origin}/parties/main/records?track=${encodeURIComponent(trackId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn("[NetworkManager] Failed to fetch track records from database:", err);
      return null;
    }
  }

  async submitTrackRecord(trackId, record) {
    try {
      const origin = this.getHttpOrigin();
      const res = await fetch(`${origin}/parties/main/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: trackId, record })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn("[NetworkManager] Failed to submit lap record to database:", err);
      return null;
    }
  }


  connect(roomCode, { name, team, track = "spa", action = "join" }) {
    if (this.socket) {
      this.disconnect();
    }

    this.roomCode = roomCode.trim().toUpperCase();
    this.driverName = (name || "Driver").trim().slice(0, 16);
    this.team = team || "redbull";
    this.track = track || "spa";
    this.action = action || "join";
    this.isConnecting = true;
    this.hasReceivedRoomError = false;

    clearTimeout(this.reconnectTimer);

    const host = this.getPartyHost();
    const isSecure = window.location.protocol === "https:" && !host.startsWith("127.0.0.1") && !host.startsWith("localhost");
    const wsProto = isSecure ? "wss:" : "ws:";

    const params = new URLSearchParams({
      name: this.driverName,
      team: this.team,
      track: this.track,
      action: this.action
    });

    const url = `${wsProto}//${host}/parties/main/${encodeURIComponent(this.roomCode)}?${params.toString()}`;
    console.log(`[NetworkManager] Connecting (${this.action}) to PartyKit room ${this.roomCode} at ${url}`);

    try {
      this.socket = new WebSocket(url);
    } catch (err) {
      console.error("[NetworkManager] Failed to create WebSocket connection:", err);
      this.handleDisconnect("Failed to create connection");
      return;
    }

    this.socket.onopen = () => {
      console.log(`[NetworkManager] Connected to room ${this.roomCode}`);
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      if (this.onStatusChange) this.onStatusChange({ connected: true, roomCode: this.roomCode });

      // Start keep-alive ping interval (every 10s) to keep background browser tabs connected
      clearInterval(this.pingInterval);
      this.pingInterval = setInterval(() => {
        if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: "ping" }));
        }
      }, 10000);
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.socket.onclose = (event) => {
      console.log(`[NetworkManager] Connection closed: code=${event.code}, reason=${event.reason}`);
      if (event.code === 4404 || event.reason === "Room not found") {
        if (!this.hasReceivedRoomError) {
          this.hasReceivedRoomError = true;
          if (this.onRoomError) {
            this.onRoomError({
              code: "ROOM_NOT_FOUND",
              message: `Room "${this.roomCode}" does not exist. Please check the room code or create a new room.`
            });
          }
        }
        this.disconnect();
        return;
      }
      this.handleDisconnect(event.reason || "Connection closed");
    };

    this.socket.onerror = (err) => {
      console.warn("[NetworkManager] WebSocket encountered an error:", err);
    };
  }

  handleMessage(raw) {
    try {
      const data = JSON.parse(raw);
      switch (data.type) {
        case "room:error":
          this.hasReceivedRoomError = true;
          console.warn(`[NetworkManager] Room error: ${data.message} (${data.code})`);
          this.disconnect();
          if (this.onRoomError) this.onRoomError(data);
          break;

        case "pong":
          // Keep-alive heartbeat acknowledged by server
          break;

        case "room:sync":
          this.selfId = data.selfId;
          this.hostId = data.hostId;
          this.track = data.track;
          console.log(`[NetworkManager] Room synced. Self=${this.selfId}, Track=${this.track}, Players=${data.players.length}`);
          if (this.onRoomSync) this.onRoomSync(data);
          break;

        case "player:joined":
          console.log(`[NetworkManager] Remote player joined: ${data.player.name} (${data.player.team})`);
          if (this.onPlayerJoined) this.onPlayerJoined(data.player);
          break;

        case "player:update":
          if (this.onPlayerUpdate) this.onPlayerUpdate(data);
          break;

        case "player:left":
          console.log(`[NetworkManager] Remote player left: ${data.id}`);
          if (this.onPlayerLeft) this.onPlayerLeft(data.id);
          break;

        case "leaderboard:update":
          if (this.onLeaderboardUpdate) this.onLeaderboardUpdate(data.leaderboard);
          break;

        case "track:record_beaten":
          console.log(`[NetworkManager] New all-time track record beaten by ${data.driver}: ${data.formatted}`);
          if (this.onTrackRecordBeaten) this.onTrackRecordBeaten(data);
          break;

        case "host:changed":
          this.hostId = data.hostId;
          break;

        case "room:closed":
          console.warn("[NetworkManager] Room closed by host:", data.reason);
          if (this.onRoomClosed) this.onRoomClosed(data.reason);
          this.disconnect();
          break;
      }
    } catch (err) {
      console.error("[NetworkManager] Failed to parse message:", err);
    }
  }

  sendPlayerUpdate(playerCar, now = performance.now()) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    // Rate-limit outgoing packets to ~25Hz
    if (now - this.lastSendTime < this.sendIntervalMs) {
      return;
    }
    this.lastSendTime = now;

    // Send compact telemetry payload
    const packet = {
      type: "player:update",
      x: Math.round(playerCar.x * 10) / 10,
      y: Math.round(playerCar.y * 10) / 10,
      heading: Math.round(playerCar.heading * 1000) / 1000,
      speedKmh: Math.round(playerCar.speedKmh),
      steerAngle: Math.round((playerCar.steerAngle || 0) * 1000) / 1000,
      drsActive: !!playerCar.drsActive,
      braking: !!playerCar.braking
    };

    this.socket.send(JSON.stringify(packet));
  }

  sendLapCompleted({ lapTime, sector1, sector2, sector3 }) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const packet = {
      type: "lap:completed",
      lapTime,
      sector1,
      sector2,
      sector3
    };

    this.socket.send(JSON.stringify(packet));
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingInterval);
    this.pingInterval = null;
    this.isConnecting = false;
    this.isConnected = false;

    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }

    if (this.onStatusChange) {
      this.onStatusChange({ connected: false, roomCode: null });
    }
  }

  handleDisconnect(reason) {
    const wasConnecting = this.isConnecting;
    this.isConnected = false;
    this.isConnecting = false;

    // Only notify onRoomError if the user was trying to join an existing room and connection failed
    // Never show room-not-found error when creating a new room!
    if (wasConnecting && !this.hasReceivedRoomError && this.onRoomError && this.action === "join") {
      this.hasReceivedRoomError = true;
      this.onRoomError({
        code: "CONNECTION_FAILED",
        message: `Could not connect to room "${this.roomCode}". Server may be offline or unreachable.`
      });
    }

    if (this.onStatusChange) {
      this.onStatusChange({ connected: false, roomCode: this.roomCode, reason });
    }
  }
}
