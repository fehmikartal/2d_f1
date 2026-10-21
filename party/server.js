/**
 * PartyServer Real-time Game Server for 2D Formula 1
 * Runs natively on Cloudflare Workers & Cloudflare Durable Objects.
 * Handles drop-in/drop-out rooms, tracks (Spa vs Istanbul Park),
 * real-time car transform relay, and persistent track record database.
 * 
 * Persistent Storage:
 * Uses Cloudflare Durable Objects transactional storage (this.ctx.storage)
 * in the dedicated 'records' room so fastest times per track persist across
 * room closures, client disconnects, and server restarts.
 */

import { Server } from "partyserver";

function formatLapTime(seconds) {
  if (!seconds || isNaN(seconds)) return "--:--.---";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3);
  return `${m}:${s.padStart(6, "0")}`;
}

export class F1RoomServer extends Server {
  constructor(ctx, env) {
    super(ctx, env);
    this.track = null;
    this.hostId = null;
    this.players = new Map();
    this.leaderboard = [];
    this.cachedTrackRecord = null;
  }

  get roomId() {
    return this.name || this.room?.id || "default";
  }

  get storage() {
    return this.ctx?.storage || this.room?.storage;
  }

  broadcastMessage(msg, without = []) {
    const payload = typeof msg === "string" ? msg : JSON.stringify(msg);
    if (typeof this.broadcast === "function") {
      this.broadcast(payload, without);
    } else if (this.room && typeof this.room.broadcast === "function") {
      this.room.broadcast(payload, without);
    }
  }

  // ==========================================
  // PERSISTENT DATABASE STORAGE METHODS (Records Room)
  // ==========================================

  async getTrackRecords(trackId = "spa") {
    const tid = trackId === "istanbul" ? "istanbul" : "spa";
    const key = `f1_track_records_${tid}`;
    let records = await this.storage.get(key);

    if (!records || !Array.isArray(records)) {
      records = [];
      await this.storage.put(key, records);
    } else {
      // Purge any legacy placeholder seed records (e.g. Verstappen, Alonso seed_*)
      const realRecords = records.filter(r => !r.id || !r.id.startsWith("seed_"));
      if (realRecords.length !== records.length) {
        records = realRecords;
        await this.storage.put(key, records);
      }
    }

    return records.sort((a, b) => a.time - b.time);
  }

  async addTrackRecord(trackId, rawRecord) {
    const tid = trackId === "istanbul" ? "istanbul" : "spa";
    const records = await this.getTrackRecords(tid);

    const seconds = typeof rawRecord.time === "number" ? rawRecord.time : (rawRecord.lapTime ? rawRecord.lapTime / 1000 : null);
    if (!seconds || isNaN(seconds) || seconds < 15) {
      return { success: false, reason: "Invalid lap time (must be >= 15 seconds)" };
    }

    const s1 = rawRecord.s1Time !== undefined ? Number(rawRecord.s1Time) : (rawRecord.s1 ? parseFloat(rawRecord.s1) : null);
    const s2 = rawRecord.s2Time !== undefined ? Number(rawRecord.s2Time) : (rawRecord.s2 ? parseFloat(rawRecord.s2) : null);
    const s3 = rawRecord.s3Time !== undefined ? Number(rawRecord.s3Time) : (rawRecord.s3 ? parseFloat(rawRecord.s3) : null);

    const normalized = {
      id: rawRecord.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      driver: (rawRecord.driver || rawRecord.name || "Driver").trim().slice(0, 16),
      team: rawRecord.team || "redbull",
      teamName: rawRecord.teamName || "F1 Team",
      teamColor: rawRecord.teamColor || "#ffffff",
      track: tid,
      trackId: tid,
      time: Math.round(seconds * 1000) / 1000,
      lapTime: Math.round(seconds * 1000),
      formatted: rawRecord.formatted || formatLapTime(seconds),
      s1Time: s1 && !isNaN(s1) ? Math.round(s1 * 1000) / 1000 : null,
      s2Time: s2 && !isNaN(s2) ? Math.round(s2 * 1000) / 1000 : null,
      s3Time: s3 && !isNaN(s3) ? Math.round(s3 * 1000) / 1000 : null,
      s1: s1 && !isNaN(s1) ? s1.toFixed(3) : (rawRecord.s1 || "--.---"),
      s2: s2 && !isNaN(s2) ? s2.toFixed(3) : (rawRecord.s2 || "--.---"),
      s3: s3 && !isNaN(s3) ? s3.toFixed(3) : (rawRecord.s3 || "--.---"),
      topSpeed: Math.round(rawRecord.topSpeed || 0),
      date: rawRecord.date || new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now()
    };

    const previousRecord = records.length > 0 ? records[0].time : Infinity;
    const isNewRecord = normalized.time < previousRecord;

    // Check if this driver already has a record on this track - keep their best
    const existingIndex = records.findIndex(r => r.driver.toLowerCase() === normalized.driver.toLowerCase());
    if (existingIndex >= 0) {
      if (normalized.time < records[existingIndex].time) {
        records[existingIndex] = normalized;
      }
    } else {
      records.push(normalized);
    }

    records.sort((a, b) => a.time - b.time);
    const trimmed = records.slice(0, 20); // Maintain Top 20 records in database
    const rank = trimmed.findIndex(r => r.id === normalized.id) + 1;

    // Persist to Cloudflare Durable Storage
    await this.storage.put(`f1_track_records_${tid}`, trimmed);

    return {
      success: true,
      rank: rank > 0 ? rank : null,
      isNewRecord,
      record: normalized,
      records: trimmed,
      allTimeBest: trimmed[0]?.time || null
    };
  }

