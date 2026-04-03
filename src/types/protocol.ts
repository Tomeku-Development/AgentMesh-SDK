/**
 * WebSocket protocol message types (mirrors gateway/protocol.py).
 */

// ── Client -> Server ────────────────────────────────────────

export interface WSRegisterMessage {
  type: "register";
  role: string;
  capabilities: string[];
  balance?: number;
  agent_id?: string;
}

export interface WSSubscribeMessage {
  type: "subscribe";
  topics: string[];
}

export interface WSUnsubscribeMessage {
  type: "unsubscribe";
  topics: string[];
}

export interface WSPublishMessage {
  type: "publish";
  topic: string;
  payload: Record<string, unknown>;
}

export interface WSPingMessage {
  type: "ping";
}

export type ClientMessage =
  | WSRegisterMessage
  | WSSubscribeMessage
  | WSUnsubscribeMessage
  | WSPublishMessage
  | WSPingMessage;

// ── Server -> Client ────────────────────────────────────────

export interface WSSystemMessage {
  type: "system";
  event: string;
  data: Record<string, unknown>;
}

export interface WSMessageMessage {
  type: "message";
  topic: string;
  payload: Record<string, unknown>;
  header: Record<string, unknown>;
}

export interface WSPongMessage {
  type: "pong";
}

export interface WSAckMessage {
  type: "ack";
  ref: string;
}

export type ServerMessage =
  | WSSystemMessage
  | WSMessageMessage
  | WSPongMessage
  | WSAckMessage;
