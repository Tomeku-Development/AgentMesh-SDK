import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Agent, TOPIC_MAP } from "../src/agent.js";

/**
 * Mock WebSocket that simulates the AgentMesh gateway protocol.
 * Intercepts the global WebSocket constructor.
 */
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;

  private _listeners = new Map<string, Set<Function>>();
  private _sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Auto-open after microtask
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this._fire("open", {});
    }, 0);
  }

  addEventListener(event: string, fn: Function) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event)!.add(fn);
  }

  removeEventListener(event: string, fn: Function) {
    this._listeners.get(event)?.delete(fn);
  }

  send(data: string) {
    this._sentMessages.push(data);
    const msg = JSON.parse(data);
    this._handleClientMessage(msg);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    this._fire("close", { code: code ?? 1000, reason: reason ?? "" });
  }

  // Simulate server sending a message
  _injectServerMessage(msg: Record<string, unknown>) {
    this._fire("message", { data: JSON.stringify(msg) });
  }

  get _sent(): Record<string, unknown>[] {
    return this._sentMessages.map((s) => JSON.parse(s));
  }

  private _fire(event: string, data: unknown) {
    for (const fn of this._listeners.get(event) ?? []) {
      fn(data);
    }
  }

  private _handleClientMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      case "register":
        // Simulate gateway connected response
        setTimeout(() => {
          this._injectServerMessage({
            type: "system",
            event: "connected",
            data: {
              agent_id: "test-agent-001",
              workspace: "test-ws",
              workspace_id: "ws-123",
            },
          });
        }, 0);
        break;
      case "subscribe":
        setTimeout(() => {
          this._injectServerMessage({
            type: "system",
            event: "subscribed",
            data: { topics: msg.topics },
          });
        }, 0);
        break;
      case "unsubscribe":
        setTimeout(() => {
          this._injectServerMessage({
            type: "system",
            event: "unsubscribed",
            data: { topics: msg.topics },
          });
        }, 0);
        break;
      case "publish":
        setTimeout(() => {
          this._injectServerMessage({
            type: "system",
            event: "published",
            data: { topic: msg.topic },
          });
        }, 0);
        break;
      case "ping":
        setTimeout(() => {
          this._injectServerMessage({ type: "pong" });
        }, 0);
        break;
    }
  }
}

// Install mock WebSocket globally
let lastWs: MockWebSocket | null = null;

beforeEach(() => {
  (globalThis as any).WebSocket = class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      lastWs = this;
    }
    static override OPEN = 1;
    static override CLOSED = 3;
    static override CONNECTING = 0;
    static override CLOSING = 2;
  };
});

afterEach(() => {
  lastWs = null;
  delete (globalThis as any).WebSocket;
});

function createAgent(overrides = {}) {
  return new Agent({
    url: "wss://agentmesh.world/ws/v1/agent",
    apiKey: "amk_test_key_123",
    role: "buyer",
    capabilities: ["electronics"],
    ...overrides,
  });
}

