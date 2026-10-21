/**
 * Formula 1 2D - Multiplayer Lobby & Room UI Controller
 * Manages driver tag input, track selection (Spa / Istanbul),
 * room creation/joining, invite link sharing, and top HUD badges.
 */

export class RoomUI {
  constructor() {
    // Modal Elements
    this.modal = document.getElementById("multiplayer-modal");
    this.closeBtn = document.getElementById("close-mp-modal-btn");
    this.usernameInput = document.getElementById("mp-username");
    this.teamSelect = document.getElementById("mp-team-select");
    this.createTrackSelect = document.getElementById("mp-create-track");
    this.createBtn = document.getElementById("mp-create-btn");
    this.joinCodeInput = document.getElementById("mp-join-code");
    this.joinBtn = document.getElementById("mp-join-btn");
    this.errorMsg = document.getElementById("mp-error-msg");
    this.lobbyBtn = document.getElementById("lobby-btn");

    // Top Bar HUD Elements
    this.hudBadge = document.getElementById("room-status-badge");
    this.hudRoomCode = document.getElementById("hud-room-code");
    this.hudRoomPlayers = document.getElementById("hud-room-players");
    this.mpLeaveBtn = document.getElementById("mp-leave-btn");
    this.toastEl = document.getElementById("f1-toast");

    // State
    this.activeRoomCode = null;
    this.isInRoom = false;

    // Callbacks to be hooked by game engine / network
    this.onJoin = null;
    this.onLeave = null;

    this.init();
  }