  async clearTrackRecords(trackId) {
    const tid = trackId === "istanbul" ? "istanbul" : "spa";
    await this.storage.put(`f1_track_records_${tid}`, []);
    return [];
  }

  // ==========================================
  // HTTP REST API HANDLER
  // ==========================================

  async onRequest(req) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(req.url);
    const track = url.searchParams.get("track") || "spa";

    // Internal health ping
    if (url.pathname.endsWith("/test-ping")) {
      return new Response(JSON.stringify({ pong: true, roomId: this.roomId }), { headers: corsHeaders });
    }

    // Direct database queries to room "records" OR forwarded requests
    if (this.roomId === "records" || url.pathname.includes("/records")) {
      try {
        if (req.method === "GET") {
          const records = await this.getTrackRecords(track);
          const validLaps = records.map(r => r.time).filter(t => t > 0);
          const validS1 = records.map(r => r.s1Time).filter(t => t > 0);
          const validS2 = records.map(r => r.s2Time).filter(t => t > 0);
          const validS3 = records.map(r => r.s3Time).filter(t => t > 0);

          const allTimeBest = validLaps.length > 0 ? Math.min(...validLaps) : null;
          const bestS1 = validS1.length > 0 ? Math.min(...validS1) : null;
          const bestS2 = validS2.length > 0 ? Math.min(...validS2) : null;
          const bestS3 = validS3.length > 0 ? Math.min(...validS3) : null;
          const optimalLap = (bestS1 && bestS2 && bestS3) ? (bestS1 + bestS2 + bestS3) : null;
          const topSpeed = records.length > 0 ? Math.max(...records.map(r => r.topSpeed || 0)) : 0;

          return new Response(JSON.stringify({
            success: true,
            track,
            records,
            allTimeBest,
            optimalLap,
            bestSectors: { s1: bestS1, s2: bestS2, s3: bestS3 },
            topSpeed,
            totalRecords: records.length,
            persistedInDatabase: true
          }), { headers: corsHeaders });
        }

        if (req.method === "POST") {
          const body = await req.json();
          const targetTrack = body.track || track;
          const result = await this.addTrackRecord(targetTrack, body.record || body);
          return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: corsHeaders
          });
        }

