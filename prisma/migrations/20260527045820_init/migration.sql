-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter_readings" (
    "id" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "meterKwh" DOUBLE PRECISION NOT NULL,
    "buyKwh" DOUBLE PRECISION,
    "hourDiff" DOUBLE PRECISION,
    "kwhUsed" DOUBLE PRECISION,
    "costRp" DOUBLE PRECISION,
    "tariffAtEntry" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "meter_readings_recordedAt_idx" ON "meter_readings"("recordedAt");
