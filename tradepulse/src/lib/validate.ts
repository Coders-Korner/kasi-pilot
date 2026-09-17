import { z } from "zod";

// ---- Auth ----
export const phoneSchema = z
  .string()
  .regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number (e.g. +27821234567)");

export const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be 4 digits");

export const registerSchema = z.object({
  phone: phoneSchema,
  ownerName: z.string().trim().min(2).max(80),
  businessName: z.string().trim().min(1).max(120),
  businessType: z.string().trim().min(1).max(60),
  location: z.string().trim().min(1).max(120),
  yearsInBusiness: z.coerce.number().int().min(0).max(99).optional(),
  pin: pinSchema,
});

export const loginSchema = z.object({
  phone: phoneSchema,
});

export const otpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const pinVerifySchema = z.object({
  phone: phoneSchema,
  pin: pinSchema,
  pinTicket: z.string().min(1),
});

export const mfaChallengeSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits"),
  mfaTicket: z.string().min(1),
});

// ---- Transactions ----
export const transactionTypeSchema = z.enum(["sale", "purchase", "adjustment"]);

export const extractionSchema = z.object({
  type: transactionTypeSchema,
  productName: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(1).max(100000),
  unitPrice: z.number().min(0).max(1_000_000),
  requiresConfirmation: z.boolean().optional().default(true),
  confidence: z.number().min(0).max(1).optional(),
  note: z.string().max(200).optional(),
});

export const businessRuleSchema = extractionSchema;
export type ExtractedTransaction = z.infer<typeof extractionSchema>;

export const chatMessageSchema = z.object({
  text: z.string().trim().min(1).max(2000).optional(),
  audioBase64: z.string().max(6_000_000).optional(),
  externalMessageId: z.string().max(120).optional(),
}).refine((v) => v.text || v.audioBase64, {
  message: "Provide text or audio",
});

export const confirmSchema = z.object({
  transactionId: z.string().min(1),
});

export const correctionSchema = z.object({
  transactionId: z.string().min(1),
  type: transactionTypeSchema,
  productName: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(1).max(100000),
  unitPrice: z.number().min(0).max(1_000_000),
});

export const manualTransactionSchema = z.object({
  type: transactionTypeSchema,
  productName: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(1).max(100000),
  unitPrice: z.number().min(0).max(1_000_000),
  timestamp: z.string().datetime().optional(),
});

// ---- Products ----
export const productSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(60).default("General"),
  currentStock: z.number().int().min(0).max(1_000_000),
  minStockThreshold: z.number().int().min(0).max(1_000_000),
  averagePrice: z.number().min(0).max(1_000_000).optional(),
});

export const productUpdateSchema = productSchema.partial();

// ---- Partner / admin ----
export const loanDecisionSchema = z.object({
  loanId: z.string().min(1),
  amount: z.number().min(0).optional(),
  note: z.string().max(500).optional(),
});

export const promotionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  product: z.string().trim().min(1).max(120),
  discount: z.string().trim().min(1).max(60),
  message: z.string().trim().min(1).max(1000),
  targetRetailerIds: z.array(z.string()).optional(),
});

export const ticketCreateSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(2000),
  priority: z.enum(["low", "medium", "high"]).default("low"),
});

export const ticketUpdateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

export const consentUpdateSchema = z.object({
  consentDistributor: z.boolean().optional(),
  consentBank: z.boolean().optional(),
  consentEsd: z.boolean().optional(),
});

export const syncBatchSchema = z.object({
  transactions: z
    .array(
      z.object({
        localId: z.string().min(1),
        type: z.enum(["sale", "purchase", "adjustment"]),
        productName: z.string().min(1).max(80),
        quantity: z.number().int().min(1),
        unitPrice: z.number().min(0),
        timestamp: z.string().datetime().optional(),
      })
    )
    .max(200),
});