        if (req.method === "DELETE") {
          return new Response(JSON.stringify({
            success: false,
            error: "Deleting all-time track records is not permitted."
          }), { status: 403, headers: corsHeaders });
        }
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: String(err) }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // Default room info response
    return new Response(JSON.stringify({
      roomId: this.roomId,
      track: this.track,
      playerCount: this.players.size,
      leaderboardCount: this.leaderboard.length
    }), { headers: corsHeaders });
  }

  // ==========================================
  // CROSS-ROOM DATABASE FETCH HELPERS
  // ==========================================

  async fetchRecordsFromDb(track) {
    try {
      if (this.env && this.env.Main) {
        const recordsStub = this.env.Main.get(this.env.Main.idFromName("records"));
        const res = await recordsStub.fetch(new Request(`https://partyserver/parties/main/records?track=${track}`));
        if (res.ok) return await res.json();
      } else if (this.room?.context?.parties?.main) {
        const recordsRoom = this.room.context.parties.main.get("records");
        const res = await recordsRoom.fetch(`/records?track=${track}`);
        if (res.ok) return await res.json();
      }
    } catch (err) {
      console.warn("[F1RoomServer] Failed to query persistent records room on connect:", err);
    }
    return null;
  }

  async postLapToDb(payload) {
    try {
      if (this.env && this.env.Main) {
        const recordsStub = this.env.Main.get(this.env.Main.idFromName("records"));
        const res = await recordsStub.fetch(new Request("https://partyserver/parties/main/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }));
        if (res.ok) return await res.json();
      } else if (this.room?.context?.parties?.main) {
        const recordsRoom = this.room.context.parties.main.get("records");
        const res = await recordsRoom.fetch("/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) return await res.json();
      }
    } catch (err) {
      console.warn("[F1RoomServer] Error forwarding lap to database room:", err);
    }
    return null;
  }

  // ==========================================
  // MULTIPLAYER ROOM WEBSOCKET LIFECYCLE
  // ==========================================

  async onConnect(conn, ctx) {
    const url = new URL(ctx.request.url);
    const name = (url.searchParams.get("name") || "Driver").slice(0, 16);
    const team = url.searchParams.get("team") || "redbull";
    const requestedTrack = url.searchParams.get("track") || "spa";
    const action = url.searchParams.get("action"); // "create", "join", or null

    // If joining explicitly, verify that the room actually exists and has active players (> 0)
    if (action === "join") {
      const roomExists = !!this.track && this.players.size > 0;
      if (!roomExists) {
        console.warn(`[F1RoomServer] Rejected join to non-existing or empty room: ${this.roomId} (track=${this.track}, activePlayers=${this.players.size})`);
        conn.send(JSON.stringify({
          type: "room:error",
          code: "ROOM_NOT_FOUND",
          message: `Room "${this.roomId}" does not exist. Please check the room code or create a new room.`
        }));
        conn.close(4404, "Room not found");
        return;
      }

      if (this.players.size >= 10) {
        console.warn(`[F1RoomServer] Rejected join to full room: ${this.roomId}`);
        conn.send(JSON.stringify({
          type: "room:error",
          code: "ROOM_FULL",
          message: `Room "${this.roomId}" is full (maximum 10 players).`
        }));
        conn.close(4403, "Room full");
        return;
      }
    }

    // Creating a room or first player joining an active room
    if (action === "create" || !this.track) {
      this.track = requestedTrack === "istanbul" ? "istanbul" : "spa";
      this.hostId = conn.id;
    } else if (!this.hostId) {
      this.hostId = conn.id;
    }

    // Immediately create and register player synchronously so players.size > 0 is guaranteed immediately
    const player = {
      id: conn.id,
      name,
      team,
      x: 0,
      y: 0,
      heading: 0,
      speedKmh: 0,
      steerAngle: 0,
      drsActive: false,
      braking: false,
      isHost: conn.id === this.hostId,
      bestLap: null
    };

    this.players.set(conn.id, player);

    // Fetch persistent all-time records from central database room
    let dbRecords = null;
    let allTimeBest = null;
    const dbData = await this.fetchRecordsFromDb(this.track);
    if (dbData) {
      dbRecords = dbData.records;
      allTimeBest = dbData.allTimeBest;
      this.cachedTrackRecord = allTimeBest;
    }

    // Synchronize room state, current players, and persistent track records with newcomer
    conn.send(JSON.stringify({
      type: "room:sync",
      track: this.track,
      hostId: this.hostId,
      selfId: conn.id,
      players: Array.from(this.players.values()),
      leaderboard: this.leaderboard,
      trackRecord: allTimeBest,
      allTimeRecords: dbRecords
    }));

    // Broadcast newcomer to everyone else in the room
    this.broadcastMessage(JSON.stringify({
      type: "player:joined",
      player
    }), [conn.id]);
  }

  async onMessage(arg1, arg2) {
    try {
      const sender = typeof arg1 === "object" && arg1 && "id" in arg1 ? arg1 : arg2;
      const rawMessage = sender === arg1 ? arg2 : arg1;
      const data = typeof rawMessage === "string" ? JSON.parse(rawMessage) : rawMessage;

      if (data.type === "ping") {
        sender.send(JSON.stringify({ type: "pong" }));
        return;
      }

      if (data.type === "player:update") {
        data.id = sender.id;
        const player = this.players.get(sender.id);
        if (player) {
          player.x = data.x;
          player.y = data.y;
          player.heading = data.heading;
          player.speedKmh = data.speedKmh;
          player.steerAngle = data.steerAngle || 0;
          player.drsActive = !!data.drsActive;
          player.braking = !!data.braking;
        }
        // Broadcast car updates with authenticated sender id to other peers
        this.broadcastMessage(JSON.stringify(data), [sender.id]);
      } else if (data.type === "lap:completed") {
        const player = this.players.get(sender.id);
        if (player && typeof data.lapTime === "number" && data.lapTime > 15000) {
          // Record personal best for player
          if (!player.bestLap || data.lapTime < player.bestLap.lapTime) {
            player.bestLap = {
              lapTime: data.lapTime,
              sector1: data.sector1,
              sector2: data.sector2,
              sector3: data.sector3
            };

            this.updateLeaderboard(player);

            // Broadcast updated live session leaderboard to all players in the room
            this.broadcastMessage(JSON.stringify({
              type: "leaderboard:update",
              leaderboard: this.leaderboard
            }));

            // PERSIST LAP TO CLOUDFLARE DURABLE DATABASE
            this.persistLapToDatabase(player, data).catch((err) => {
              console.error("[F1RoomServer] Failed to persist lap to database:", err);
            });
          }
        }
      } else if (data.type === "room:close" && sender.id === this.hostId) {
        this.broadcastMessage(JSON.stringify({
          type: "room:closed",
          reason: "The host has closed this room."
        }));
      }
    } catch (err) {
      console.error("[F1RoomServer] Failed to handle message:", err);
    }
  }

  async persistLapToDatabase(player, lapData) {
    const seconds = lapData.lapTime / 1000;
    const s1 = lapData.sector1 ? lapData.sector1 / 1000 : null;
    const s2 = lapData.sector2 ? lapData.sector2 / 1000 : null;
    const s3 = lapData.sector3 ? lapData.sector3 / 1000 : null;

    const payload = {
      track: this.track,
      record: {
        driver: player.name,
        team: player.team,
        time: seconds,
        lapTime: lapData.lapTime,
        formatted: formatLapTime(seconds),
        s1Time: s1,
        s2Time: s2,
        s3Time: s3,
        s1: s1 ? s1.toFixed(3) : "--.---",
        s2: s2 ? s2.toFixed(3) : "--.---",
        s3: s3 ? s3.toFixed(3) : "--.---",
        topSpeed: player.speedKmh || 0
      }
    };

    const result = await this.postLapToDb(payload);
    if (result && result.isNewRecord) {
      this.cachedTrackRecord = result.allTimeBest;
      this.broadcastMessage(JSON.stringify({
        type: "track:record_beaten",
        track: this.track,
        driver: player.name,
        team: player.team,
        lapTime: lapData.lapTime,
        formatted: formatLapTime(seconds),
        allTimeBest: result.allTimeBest
      }));
    }
  }

  updateLeaderboard(player) {
    const existingIndex = this.leaderboard.findIndex((item) => item.id === player.id);
    const entry = {
      id: player.id,
      name: player.name,
      team: player.team,
      lapTime: player.bestLap.lapTime,
      formattedTime: formatLapTime(player.bestLap.lapTime / 1000),
      sector1: player.bestLap.sector1,
      sector2: player.bestLap.sector2,
      sector3: player.bestLap.sector3,
      timestamp: Date.now()
    };

    if (existingIndex >= 0) {
      this.leaderboard[existingIndex] = entry;
    } else {
      this.leaderboard.push(entry);
    }

    // Sort by fastest lap time ascending
    this.leaderboard.sort((a, b) => a.lapTime - b.lapTime);
  }

  onClose(conn) {
    this.players.delete(conn.id);

    this.broadcastMessage(JSON.stringify({
      type: "player:left",
      id: conn.id
    }));

    // If all players have left, clear room state completely so empty rooms don't linger
    if (this.players.size === 0) {
      this.hostId = null;
      this.track = null;
      this.leaderboard = [];
    } else if (conn.id === this.hostId) {
      // If host leaves, assign next player as host
      const remaining = Array.from(this.players.keys());
      if (remaining.length > 0) {
        this.hostId = remaining[0];
        const newHost = this.players.get(this.hostId);
        if (newHost) newHost.isHost = true;

        this.broadcastMessage(JSON.stringify({
          type: "host:changed",
          hostId: this.hostId
        }));
      }
    }
  }
}

export default F1RoomServer;
