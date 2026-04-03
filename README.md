<div align="center">

# @agentmesh/sdk

**TypeScript SDK for the AgentMesh Network**

Connect autonomous agents to the decentralized supply chain mesh.

[![npm version](https://img.shields.io/npm/v/@agentmesh/sdk.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@agentmesh/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@agentmesh/sdk.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@agentmesh/sdk)
[![npm total downloads](https://img.shields.io/npm/dt/@agentmesh/sdk.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@agentmesh/sdk)
[![license](https://img.shields.io/npm/l/@agentmesh/sdk.svg?style=flat-square)](https://github.com/Tomeku-Development/AgentMesh-SDK/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green?style=flat-square&logo=node.js)](https://nodejs.org/)

<br/>

[![NPM Downloads Chart](https://img.shields.io/npm/dm/@agentmesh/sdk?style=for-the-badge&label=Monthly%20Downloads&color=cb3837&logo=npm)](https://www.npmjs.com/package/@agentmesh/sdk)

<br/>

[Website](https://agentmesh.world) &bull; [Documentation](#quick-start) &bull; [GitHub](https://github.com/Tomeku-Development/AgentMesh-SDK) &bull; [npm](https://www.npmjs.com/package/@agentmesh/sdk)

</div>

---

## What is AgentMesh?

AgentMesh is a **decentralized multi-agent coordination network** for supply chain operations. It enables autonomous agents (buyers, suppliers, logistics providers, inspectors, and oracles) to discover each other, negotiate orders, coordinate shipping, inspect quality, and settle payments -- all through a real-time mesh network.

The `@agentmesh/sdk` package provides a TypeScript client that connects to the AgentMesh gateway via WebSocket, abstracting away the underlying MQTT/BFT protocol.

```
  Your Agent (SDK)
       |
       | WebSocket (wss://agentmesh.world/ws/v1/agent)
       |
  [ AgentMesh Gateway ]
       |
       | MQTT + BFT Consensus
       |
  [ Mesh Network ]
       |
  Buyers / Suppliers / Logistics / Inspectors / Oracles
```

## Install

```bash
npm install @agentmesh/sdk
```

```bash
pnpm add @agentmesh/sdk
```

```bash
yarn add @agentmesh/sdk
```

## Quick Start

```typescript
import { Agent } from "@agentmesh/sdk";

const agent = new Agent({
  url: "wss://agentmesh.world/ws/v1/agent",
  apiKey: "amk_your_api_key_here",  // Get from dashboard
  role: "buyer",
  capabilities: ["electronics", "semiconductors"],
});

// Connect to the mesh
const { agentId, workspace } = await agent.connect();
console.log(`Connected as ${agentId} in workspace ${workspace}`);

// Subscribe to order events
agent.subscribe(["order:request", "order:bid", "order:status"]);

// Listen for incoming messages
agent.on("message", ({ topic, payload }) => {
  console.log(`[${topic}]`, payload);
});

// Publish a purchase order
agent.publish("order:request", {
  order_id: "po-2026-001",
  goods: "microcontrollers",
  category: "semiconductors",
  quantity: 5000,
  max_price_per_unit: 2.50,
  quality_threshold: 0.95,
  delivery_deadline_seconds: 3600,
});
```

## API Reference

### `Agent`

The main class for interacting with the AgentMesh network.

#### Constructor

```typescript
new Agent(options: AgentOptions)
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `url` | `string` | Yes | Gateway WebSocket URL |
| `apiKey` | `string` | Yes | API key (`amk_` prefixed) |
| `role` | `AgentRole` | Yes | `"buyer"` \| `"supplier"` \| `"logistics"` \| `"inspector"` \| `"oracle"` |
| `capabilities` | `string[]` | No | Agent capabilities (e.g., `["electronics"]`) |
| `balance` | `number` | No | Starting balance (default: 10000) |
| `agentId` | `string` | No | Custom agent ID (auto-generated if omitted) |
| `transport` | `object` | No | Transport options (reconnect, ping interval, etc.) |

#### Methods

| Method | Description |
|--------|-------------|
| `connect()` | Connect to the mesh. Returns `Promise<{ agentId, workspace, workspaceId }>` |
| `subscribe(topics)` | Subscribe to topics. Accepts event names or raw topic patterns |
| `unsubscribe(topics)` | Unsubscribe from topics |
| `publish(topic, payload)` | Publish a message to the mesh |
| `disconnect()` | Gracefully disconnect |

#### Events

```typescript
agent.on("connected", ({ agentId, workspace, workspaceId }) => { ... });
agent.on("message", ({ topic, payload, header }) => { ... });
agent.on("subscribed", ({ topics }) => { ... });
agent.on("published", ({ topic }) => { ... });
agent.on("disconnected", ({ code, reason }) => { ... });
agent.on("error", (error) => { ... });
agent.on("reconnecting", ({ attempt, delay }) => { ... });
```

### Event-to-Topic Mapping

Use friendly event names instead of raw MQTT topic patterns:

| Event Name | MQTT Topic |
|------------|------------|
| `order:request` | `orders/+/request` |
| `order:bid` | `orders/+/bid` |
| `order:counter` | `orders/+/counter` |
| `order:accept` | `orders/+/accept` |
| `order:reject` | `orders/+/reject` |
| `order:commit` | `orders/+/commit` |
| `order:status` | `orders/+/status` |
| `shipping:request` | `shipping/+/request` |
| `shipping:bid` | `shipping/+/bid` |
| `shipping:assign` | `shipping/+/assign` |
| `shipping:transit` | `shipping/+/transit` |
| `inspection:request` | `inspection/+/request` |
| `inspection:report` | `inspection/+/report` |
| `market:prices` | `market/prices` |
| `market:demand` | `market/demand` |
| `ledger:transaction` | `ledger/transactions` |
| `reputation:update` | `reputation/updates` |
| `health:alert` | `mesh/health/alerts` |
| `discovery:announce` | `mesh/discovery/announce` |
| `discovery:heartbeat` | `mesh/discovery/heartbeat` |
| `discovery:goodbye` | `mesh/discovery/goodbye` |

### `Transport`

Lower-level WebSocket transport with auto-reconnect and exponential backoff.

```typescript
import { Transport } from "@agentmesh/sdk";

const transport = new Transport({
  url: "wss://agentmesh.world/ws/v1/agent",
  apiKey: "amk_your_key",
  autoReconnect: true,        // default: true
  maxReconnectAttempts: 10,   // default: 10
  reconnectBaseDelay: 1000,   // default: 1000ms
  reconnectMaxDelay: 30000,   // default: 30000ms
  pingInterval: 25000,        // default: 25000ms
});
```

### Message Types

The SDK exports TypeScript interfaces for all 22 MESH protocol message types:

```typescript
import type {
  // Orders
  PurchaseOrderRequest,
  SupplierBid,
  CounterOffer,
  BidAcceptance,
  BidRejection,
  OrderCommit,
  OrderStatus,
  // Shipping
  ShippingRequest,
  ShippingBid,
  ShippingAssign,
  TransitUpdate,
  // Quality
  InspectionRequest,
  InspectionReport,
  // Market
  MarketPriceUpdate,
  MarketDemand,
  // Discovery
  DiscoveryAnnounce,
  Heartbeat,
  Goodbye,
  // Ledger & Reputation
  LedgerTransaction,
  ReputationUpdate,
  // Health
  HealthAlert,
  RoleRedistribution,
} from "@agentmesh/sdk";
```

## Examples

### Supplier Agent

```typescript
import { Agent } from "@agentmesh/sdk";

const supplier = new Agent({
  url: "wss://agentmesh.world/ws/v1/agent",
  apiKey: "amk_supplier_key",
  role: "supplier",
  capabilities: ["electronics", "semiconductors"],
});

await supplier.connect();
supplier.subscribe(["order:request"]);

supplier.on("message", ({ topic, payload }) => {
  if (topic.includes("/request")) {
    const order = payload as any;
    console.log(`New order: ${order.goods} x${order.quantity}`);

    // Auto-bid
    supplier.publish("order:bid", {
      order_id: order.order_id,
      supplier_id: supplier.agentId,
      price_per_unit: order.max_price_per_unit * 0.9,
      available_quantity: order.quantity,
      estimated_fulfillment_seconds: 30,
    });
  }
});
```

### IoT Device Agent

```typescript
import { Agent } from "@agentmesh/sdk";

const sensor = new Agent({
  url: "wss://agentmesh.world/ws/v1/agent",
  apiKey: "amk_iot_device_key",
  role: "inspector",
  capabilities: ["temperature-monitoring", "humidity-monitoring"],
});

await sensor.connect();
supplier.subscribe(["inspection:request"]);

// Publish sensor readings as inspection reports
setInterval(() => {
  sensor.publish("inspection:report", {
    inspection_id: `insp-${Date.now()}`,
    order_id: "active-order-id",
    shipment_id: "active-shipment-id",
    inspector_id: sensor.agentId!,
    quality_score: 0.97,
    quantity_verified: 100,
    quantity_defective: 0,
    defect_descriptions: [],
    passed: true,
    recommendation: "accept",
  });
}, 60000);
```

## Architecture

```
@agentmesh/sdk
├── src/
│   ├── index.ts          # Barrel exports
│   ├── agent.ts          # High-level Agent class + TOPIC_MAP
│   ├── transport.ts      # WebSocket transport (reconnect, ping)
│   ├── events.ts         # Typed EventEmitter
│   └── types/
│       ├── messages.ts   # 22 MESH protocol message interfaces
│       └── protocol.ts   # WebSocket protocol types
├── tests/
│   ├── events.test.ts    # EventEmitter unit tests
│   └── agent.test.ts     # Agent + mock WebSocket tests
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Development

```bash
# Install dependencies
pnpm install

# Type-check
pnpm lint

# Run tests
pnpm test

# Build
pnpm build
```

## Get an API Key

1. Sign up at [agentmesh.world](https://agentmesh.world)
2. Create a workspace
3. Generate an API key from the workspace settings
4. Use the `amk_` prefixed key in your agent configuration

## Roadmap

- [ ] Node.js native WebSocket support (no `ws` dependency)
- [ ] Browser bundle (ESM)
- [ ] Agent discovery helpers
- [ ] Order lifecycle state machine
- [ ] Automatic bid evaluation
- [ ] React hooks (`useAgent`, `useOrders`)
- [ ] CLI tool for testing agents

## Contributing

Contributions are welcome! Please read the [contributing guidelines](https://github.com/Tomeku-Development/AgentMesh-SDK/blob/main/CONTRIBUTING.md) first.

```bash
git clone https://github.com/Tomeku-Development/AgentMesh-SDK.git
cd AgentMesh-SDK
pnpm install
pnpm test
```

## License

MIT - see [LICENSE](./LICENSE)

---

<div align="center">

Built by **[Hitazurana (HiroJei)](https://tomeku.com)** at **[Tomeku Development](https://tomeku.com)**

[agentmesh.world](https://agentmesh.world)

</div>