describe("Agent", () => {
  it("connects and registers with the gateway", async () => {
    const agent = createAgent();
    const result = await agent.connect();

    expect(result.agentId).toBe("test-agent-001");
    expect(result.workspace).toBe("test-ws");
    expect(result.workspaceId).toBe("ws-123");
    expect(agent.isConnected).toBe(true);
    expect(agent.agentId).toBe("test-agent-001");

    // Verify the register message was sent
    const sent = lastWs!._sent;
    const registerMsg = sent.find((m) => m.type === "register");
    expect(registerMsg).toBeDefined();
    expect(registerMsg!.role).toBe("buyer");
    expect(registerMsg!.capabilities).toEqual(["electronics"]);

    agent.disconnect();
  });

  it("passes api_key as query parameter", async () => {
    const agent = createAgent({ apiKey: "amk_my_secret_key" });
    await agent.connect();
    expect(lastWs!.url).toContain("api_key=amk_my_secret_key");
    agent.disconnect();
  });

  it("subscribes to topics using event names", async () => {
    const agent = createAgent();
    await agent.connect();

    const subscribed = new Promise<{ topics: string[] }>((resolve) => {
      agent.on("subscribed", resolve);
    });

    agent.subscribe(["order:request", "order:bid"]);

    const result = await subscribed;
    expect(result.topics).toContain("orders/+/request");
    expect(result.topics).toContain("orders/+/bid");

    agent.disconnect();
  });

  it("subscribes to raw topic strings", async () => {
    const agent = createAgent();
    await agent.connect();

    const subscribed = new Promise<{ topics: string[] }>((resolve) => {
      agent.on("subscribed", resolve);
    });

    agent.subscribe(["custom/topic/here"]);

    const result = await subscribed;
    expect(result.topics).toContain("custom/topic/here");

    agent.disconnect();
  });

  it("publishes messages with topic mapping", async () => {
    const agent = createAgent();
    await agent.connect();

    const published = new Promise<{ topic: string }>((resolve) => {
      agent.on("published", resolve);
    });

    agent.publish("order:request", { order_id: "ord-1", goods: "chips" });

    const result = await published;
    expect(result.topic).toBe(TOPIC_MAP["order:request"]);

    // Verify the raw publish message
    const sent = lastWs!._sent;
    const pubMsg = sent.find((m) => m.type === "publish");
    expect(pubMsg).toBeDefined();
    expect(pubMsg!.topic).toBe("orders/+/request");
    expect((pubMsg!.payload as any).order_id).toBe("ord-1");

    agent.disconnect();
  });

  it("receives mesh messages", async () => {
    const agent = createAgent();
    await agent.connect();

    const messagePromise = new Promise<{ topic: string; payload: Record<string, unknown> }>((resolve) => {
      agent.on("message", resolve);
    });

    // Simulate server pushing a mesh message
    lastWs!._injectServerMessage({
      type: "message",
      topic: "orders/ord-99/bid",
      payload: { bid_id: "bid-1", price_per_unit: 42 },
      header: { sender_id: "supplier-1" },
    });

    const msg = await messagePromise;
    expect(msg.topic).toBe("orders/ord-99/bid");
    expect(msg.payload.bid_id).toBe("bid-1");

    agent.disconnect();
  });

  it("emits disconnected event on close", async () => {
    const agent = createAgent();
    await agent.connect();

    const disconnected = new Promise<{ code: number; reason: string }>((resolve) => {
      agent.on("disconnected", resolve);
    });

    agent.disconnect();

    const result = await disconnected;
    expect(result.code).toBe(1000);
    expect(agent.isConnected).toBe(false);
  });

  it("emits error on gateway error event", async () => {
    const agent = createAgent();
    await agent.connect();

    const errorPromise = new Promise<Error>((resolve) => {
      agent.on("error", resolve);
    });

    lastWs!._injectServerMessage({
      type: "system",
      event: "error",
      data: { detail: "Rate limit exceeded" },
    });

    const err = await errorPromise;
    expect(err.message).toBe("Rate limit exceeded");

    agent.disconnect();
  });

  it("unsubscribes from topics", async () => {
    const agent = createAgent();
    await agent.connect();

    const unsub = new Promise<{ topics: string[] }>((resolve) => {
      agent.on("unsubscribed", resolve);
    });

    agent.unsubscribe(["order:request"]);

    const result = await unsub;
    expect(result.topics).toContain("orders/+/request");

    agent.disconnect();
  });
});

describe("TOPIC_MAP", () => {
  it("contains all expected event mappings", () => {
    expect(TOPIC_MAP["order:request"]).toBe("orders/+/request");
    expect(TOPIC_MAP["order:bid"]).toBe("orders/+/bid");
    expect(TOPIC_MAP["shipping:request"]).toBe("shipping/+/request");
    expect(TOPIC_MAP["inspection:report"]).toBe("inspection/+/report");
    expect(TOPIC_MAP["market:prices"]).toBe("market/prices");
    expect(TOPIC_MAP["ledger:transaction"]).toBe("ledger/transactions");
    expect(TOPIC_MAP["health:alert"]).toBe("mesh/health/alerts");
    expect(TOPIC_MAP["discovery:announce"]).toBe("mesh/discovery/announce");
  });
});