  init() {
    // Load persisted driver name
    const savedName = localStorage.getItem("f1_driver_name") || "";
    if (this.usernameInput) {
      this.usernameInput.value = savedName;
    }

    // Load persisted team
    const savedTeam = localStorage.getItem("f1_selected_team") || "redbull";
    if (this.teamSelect) {
      this.teamSelect.value = savedTeam;
    }

    // Check for direct room URL parameter: ?room=SPA1
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get("room");
    if (urlRoom && this.joinCodeInput) {
      this.joinCodeInput.value = urlRoom.trim().toUpperCase();
    }

    // Bind UI actions
    if (this.createBtn) {
      this.createBtn.addEventListener("click", () => this.handleCreate());
    }

    if (this.joinBtn) {
      this.joinBtn.addEventListener("click", () => this.handleJoin());
    }

    if (this.joinCodeInput) {
      // Auto-uppercase room code & Enter key submit
      this.joinCodeInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      });
      this.joinCodeInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.handleJoin();
      });
    }

    if (this.usernameInput) {
      this.usernameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          if (this.joinCodeInput && this.joinCodeInput.value.trim()) {
            this.handleJoin();
          } else {
            this.handleCreate();
          }
        }
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => {
        if (this.isInRoom) this.hideModal();
      });
    }

    if (this.lobbyBtn) {
      this.lobbyBtn.addEventListener("click", () => this.showModal());
    }

    if (this.hudBadge) {
      this.hudBadge.addEventListener("click", () => this.showModal());
    }

    if (this.mpLeaveBtn) {
      this.mpLeaveBtn.addEventListener("click", () => {
        if (this.onLeave) this.onLeave();
        this.leaveRoom();
      });
    }
  }

  generateRoomCode(track) {
    const prefix = track === "istanbul" ? "IST" : "SPA";
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}${rand}`;
  }

  getValidatedDriverName() {
    const raw = (this.usernameInput ? this.usernameInput.value : "").trim();
    if (!raw || raw.length < 2) {
      this.showError("Please enter a driver name (at least 2 characters).");
      if (this.usernameInput) this.usernameInput.focus();
      return null;
    }
    const clean = raw.slice(0, 16);
    localStorage.setItem("f1_driver_name", clean);
    return clean;
  }

  handleCreate() {
    const name = this.getValidatedDriverName();
    if (!name) return;

    this.clearError();
    const track = this.createTrackSelect ? this.createTrackSelect.value : "spa";
    const team = this.teamSelect ? this.teamSelect.value : "redbull";
    const roomCode = this.generateRoomCode(track);

    localStorage.setItem("f1_selected_team", team);
    this.setBusy(true, "CREATING SESSION...");

    if (this.onJoin) {
      this.onJoin({
        roomCode,
        username: name,
        team,
        track,
        action: "create",
        isHost: true
      });
    }
  }

  handleJoin() {
    const name = this.getValidatedDriverName();
    if (!name) return;

    const rawCode = (this.joinCodeInput ? this.joinCodeInput.value : "").trim().toUpperCase();
    if (!rawCode || rawCode.length < 3) {
      this.showError("Please enter a valid room code (e.g. SPA101).");
      if (this.joinCodeInput) this.joinCodeInput.focus();
      return;
    }

    this.clearError();
    const team = this.teamSelect ? this.teamSelect.value : "redbull";
    localStorage.setItem("f1_selected_team", team);

    this.setBusy(true, "JOINING SESSION...");

    if (this.onJoin) {
      this.onJoin({
        roomCode: rawCode,
        username: name,
        team,
        track: null, // Track will be received from the room host
        action: "join",
        isHost: false
      });
    }
  }

  setBusy(isBusy, text = "") {
    if (this.createBtn) {
      this.createBtn.disabled = isBusy;
      this.createBtn.style.opacity = isBusy ? "0.6" : "1";
      this.createBtn.style.cursor = isBusy ? "wait" : "pointer";
    }
    if (this.joinBtn) {
      this.joinBtn.disabled = isBusy;
      this.joinBtn.style.opacity = isBusy ? "0.6" : "1";
      this.joinBtn.style.cursor = isBusy ? "wait" : "pointer";
      if (isBusy && text) {
        this.joinBtn.textContent = text;
      } else {
        this.joinBtn.textContent = "🚀 Join Session";
      }
    }
  }

  handleRoomError(msg) {
    this.setBusy(false);
    this.showError(msg);
    if (this.joinCodeInput) {
      this.joinCodeInput.focus();
      this.joinCodeInput.select();
    }
  }

  enterRoom(roomCode, track, playerCount = 1) {
    this.setBusy(false);
    this.clearError();
    this.activeRoomCode = roomCode;
    this.isInRoom = true;
    this.hideModal();

    // Update URL without reloading so the player can copy current URL
    const url = new URL(window.location);
    url.searchParams.set("room", roomCode);
    window.history.replaceState({}, "", url);

    // Show HUD Status Badge
    if (this.hudBadge) this.hudBadge.classList.remove("hidden");
    if (this.hudRoomCode) this.hudRoomCode.textContent = roomCode;
    this.updatePlayerCount(playerCount);

    if (this.closeBtn) this.closeBtn.classList.remove("hidden");
    if (this.mpLeaveBtn) this.mpLeaveBtn.classList.remove("hidden");
    this.showToast(`Joined Room ${roomCode}!`);
  }

  leaveRoom() {
    this.setBusy(false);
    this.clearError();
    this.activeRoomCode = null;
    this.isInRoom = false;

    // Clean URL parameter
    const url = new URL(window.location);
    url.searchParams.delete("room");
    window.history.replaceState({}, "", url);

    if (this.hudBadge) this.hudBadge.classList.add("hidden");
    if (this.closeBtn) this.closeBtn.classList.add("hidden");
    if (this.mpLeaveBtn) this.mpLeaveBtn.classList.add("hidden");

    this.showModal();
    this.showToast("Left room session.");
  }

  updatePlayerCount(count) {
    if (this.hudRoomPlayers) {
      this.hudRoomPlayers.textContent = `👥 ${count} ${count === 1 ? "Driver" : "Drivers"}`;
    }
  }

  copyInviteLink() {
    if (!this.activeRoomCode) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${this.activeRoomCode}`;
    navigator.clipboard.writeText(shareUrl).then(
      () => this.showToast("📋 Invite link copied to clipboard!"),
      () => this.showToast(`Share Code: ${this.activeRoomCode}`)
    );
  }

  showModal() {
    if (this.modal) this.modal.classList.remove("hidden");
    if (this.usernameInput) this.usernameInput.focus();
  }

  hideModal() {
    if (this.modal) this.modal.classList.add("hidden");
  }

  showError(msg) {
    if (this.errorMsg) {
      this.errorMsg.innerHTML = `<span>⚠️</span> <span>${msg}</span>`;
      this.errorMsg.classList.remove("hidden");
    }
  }

  clearError() {
    if (this.errorMsg) {
      this.errorMsg.innerHTML = "";
      this.errorMsg.classList.add("hidden");
    }
  }

  showToast(text, duration = 3000) {
    if (!this.toastEl) return;
    this.toastEl.textContent = text;
    this.toastEl.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastEl.classList.remove("show");
    }, duration);
  }
}
