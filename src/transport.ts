/**
 * WebSocket transport layer for AgentMesh SDK.
 * Handles connection, reconnection, and raw message framing.
 */

import { TypedEmitter } from "./events.js";
import type { ServerMessage } from "./types/protocol.js";

export interface TransportOptions {
  /** AgentMesh gateway URL, e.g. wss://agentmesh.world/ws/v1/agent */
  url: string;
  /** API key (amk_ prefixed) */
  apiKey: string;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base delay between reconnects in ms (default: 1000) */
  reconnectBaseDelay?: number;
  /** Max delay between reconnects in ms (default: 30000) */
  reconnectMaxDelay?: number;
  /** Ping interval in ms (default: 25000) */
  pingInterval?: number;
}

export interface TransportEvents {
  open: void;
  close: { code: number; reason: string };
  error: Error;
  message: ServerMessage;
  reconnecting: { attempt: number; delay: number };
}

export class Transport extends TypedEmitter<TransportEvents> {
  private _ws: WebSocket | null = null;
  private _opts: Required<TransportOptions>;
  private _reconnectAttempt = 0;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _pingTimer: ReturnType<typeof setInterval> | null = null;
  private _closed = false;

  constructor(opts: TransportOptions) {
    super();
    this._opts = {
      autoReconnect: true,
      maxReconnectAttempts: 10,
      reconnectBaseDelay: 1000,
      reconnectMaxDelay: 30000,
      pingInterval: 25000,
      ...opts,
    };
  }

  /** Connect to the gateway. */
  connect(): void {
    this._closed = false;
    this._reconnectAttempt = 0;
    this._doConnect();
  }

  /** Send a JSON message over the WebSocket. */
  send(data: Record<string, unknown>): void {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }
    this._ws.send(JSON.stringify(data));
  }

  /** Gracefully disconnect. */
  disconnect(): void {
    this._closed = true;
    this._clearTimers();
    if (this._ws) {
      this._ws.close(1000, "client disconnect");
      this._ws = null;
    }
  }

  get connected(): boolean {
    return this._ws?.readyState === WebSocket.OPEN;
  }

  private _doConnect(): void {
    const sep = this._opts.url.includes("?") ? "&" : "?";
    const url = `${this._opts.url}${sep}api_key=${this._opts.apiKey}`;

    this._ws = new WebSocket(url);

    this._ws.addEventListener("open", () => {
      this._reconnectAttempt = 0;
      this._startPing();
      this.emit("open", undefined as unknown as void);
    });

    this._ws.addEventListener("close", (ev) => {
      this._clearTimers();
      this.emit("close", { code: ev.code, reason: ev.reason });
      if (!this._closed && this._opts.autoReconnect) {
        this._scheduleReconnect();
      }
    });

    this._ws.addEventListener("error", () => {
      this.emit("error", new Error("WebSocket error"));
    });

    this._ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as ServerMessage;
        this.emit("message", msg);
      } catch {
        // Ignore malformed messages
      }
    });
  }

  private _scheduleReconnect(): void {
    if (this._reconnectAttempt >= this._opts.maxReconnectAttempts) {
      this.emit("error", new Error(`Max reconnect attempts (${this._opts.maxReconnectAttempts}) exceeded`));
      return;
    }
    this._reconnectAttempt++;
    const delay = Math.min(
      this._opts.reconnectBaseDelay * Math.pow(2, this._reconnectAttempt - 1),
      this._opts.reconnectMaxDelay,
    );
    this.emit("reconnecting", { attempt: this._reconnectAttempt, delay });
    this._reconnectTimer = setTimeout(() => this._doConnect(), delay);
  }

  private _startPing(): void {
    this._pingTimer = setInterval(() => {
      if (this._ws?.readyState === WebSocket.OPEN) {
        this._ws.send(JSON.stringify({ type: "ping" }));
      }
    }, this._opts.pingInterval);
  }

  private _clearTimers(): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }
}
