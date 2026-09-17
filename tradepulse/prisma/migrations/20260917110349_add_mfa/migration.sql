-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'trader',
    "businessName" TEXT,
    "businessType" TEXT,
    "location" TEXT,
    "yearsInBusiness" INTEGER,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "sponsorName" TEXT,
    "territory" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" DATETIME,
    "lastLoginAt" DATETIME,
    "consentDistributor" BOOLEAN NOT NULL DEFAULT false,
    "consentBank" BOOLEAN NOT NULL DEFAULT false,
    "consentEsd" BOOLEAN NOT NULL DEFAULT false,
    "consentUpdatedAt" DATETIME,
    "parentPartnerId" TEXT,
    CONSTRAINT "User_parentPartnerId_fkey" FOREIGN KEY ("parentPartnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("businessName", "businessType", "consentBank", "consentDistributor", "consentEsd", "consentUpdatedAt", "createdAt", "id", "isVerified", "lastActiveAt", "lastLoginAt", "location", "ownerName", "parentPartnerId", "phone", "pinHash", "role", "sponsorName", "status", "territory", "yearsInBusiness") SELECT "businessName", "businessType", "consentBank", "consentDistributor", "consentEsd", "consentUpdatedAt", "createdAt", "id", "isVerified", "lastActiveAt", "lastLoginAt", "location", "ownerName", "parentPartnerId", "phone", "pinHash", "role", "sponsorName", "status", "territory", "yearsInBusiness" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_parentPartnerId_idx" ON "User"("parentPartnerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
