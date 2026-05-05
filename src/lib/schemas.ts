import { z } from 'zod';

/**
 * schemas.ts — Central Validation Layer
 * 
 * Strict Zod schemas for all REST and WebSocket payloads.
 * This ensures malformed data never touches the core trading engine.
 */

// ── Shared Primitives ─────────────────────────────────────────────
export const PositiveNumber = z.number().positive();
export const OrderSide      = z.enum(['Buy', 'Sell']);
export const OrderType      = z.enum(['Market', 'Limit', 'StopLimit', 'TrailingStop']);
export const SorStrategy    = z.enum(['market', 'iceberg', 'twap']);

export const RoutingConfigSchema = z.object({
  strategy:      SorStrategy,
  icebergSlices: z.number().int().min(2).max(50).optional(),
  twapWindowMs:  z.number().int().min(60000).max(3600000).optional(),
}).strict();

// ── REST: Place Order ─────────────────────────────────────────────
export const PlaceOrderSchema = z.object({
  pair:            z.string().min(3).max(20),
  side:            OrderSide,
  type:            z.string(), 
  quantity:        z.number().positive().optional(),
  amount:          z.number().positive().optional(),
  price:           z.number().positive().optional(),
  stopPrice:       z.number().positive().optional(),
  callbackRate:    z.number().min(0.1).max(10).optional(),
  activationPrice: z.number().positive().optional(),
  leverage:        z.string(),
  cost:            z.number().positive(),
  takeProfitPrice: z.number().positive().optional(),
  stopLossPrice:   z.number().positive().optional(),
  accountIds:      z.array(z.string()).max(20).optional(),
  sorConfig:       RoutingConfigSchema.optional(),
  iceberg:         z.boolean().optional(),
}).strict().refine(
  (data) => data.quantity != null || data.amount != null,
  { message: 'Either quantity or amount must be provided', path: ['quantity'] }
);

// ── WebSocket: place_order ────────────────────────────────────────
export const WsPlaceOrderSchema = z.object({
  type:  z.literal('place_order'),
  order: PlaceOrderSchema,
}).strict();

export const WsClosePositionSchema = z.object({
  type: z.literal('close_position'),
  id:   z.string(),
}).strict();

export const WsMessageSchema = z.discriminatedUnion('type', [
  WsPlaceOrderSchema,
  WsClosePositionSchema,
]);

// ── REST: Vault Account ───────────────────────────────────────────
export const AddVaultAccountSchema = z.object({
  label:      z.string().min(1).max(50),
  exchange:   z.enum(['binance_spot', 'binance_futures', 'bybit', 'okx']),
  apiKey:     z.string().min(10).max(128),
  apiSecret:  z.string().min(10).max(128),
  passphrase: z.string().max(128).optional(),
  permissions: z.array(z.enum(['read', 'trade', 'withdraw'])),
  subAccount: z.string().max(50).optional(),
}).strict();

// ── REST: Risk Profile ────────────────────────────────────────────
export const RiskProfileSchema = z.object({
  accountId:          z.string().min(1),
  maxPositionSizeUsd: z.number().positive(),
  maxDailyLossUsd:    z.number().positive(),
  maxDrawdownPct:     z.number().min(1).max(100),
  allowedSymbols:     z.array(z.string()),
  maxOpenPositions:   z.number().int().positive().max(500).optional().default(50),
  maxLeverage:        z.number().int().min(1).max(125).optional().default(20),
}).strict();

export type PlaceOrderPayload      = z.infer<typeof PlaceOrderSchema>;
export type AddVaultAccountPayload = z.infer<typeof AddVaultAccountSchema>;
export type RiskProfilePayload     = z.infer<typeof RiskProfileSchema>;
