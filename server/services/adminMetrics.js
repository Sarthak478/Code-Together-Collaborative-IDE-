const MAX_EVENTS = 120;
const MAX_RECENT_ROOMS = 80;

const state = {
  counters: {
    roomsCreated: 0,
    roomsDestroyed: 0,
    joinRequests: 0,
    approvals: 0,
    denials: 0,
    runRequestsTerminal: 0,
    runRequestsLocalAgent: 0,
    runRequestsCloud: 0,
  },
  rooms: new Map(),
  events: [],
};

function now() {
  return Date.now();
}

function ensureRoom(roomId) {
  if (!state.rooms.has(roomId)) {
    state.rooms.set(roomId, {
      roomId,
      roomType: "unknown",
      roomMode: "unknown",
      createdAt: now(),
      destroyedAt: null,
      status: "active",
      currentConnections: 0,
      maxConnectionsSeen: 0,
      waitingCount: 0,
      lastActiveAt: now(),
    });
  }

  return state.rooms.get(roomId);
}

function pushEvent(type, roomId, summary, extra = {}) {
  state.events.unshift({
    id: `${now()}-${Math.random().toString(36).slice(2)}`,
    type,
    roomId,
    summary,
    at: now(),
    ...extra,
  });

  if (state.events.length > MAX_EVENTS) {
    state.events.length = MAX_EVENTS;
  }
}

function recordRoomCreated(roomId, meta = {}) {
  const room = ensureRoom(roomId);
  room.roomType = meta.roomType || room.roomType || "unknown";
  room.roomMode = meta.roomMode || room.roomMode || "unknown";
  room.createdAt = now();
  room.destroyedAt = null;
  room.status = "active";
  room.lastActiveAt = now();
  state.counters.roomsCreated += 1;
  pushEvent("room_created", roomId, `Room ${roomId} created`, {
    roomType: room.roomType,
    roomMode: room.roomMode,
  });
}

function recordRoomMode(roomId, roomMode) {
  const room = ensureRoom(roomId);
  room.roomMode = roomMode || room.roomMode || "unknown";
  room.lastActiveAt = now();
}

function recordRoomDestroyed(roomId) {
  const room = ensureRoom(roomId);
  room.status = "destroyed";
  room.destroyedAt = now();
  room.currentConnections = 0;
  room.waitingCount = 0;
  room.lastActiveAt = now();
  state.counters.roomsDestroyed += 1;
  pushEvent("room_destroyed", roomId, `Room ${roomId} destroyed`);
}

function recordJoinRequest(roomId) {
  const room = ensureRoom(roomId);
  room.lastActiveAt = now();
  state.counters.joinRequests += 1;
  pushEvent("join_request", roomId, `Join request received for ${roomId}`);
}

function recordApproval(roomId) {
  const room = ensureRoom(roomId);
  room.lastActiveAt = now();
  state.counters.approvals += 1;
  pushEvent("approval", roomId, `Join request approved for ${roomId}`);
}

function recordDenial(roomId) {
  const room = ensureRoom(roomId);
  room.lastActiveAt = now();
  state.counters.denials += 1;
  pushEvent("denial", roomId, `Join request denied for ${roomId}`);
}

function recordConnectionCount(roomId, count) {
  const room = ensureRoom(roomId);
  room.currentConnections = Math.max(0, Number(count) || 0);
  room.maxConnectionsSeen = Math.max(room.maxConnectionsSeen, room.currentConnections);
  room.lastActiveAt = now();
  room.status = room.destroyedAt ? "destroyed" : (room.currentConnections > 0 ? "active" : "idle");
}

function recordWaitingCount(roomId, count) {
  const room = ensureRoom(roomId);
  room.waitingCount = Math.max(0, Number(count) || 0);
  room.lastActiveAt = now();
}

function recordRunRequest(kind, roomId) {
  const room = ensureRoom(roomId);
  room.lastActiveAt = now();

  if (kind === "local-agent") {
    state.counters.runRequestsLocalAgent += 1;
  } else if (kind === "cloud") {
    state.counters.runRequestsCloud += 1;
  } else {
    state.counters.runRequestsTerminal += 1;
  }

  pushEvent("run_request", roomId, `Run requested in ${roomId}`, { kind });
}

function listRecentRooms() {
  return Array.from(state.rooms.values())
    .sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0))
    .slice(0, MAX_RECENT_ROOMS)
    .map((room) => ({ ...room }));
}

function listRecentEvents(limit = 30) {
  return state.events.slice(0, limit).map((event) => ({ ...event }));
}

function getCounters() {
  return { ...state.counters };
}

module.exports = {
  recordRoomCreated,
  recordRoomMode,
  recordRoomDestroyed,
  recordJoinRequest,
  recordApproval,
  recordDenial,
  recordConnectionCount,
  recordWaitingCount,
  recordRunRequest,
  listRecentRooms,
  listRecentEvents,
  getCounters,
};
