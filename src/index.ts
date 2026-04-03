/**
 * @agentmesh/sdk - TypeScript SDK for the AgentMesh network.
 *
 * @example
 * ```typescript
 * import { Agent } from "@agentmesh/sdk";
 *
 * const agent = new Agent({
 *   url: "wss://agentmesh.world/ws/v1/agent",
 *   apiKey: "amk_your_api_key_here",
 *   role: "buyer",
 *   capabilities: ["electronics"],
 * });
 *
 * const { agentId } = await agent.connect();
 * agent.subscribe(["order:request", "order:bid"]);
 *
 * agent.on("message", ({ topic, payload }) => {
 *   console.log(`[${topic}]`, payload);
 * });
 *
 * agent.publish("order:request", {
 *   order_id: "my-order-1",
 *   goods: "electronics",
 *   category: "semiconductors",
 *   quantity: 100,
 *   max_price_per_unit: 50,
 * });
 * ```
 */

export { Agent, TOPIC_MAP } from "./agent.js";
export type { AgentOptions, AgentEvents, MeshEvent } from "./agent.js";

export { Transport } from "./transport.js";
export type { TransportOptions, TransportEvents } from "./transport.js";

export { TypedEmitter } from "./events.js";

// Re-export all message types
export type {
  // Enums / type aliases
  AgentRole,
  OrderStatusType,
  TransitStatusType,
  TransitCondition,
  VehicleType,
  AgentStatus,
  HealthStatus,
  AlertType,
  Severity,
  RecommendedAction,
  InspectionRecommendation,
  TxType,
  ReputationReason,
  // Envelope
  MessageHeader,
  MessageEnvelope,
  // Discovery
  DiscoveryAnnounce,
  Heartbeat,
  Goodbye,
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
  // Reputation
  ReputationUpdate,
  // Ledger
  LedgerTransaction,
  // Health
  HealthAlert,
  RoleRedistribution,
} from "./types/index.js";

// Re-export protocol types
export type {
  WSRegisterMessage,
  WSSubscribeMessage,
  WSUnsubscribeMessage,
  WSPublishMessage,
  WSPingMessage,
  ClientMessage,
  WSSystemMessage,
  WSMessageMessage,
  WSPongMessage,
  WSAckMessage,
  ServerMessage,
} from "./types/index.js";
