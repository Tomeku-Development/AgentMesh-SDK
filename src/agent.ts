/**
 * High-level Agent class for AgentMesh SDK.
 * Provides a simple API for connecting to the mesh, subscribing to topics,
 * and publishing messages.
 */

import { TypedEmitter } from "./events.js";
import { Transport, type TransportOptions } from "./transport.js";
import type {
  WSSystemMessage,
  WSMessageMessage,
  ServerMessage,
} from "./types/protocol.js";
import type { AgentRole } from "./types/messages.js";

// ── Topic Mappings ──────────────────────────────────────────

/** Convenience event-to-topic mapping for the MESH protocol. */
export const TOPIC_MAP = {
  // Discovery
  "discovery:announce": "mesh/discovery/announce",
  "discovery:heartbeat": "mesh/discovery/heartbeat",
  "discovery:goodbye": "mesh/discovery/goodbye",
  // Orders
  "order:request": "orders/+/request",
  "order:bid": "orders/+/bid",
  "order:counter": "orders/+/counter",
  "order:accept": "orders/+/accept",
  "order:reject": "orders/+/reject",
  "order:commit": "orders/+/commit",
  "order:status": "orders/+/status",
  // Shipping
  "shipping:request": "shipping/+/request",
  "shipping:bid": "shipping/+/bid",
  "shipping:assign": "shipping/+/assign",
  "shipping:transit": "shipping/+/transit",
  // Quality
  "inspection:request": "inspection/+/request",
  "inspection:report": "inspection/+/report",
  // Market
  "market:prices": "market/prices",
  "market:demand": "market/demand",
  // Ledger
  "ledger:transaction": "ledger/transactions",
  "ledger:escrow": "ledger/escrow",
  // Reputation
  "reputation:update": "reputation/updates",
  // Health
  "health:alert": "mesh/health/alerts",
  "health:redistribution": "mesh/health/redistribution",
} as const;

export type MeshEvent = keyof typeof TOPIC_MAP;

// ── Agent Options ──────────────────────────────────────────

export interface AgentOptions {
  /** AgentMesh gateway URL */
  url: string;
  /** API key (amk_ prefixed) */
  apiKey: string;
  /** Agent role in the mesh */
  role: AgentRole;
  /** Capabilities this agent offers */
  capabilities?: string[];
  /** Starting balance (default: 10000) */
  balance?: number;
  /** Optional custom agent ID */
  agentId?: string;
  /** Transport options override */
  transport?: Partial<Omit<TransportOptions, "url" | "apiKey">>;
}

export interface AgentEvents {
  connected: { agentId: string; workspace: string; workspaceId: string };
  disconnected: { code: number; reason: string };
  error: Error;
  message: { topic: string; payload: Record<string, unknown>; header: Record<string, unknown> };
  subscribed: { topics: string[] };
  unsubscribed: { topics: string[] };
  published: { topic: string };
  reconnecting: { attempt: number; delay: number };
}

export class Agent extends TypedEmitter<AgentEvents> {
  private _transport: Transport;
  private _opts: AgentOptions;
  private _agentId: string | null = null;
  private _workspace: string | null = null;
  private _workspaceId: string | null = null;
  private _connected = false;

  constructor(opts: AgentOptions) {
    super();
    this._opts = opts;
    this._transport = new Transport({
      url: opts.url,
      apiKey: opts.apiKey,
      ...opts.transport,
    });
    this._setupTransport();
  }

  /** Connect to the mesh and register this agent. */
  async connect(): Promise<{ agentId: string; workspace: string; workspaceId: string }> {
    return new Promise((resolve, reject) => {
      const onError = (err: Error) => {
        this._transport.off("error", onError);
        reject(err);
      };
      this._transport.on("error", onError);

      this._transport.connect();

      // Wait for 'open', then send register
      this._transport.once("open", () => {
        this._transport.send({
          type: "register",
          role: this._opts.role,
          capabilities: this._opts.capabilities ?? [],
          balance: this._opts.balance ?? 10000,
          ...(this._opts.agentId ? { agent_id: this._opts.agentId } : {}),
        });
      });

      // Wait for connected system event
      const handler = (data: AgentEvents["connected"]) => {
        this._transport.off("error", onError);
        resolve(data);
      };
      this.once("connected", handler);
    });
  }

  /** Subscribe to mesh topics. Accepts topic patterns or MeshEvent keys. */
  subscribe(topics: (string | MeshEvent)[]): void {
    const resolved = topics.map((t) =>
      t in TOPIC_MAP ? TOPIC_MAP[t as MeshEvent] : t,
    );
    this._transport.send({ type: "subscribe", topics: resolved });
  }

  /** Unsubscribe from mesh topics. */
  unsubscribe(topics: (string | MeshEvent)[]): void {
    const resolved = topics.map((t) =>
      t in TOPIC_MAP ? TOPIC_MAP[t as MeshEvent] : t,
    );
    this._transport.send({ type: "unsubscribe", topics: resolved });
  }

  /** Publish a message to a topic. */
  publish(topic: string | MeshEvent, payload: Record<string, unknown>): void {
    const resolved = topic in TOPIC_MAP ? TOPIC_MAP[topic as MeshEvent] : topic;
    this._transport.send({ type: "publish", topic: resolved, payload });
  }

  /** Disconnect from the mesh. */
  disconnect(): void {
    this._transport.disconnect();
    this._connected = false;
  }

  get agentId(): string | null {
    return this._agentId;
  }

  get workspace(): string | null {
    return this._workspace;
  }

  get isConnected(): boolean {
    return this._connected;
  }

  private _setupTransport(): void {
    this._transport.on("message", (msg: ServerMessage) => {
      this._handleServerMessage(msg);
    });

    this._transport.on("close", (data) => {
      this._connected = false;
      this.emit("disconnected", data);
    });

    this._transport.on("error", (err) => {
      this.emit("error", err);
    });

    this._transport.on("reconnecting", (data) => {
      this.emit("reconnecting", data);
    });
  }

  private _handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case "system":
        this._handleSystemMessage(msg as WSSystemMessage);
        break;
      case "message":
        this._handleMeshMessage(msg as WSMessageMessage);
        break;
      case "pong":
        // Heartbeat response, no action needed
        break;
    }
  }

  private _handleSystemMessage(msg: WSSystemMessage): void {
    switch (msg.event) {
      case "connected":
        this._agentId = msg.data.agent_id as string;
        this._workspace = msg.data.workspace as string;
        this._workspaceId = msg.data.workspace_id as string;
        this._connected = true;
        this.emit("connected", {
          agentId: this._agentId,
          workspace: this._workspace,
          workspaceId: this._workspaceId,
        });
        break;
      case "subscribed":
        this.emit("subscribed", { topics: msg.data.topics as string[] });
        break;
      case "unsubscribed":
        this.emit("unsubscribed", { topics: msg.data.topics as string[] });
        break;
      case "published":
        this.emit("published", { topic: msg.data.topic as string });
        break;
      case "error":
        this.emit("error", new Error(msg.data.detail as string));
        break;
    }
  }

  private _handleMeshMessage(msg: WSMessageMessage): void {
    this.emit("message", {
      topic: msg.topic,
      payload: msg.payload,
      header: msg.header,
    });
  }
}
