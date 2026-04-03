/**
 * TypeScript interfaces for all 22 MESH protocol message types.
 * Mirrors mesh/core/messages.py Pydantic models.
 */

// ── Roles & Enums ──────────────────────────────────────────

export type AgentRole = "buyer" | "supplier" | "logistics" | "inspector" | "oracle";

export type OrderStatusType =
  | "open" | "bidding" | "negotiating" | "committed" | "fulfilling"
  | "shipping" | "delivered" | "inspecting" | "settled" | "cancelled"
  | "failed" | "recovering";

export type TransitStatusType = "picked_up" | "in_transit" | "out_for_delivery" | "delivered";
export type TransitCondition = "good" | "damaged" | "unknown";
export type VehicleType = "truck" | "drone" | "rail";
export type AgentStatus = "online" | "busy" | "degraded" | "rejoining";
export type HealthStatus = "healthy" | "busy" | "degraded";
export type AlertType = "heartbeat_timeout" | "anomaly" | "byzantine" | "overload";
export type Severity = "warning" | "critical" | "fatal";
export type RecommendedAction = "monitor" | "redistribute" | "quarantine";
export type InspectionRecommendation = "accept" | "partial_accept" | "reject";
export type TxType = "escrow_lock" | "escrow_release" | "payment" | "fee" | "penalty" | "reward" | "burn";
export type ReputationReason =
  | "order_fulfilled" | "quality_pass" | "on_time" | "late_delivery"
  | "quality_fail" | "no_show" | "byzantine" | "decay";

// ── Envelope ───────────────────────────────────────────────

export interface MessageHeader {
  message_id: string;
  timestamp: string;
  sender_id: string;
  sender_role: AgentRole;
  protocol_version: string;
  hlc: string;
}

export interface MessageEnvelope {
  header: MessageHeader;
  payload: Record<string, unknown>;
  signature: string;
}

// ── Discovery ──────────────────────────────────────────────

export interface DiscoveryAnnounce {
  agent_id: string;
  role: AgentRole;
  capabilities: string[];
  goods_categories: string[];
  public_key_hex: string;
  status: AgentStatus;
  max_concurrent_orders: number;
}

export interface Heartbeat {
  agent_id: string;
  role: string;
  status: HealthStatus;
  load: number;
  active_orders: number;
  uptime_seconds: number;
}

export interface Goodbye {
  agent_id: string;
  reason: string;
}

// ── Orders ─────────────────────────────────────────────────

export interface PurchaseOrderRequest {
  order_id: string;
  goods: string;
  category: string;
  quantity: number;
  max_price_per_unit: number;
  quality_threshold: number;
  delivery_deadline_seconds: number;
  required_capabilities: string[];
  bid_deadline_seconds: number;
}

export interface SupplierBid {
  order_id: string;
  bid_id: string;
  supplier_id: string;
  price_per_unit: number;
  available_quantity: number;
  estimated_fulfillment_seconds: number;
  reputation_score: number;
  notes: string;
}

export interface CounterOffer {
  order_id: string;
  counter_id: string;
  original_bid_id: string;
  from_agent: string;
  to_agent: string;
  round: number;
  proposed_price_per_unit: number;
  proposed_quantity?: number;
  proposed_deadline_seconds?: number;
  justification: string;
  expires_seconds: number;
}

export interface BidAcceptance {
  order_id: string;
  accepted_bid_id: string;
  supplier_id: string;
  agreed_price_per_unit: number;
  agreed_quantity: number;
  escrow_amount: number;
  escrow_tx_id: string;
}

export interface BidRejection {
  order_id: string;
  rejected_bid_id: string;
  supplier_id: string;
  reason: string;
}

export interface OrderCommit {
  order_id: string;
  supplier_id: string;
  committed_at: string;
  estimated_ready_seconds: number;
}

export interface OrderStatus {
  order_id: string;
  status: OrderStatusType;
  updated_by: string;
  details: string;
}

// ── Shipping ───────────────────────────────────────────────

export interface ShippingRequest {
  shipment_id: string;
  order_id: string;
  origin: string;
  destination: string;
  weight_kg: number;
  fragile: boolean;
  deadline_seconds: number;
  bid_deadline_seconds: number;
}

export interface ShippingBid {
  shipment_id: string;
  bid_id: string;
  logistics_id: string;
  price: number;
  estimated_transit_seconds: number;
  vehicle_type: VehicleType;
}

export interface ShippingAssign {
  shipment_id: string;
  order_id: string;
  logistics_id: string;
  accepted_bid_id: string;
  price: number;
}

export interface TransitUpdate {
  shipment_id: string;
  logistics_id: string;
  status: TransitStatusType;
  eta_seconds: number;
  condition: TransitCondition;
}

// ── Quality ────────────────────────────────────────────────

export interface InspectionRequest {
  inspection_id: string;
  order_id: string;
  shipment_id: string;
  goods: string;
  quantity_expected: number;
  quality_threshold: number;
}

export interface InspectionReport {
  inspection_id: string;
  order_id: string;
  shipment_id: string;
  inspector_id: string;
  quality_score: number;
  quantity_verified: number;
  quantity_defective: number;
  defect_descriptions: string[];
  passed: boolean;
  recommendation: InspectionRecommendation;
}

// ── Market ─────────────────────────────────────────────────

export interface MarketPriceUpdate {
  oracle_id: string;
  prices: Record<string, Record<string, number>>;
  epoch: number;
}

export interface MarketDemand {
  oracle_id: string;
  forecasts: Record<string, Record<string, number>>;
  epoch: number;
}

// ── Reputation ─────────────────────────────────────────────

export interface ReputationUpdate {
  subject_id: string;
  capability: string;
  old_score: number;
  new_score: number;
  reason: ReputationReason;
  evidence_order_id: string;
}

// ── Ledger ─────────────────────────────────────────────────

export interface LedgerTransaction {
  tx_id: string;
  tx_type: TxType;
  from_agent: string;
  to_agent: string;
  amount: number;
  order_id: string;
  memo: string;
  balance_after_from: number;
  balance_after_to: number;
}

// ── Health ─────────────────────────────────────────────────

export interface HealthAlert {
  detector_id: string;
  suspect_agent_id: string;
  alert_type: AlertType;
  severity: Severity;
  missed_heartbeats: number;
  last_seen_seconds_ago: number;
  recommended_action: RecommendedAction;
}

export interface RoleRedistribution {
  redistribution_id: string;
  failed_agent_id: string;
  failed_role: string;
  replacement_agent_id: string;
  assumed_capabilities: string[];
  active_orders_transferred: string[];
}
