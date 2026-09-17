import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Deterministic PRNG so repeated seeds look consistent.
let seed = 42;
function rand(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function between(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

interface TraderSpec {
  phone: string;
  ownerName: string;
  businessName: string;
  businessType: string;
  location: string;
  yearsInBusiness: number;
  consentDistributor: boolean;
  consentBank: boolean;
  consentEsd: boolean;
  growth: number;
  activity: number;
  products: { name: string; category: string; price: number; opening: number; min: number; weight: number }[];
}

const TRADERS: TraderSpec[] = [
  {
    phone: "+27821234567",
    ownerName: "Thandi Nkosi",
    businessName: "Thandi's Spaza Shop",
    businessType: "Spaza shop",
    location: "Soweto, Johannesburg",
    yearsInBusiness: 4,
    consentDistributor: true,
    consentBank: true,
    consentEsd: true,
    growth: 1.25,
    activity: 0.94,
    products: [
      { name: "Kota", category: "Food", price: 35, opening: 40, min: 12, weight: 5 },
      { name: "Bread", category: "Bakery", price: 18, opening: 30, min: 10, weight: 5 },
      { name: "Cool Drink 500ml", category: "Beverages", price: 15, opening: 48, min: 24, weight: 5 },
      { name: "Amasi 500ml", category: "Dairy", price: 22, opening: 18, min: 6, weight: 3 },
      { name: "Chips (small)", category: "Snacks", price: 10, opening: 60, min: 20, weight: 5 },
      { name: "Airtime R10", category: "Airtime", price: 10, opening: 100, min: 30, weight: 3 },
      { name: "Maize Meal 5kg", category: "Groceries", price: 75, opening: 14, min: 5, weight: 4 },
      { name: "Eggs (6 pack)", category: "Dairy", price: 27, opening: 20, min: 8, weight: 3 },
    ],
  },
  {
    phone: "+27829876543",
    ownerName: "John Dlamini",
    businessName: "John's Corner Cafe",
    businessType: "Cafe",
    location: "Khayelitsha, Cape Town",
    yearsInBusiness: 2,
    consentDistributor: true,
    consentBank: true,
    consentEsd: false,
    growth: 1.1,
    activity: 0.72,
    products: [
      { name: "Boerewors Roll", category: "Food", price: 40, opening: 25, min: 8, weight: 5 },
      { name: "Coffee", category: "Beverages", price: 20, opening: 50, min: 15, weight: 4 },
      { name: "Pie", category: "Food", price: 25, opening: 30, min: 10, weight: 5 },
      { name: "Bread", category: "Bakery", price: 18, opening: 24, min: 10, weight: 4 },
      { name: "Bottled Water", category: "Beverages", price: 12, opening: 60, min: 20, weight: 4 },
      { name: "Magwinya (fat cakes)", category: "Food", price: 5, opening: 80, min: 25, weight: 5 },
    ],
  },
  {
    phone: "+27837654321",
    ownerName: "Maria Mokoena",
    businessName: "Maria's General Store",
    businessType: "General dealer",
    location: "Mamelodi, Pretoria",
    yearsInBusiness: 6,
    consentDistributor: true,
    consentBank: false,
    consentEsd: true,
    growth: 1.05,
    activity: 0.62,
    products: [
      { name: "Maize Meal 10kg", category: "Groceries", price: 140, opening: 20, min: 6, weight: 4 },
      { name: "Cooking Oil 2L", category: "Groceries", price: 65, opening: 18, min: 6, weight: 4 },
      { name: "Sugar 2.5kg", category: "Groceries", price: 55, opening: 22, min: 8, weight: 4 },
      { name: "Rice 2kg", category: "Groceries", price: 48, opening: 25, min: 8, weight: 4 },
      { name: "Cool Drink 2L", category: "Beverages", price: 30, opening: 36, min: 12, weight: 5 },
      { name: "Candles (pack)", category: "Household", price: 25, opening: 40, min: 12, weight: 3 },
    ],
  },
];

async function main() {
  console.log("Seeding TradePulse demo data...");

  // Clean slate (order matters for FKs).
  await prisma.stockMovement.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.readinessSnapshot.deleteMany();
  await prisma.loanAssessment.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.user.deleteMany();

  const pinHash = await bcrypt.hash("1234", 10);
  const partnerPin = await bcrypt.hash("0000", 10);

  const distributor = await prisma.user.create({
    data: {
      phone: "+27821110000",
      pinHash: partnerPin,
      ownerName: "Sipho Mahlangu",
      role: "distributor",
      businessName: "Kasi Distributors",
      businessType: "Distributor",
      location: "Johannesburg",
      isVerified: true,
      status: "active",
      lastActiveAt: new Date(),
    },
  });

  const bank = await prisma.user.create({
    data: {
      phone: "+27832220000",
      pinHash: partnerPin,
      ownerName: "Naledi Khumalo",
      role: "bank",
      businessName: "Ubuntu Bank",
      businessType: "Bank / Funder",
      location: "Sandton",
      isVerified: true,
      status: "active",
      lastActiveAt: new Date(),
    },
  });

  const admin = await prisma.user.create({
    data: {
      phone: "+27840000000",
      pinHash: partnerPin,
      ownerName: "TradePulse Admin",
      role: "admin",
      businessName: "TradePulse",
      businessType: "Platform",
      location: "Remote",
      isVerified: true,
      status: "active",
      lastActiveAt: new Date(),
    },
  });

  console.log(`Created partner accounts (distributor=${distributor.id}, bank=${bank.id}, admin=${admin.id})`);

  for (const spec of TRADERS) {
    const trader = await prisma.user.create({
      data: {
        phone: spec.phone,
        pinHash,
        ownerName: spec.ownerName,
        role: "trader",
        businessName: spec.businessName,
        businessType: spec.businessType,
        location: spec.location,
        yearsInBusiness: spec.yearsInBusiness,
        isVerified: true,
        status: "active",
        parentPartnerId: distributor.id,
        sponsorName: distributor.businessName,
        territory: "Gauteng",
        consentDistributor: spec.consentDistributor,
        consentBank: spec.consentBank,
        consentEsd: spec.consentEsd,
        consentUpdatedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    for (const [purpose, granted] of [
      ["distributor-sharing", spec.consentDistributor],
      ["bank-sharing", spec.consentBank],
      ["esd-sharing", spec.consentEsd],
    ] as [string, boolean][]) {
      await prisma.consent.create({ data: { userId: trader.id, purpose, granted } });
    }

    const productMap = new Map<string, { id: string; stock: number; price: number; min: number; weight: number }>();
    for (const p of spec.products) {
      const created = await prisma.product.create({
        data: {
          userId: trader.id,
          name: p.name,
          category: p.category,
          currentStock: 0,
          minStockThreshold: p.min,
          averagePrice: p.price,
        },
      });
      productMap.set(p.name, { id: created.id, stock: p.opening, price: p.price, min: p.min, weight: p.weight });
    }

    interface PendingMovement {
      productId: string;
      change: number;
      reason: string;
      afterStock: number;
      timestamp: Date;
    }

    const txRows: {
      userId: string;
      type: string;
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      total: number;
      timestamp: Date;
      source: string;
      status: string;
      confidence: number;
    }[] = [];
    const movements: PendingMovement[] = [];

    const weighted = spec.products.flatMap((p, i) =>
      Array.from({ length: p.weight }, () => i)
    );

    const days = 180;
    const now = new Date();
    for (let d = days; d >= 0; d--) {
      const day = new Date(now);
      day.setDate(day.getDate() - d);
      day.setHours(between(7, 19), between(0, 59), 0, 0);

      const dow = day.getDay();
      const weekendBoost = dow === 0 || dow === 6 ? 1.25 : 1;
      const isActive = rand() < spec.activity * weekendBoost;
      if (!isActive) continue;

      const recentBoost = d <= 30 ? spec.growth : 1;
      const salesCount = Math.max(1, Math.round(between(2, 6) * recentBoost));

      let dayCursor = new Date(day);
      for (let s = 0; s < salesCount; s++) {
        const pIdx = weighted[Math.floor(rand() * weighted.length)];
        const p = spec.products[pIdx];
        const info = productMap.get(p.name)!;
        const qty = between(1, 5);
        const priceJitter = pick([0, 0, 0, 0.5, -0.5, 1]);
        const price = Math.max(1, round2(p.price + priceJitter));
        dayCursor = new Date(dayCursor.getTime() + between(4, 40) * 60000);

        info.stock -= qty;
        if (info.stock < 0) info.stock = between(0, 5);
        movements.push({
          productId: info.id,
          change: -qty,
          reason: "sale",
          afterStock: info.stock,
          timestamp: dayCursor,
        });
        txRows.push({
          userId: trader.id,
          type: "sale",
          productId: info.id,
          productName: p.name,
          quantity: qty,
          unitPrice: price,
          total: round2(qty * price),
          timestamp: dayCursor,
          source: rand() > 0.5 ? "chat" : "sync",
          status: "confirmed",
          confidence: round2(0.85 + rand() * 0.14),
        });
      }

      // Restock every ~3 days on a couple of products.
      if (d % 3 === 0) {
        const p = pick(spec.products);
        const info = productMap.get(p.name)!;
        const qty = between(6, 20);
        info.stock += qty;
        const purchasePrice = round2(p.price * 0.7);
        const t = new Date(day);
        t.setHours(between(6, 9), between(0, 59), 0, 0);
        movements.push({
          productId: info.id,
          change: qty,
          reason: "purchase",
          afterStock: info.stock,
          timestamp: t,
        });
        txRows.push({
          userId: trader.id,
          type: "purchase",
          productId: info.id,
          productName: p.name,
          quantity: qty,
          unitPrice: purchasePrice,
          total: round2(qty * purchasePrice),
          timestamp: t,
          source: "chat",
          status: "confirmed",
          confidence: 0.95,
        });
      }
    }

    await prisma.transaction.createMany({ data: txRows });
    await prisma.stockMovement.createMany({
      data: movements.map((m) => ({ ...m, userId: trader.id })),
    });

    // Persist final stock levels.
    for (const [name, info] of productMap.entries()) {
      await prisma.product.update({
        where: { id: info.id },
        data: { currentStock: Math.max(0, info.stock), averagePrice: info.price },
      });
    }

    // A couple of low-stock products to make the dashboard interesting.
    const lowCandidate = pick(spec.products);
    const lowInfo = productMap.get(lowCandidate.name)!;
    await prisma.product.update({
      where: { id: lowInfo.id },
      data: { currentStock: Math.max(1, lowCandidate.min - 3) },
    });

    await prisma.user.update({
      where: { id: trader.id },
      data: { lastActiveAt: new Date(Date.now() - between(0, 3) * 86400000) },
    });

    console.log(
      `  ${spec.businessName}: ${txRows.length} transactions, ${spec.products.length} products`
    );
  }

  // Demo chat history for Thandi (the primary demo login).
  const thandi = await prisma.user.findUnique({ where: { phone: "+27821234567" } });
  if (thandi) {
    const convo = [
      ["user", "Sold 4 kotas at R35 each", "transaction"],
      ["assistant", "Sold 4 × Kota at R35.00 = R140.00. ✅\nStock on hand: 36.", "transaction"],
      ["user", "I bought 12 bread at R12 each", "text"],
      ["assistant", "Bought 12 × Bread at R12.00 = R144.00. ✅\nStock on hand: 42.", "transaction"],
      ["user", "sold 6 cool drinks for R90", "transaction"],
      ["assistant", "Sold 6 × Cool Drink 500ml at R15.00 = R90.00. ✅\nStock on hand: 42.", "transaction"],
      ["user", "Add 24 chips at R7", "text"],
      ["assistant", "Adjusted stock for 24 × Chips (small) at R7.00 = R168.00. ✅\nStock on hand: 66.", "transaction"],
      ["user", "How much did I make today?", "text"],
      ["assistant", "You made R1,265.00 from 14 sales today. Your best seller was Kota (R420). Keep going! 💪", "text"],
    ] as [string, string, string][];

    let offset = convo.length * -3;
    for (const [role, content, kind] of convo) {
      await prisma.chatMessage.create({
        data: {
          userId: thandi.id,
          role,
          content,
          kind,
          createdAt: new Date(Date.now() + offset * 60000),
        },
      });
      offset += 1;
    }

    await prisma.supportTicket.create({
      data: {
        userId: thandi.id,
        subject: "Voice note not recording",
        message: "When I tap the mic on my phone nothing happens. Please help.",
        status: "open",
        priority: "medium",
      },
    });
    await prisma.supportTicket.create({
      data: {
        userId: thandi.id,
        subject: "Request for extra stock report",
        message: "Can I export my stock list to send to my distributor?",
        status: "resolved",
        priority: "low",
      },
    });
  }

  // John raises a ticket too.
  const john = await prisma.user.findUnique({ where: { phone: "+27829876543" } });
  if (john) {
    await prisma.supportTicket.create({
      data: {
        userId: john.id,
        subject: "Cannot sync after load shedding",
        message: "My offline sales did not upload when the power came back. They show as pending.",
        status: "in_progress",
        priority: "high",
      },
    });
  }

  // Promotion from the distributor.
  await prisma.promotion.create({
    data: {
      partnerId: distributor.id,
      title: "Winter Cool Drink Special",
      product: "Cool Drink 2L",
      discount: "15% off",
      message:
        "Order 24 units of Cool Drink 2L this week and get 15% off. Delivery included in Soweto and Mamelodi.",
      targetCount: TRADERS.length,
    },
  });

  // Pending loan assessment for Thandi.
  if (thandi) {
    await prisma.loanAssessment.create({
      data: {
        traderId: thandi.id,
        bankId: bank.id,
        amount: 25000,
        termMonths: 18,
        readinessScore: 78,
        decision: "pending",
        note: "Strong, consistent trading history. Awaiting final affordability check.",
      },
    });
  }

  console.log("Seed complete.");
  console.log("\nDemo logins (OTP is shown on screen in dev; PIN below):");
  console.log("  Trader:      +27821234567  PIN 1234  (Thandi's Spaza Shop)");
  console.log("  Trader:      +27829876543  PIN 1234  (John's Corner Cafe)");
  console.log("  Trader:      +27837654321  PIN 1234  (Maria's General Store)");
  console.log("  Distributor: +27821110000  PIN 0000  (Kasi Distributors)");
  console.log("  Bank:        +27832220000  PIN 0000  (Ubuntu Bank)");
  console.log("  Admin:       +27840000000  PIN 0000  (TradePulse Admin)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });