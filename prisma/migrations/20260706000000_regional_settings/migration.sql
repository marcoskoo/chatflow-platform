-- CreateTable
CREATE TABLE "RegionalSettings" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'PE',
    "countryName" TEXT NOT NULL DEFAULT 'Perú',
    "currencyCode" TEXT NOT NULL DEFAULT 'PEN',
    "currencySymbol" TEXT NOT NULL DEFAULT 'S/',
    "currencyName" TEXT NOT NULL DEFAULT 'Sol peruano',
    "taxName" TEXT NOT NULL DEFAULT 'IGV',
    "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0.18,
    "locale" TEXT NOT NULL DEFAULT 'es-PE',
    "timezone" TEXT NOT NULL DEFAULT 'America/Lima',
    "issuerRuc" TEXT,
    "issuerRazonSocial" TEXT,
    "issuerNombreComercial" TEXT,
    "issuerDireccion" TEXT,
    "issuerDepartamento" TEXT,
    "issuerProvincia" TEXT,
    "issuerDistrito" TEXT,
    "issuerUbigeo" TEXT,
    "issuerUrbanizacion" TEXT,
    "senderUrl" TEXT,
    "senderToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegionalSettings_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row with Peru defaults
INSERT INTO "RegionalSettings" ("id", "country", "countryName", "currencyCode", "currencySymbol", "currencyName", "taxName", "taxRate", "locale", "timezone", "createdAt", "updatedAt")
VALUES ('default', 'PE', 'Perú', 'PEN', 'S/', 'Sol peruano', 'IGV', 0.18, 'es-PE', 'America/Lima', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
