-- CreateTable
CREATE TABLE "Pokemon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nationalDex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "generation" INTEGER NOT NULL,
    "height" REAL NOT NULL,
    "weight" REAL NOT NULL,
    "isLegendary" BOOLEAN NOT NULL DEFAULT false,
    "isMythical" BOOLEAN NOT NULL DEFAULT false,
    "spriteUrl" TEXT,
    "officialArtwork" TEXT
);

-- CreateTable
CREATE TABLE "PokemonType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pokemonId" INTEGER NOT NULL,
    "typeName" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    CONSTRAINT "PokemonType_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PokemonAbility" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pokemonId" INTEGER NOT NULL,
    "abilityName" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PokemonAbility_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PokemonForm" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pokemonId" INTEGER NOT NULL,
    "formName" TEXT NOT NULL,
    "spriteUrl" TEXT,
    "isMega" BOOLEAN NOT NULL DEFAULT false,
    "isShadow" BOOLEAN NOT NULL DEFAULT false,
    "isGmax" BOOLEAN NOT NULL DEFAULT false,
    "isCostume" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PokemonForm_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pokemonId" INTEGER NOT NULL,
    "isCaptured" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" DATETIME,
    CONSTRAINT "GoEntry_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoCheck" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entryId" INTEGER NOT NULL,
    "isShiny" BOOLEAN NOT NULL DEFAULT false,
    "isLucky" BOOLEAN NOT NULL DEFAULT false,
    "isHundo" BOOLEAN NOT NULL DEFAULT false,
    "isXXL" BOOLEAN NOT NULL DEFAULT false,
    "isXXS" BOOLEAN NOT NULL DEFAULT false,
    "isGmax" BOOLEAN NOT NULL DEFAULT false,
    "isMega" BOOLEAN NOT NULL DEFAULT false,
    "isShadow" BOOLEAN NOT NULL DEFAULT false,
    "isPurified" BOOLEAN NOT NULL DEFAULT false,
    "hasCostume" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "GoCheck_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "GoEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoStats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entryId" INTEGER NOT NULL,
    "cp" INTEGER,
    "level" REAL,
    "attackIv" INTEGER,
    "defenseIv" INTEGER,
    "staminaIv" INTEGER,
    CONSTRAINT "GoStats_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "GoEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoCostume" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entryId" INTEGER NOT NULL,
    "costumeName" TEXT NOT NULL,
    CONSTRAINT "GoCostume_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "GoEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomeEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pokemonId" INTEGER NOT NULL,
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "HomeEntry_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomeLanguage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entryId" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL,
    CONSTRAINT "HomeLanguage_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "HomeEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomeAbility" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entryId" INTEGER NOT NULL,
    "abilityName" TEXT NOT NULL,
    CONSTRAINT "HomeAbility_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "HomeEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomeGameOrigin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entryId" INTEGER NOT NULL,
    "gameKey" TEXT NOT NULL,
    CONSTRAINT "HomeGameOrigin_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "HomeEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomeGame" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameKey" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "totalSpecies" INTEGER NOT NULL,
    "originGame" TEXT NOT NULL,
    "generationRegion" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AttackerRanking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pokemonId" INTEGER NOT NULL,
    "form" TEXT,
    "attackType" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "tier" TEXT,
    "pokemonName" TEXT NOT NULL,
    "fastMove" TEXT NOT NULL,
    "fastMoveType" TEXT,
    "chargedMove" TEXT NOT NULL,
    "chargedMoveType" TEXT,
    "dps" REAL NOT NULL,
    "tdo" REAL NOT NULL,
    "edps" REAL NOT NULL,
    "faints" REAL,
    "ttw" TEXT,
    "percentBest" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttackerRanking_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PvpRanking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pokemonId" INTEGER NOT NULL,
    "league" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "statProduct" REAL,
    "cp" INTEGER NOT NULL,
    "level" REAL NOT NULL,
    "attackIv" INTEGER NOT NULL,
    "defenseIv" INTEGER NOT NULL,
    "staminaIv" INTEGER NOT NULL,
    "percent" REAL NOT NULL,
    "pokemonName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PvpRanking_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpriteCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pokemonId" INTEGER NOT NULL,
    "game" TEXT NOT NULL,
    "spriteUrl" TEXT NOT NULL,
    "cachedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpriteCache_pokemonId_fkey" FOREIGN KEY ("pokemonId") REFERENCES "Pokemon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "AppSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackupLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackupLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Pokemon_nationalDex_key" ON "Pokemon"("nationalDex");

-- CreateIndex
CREATE UNIQUE INDEX "PokemonType_pokemonId_slot_key" ON "PokemonType"("pokemonId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "PokemonAbility_pokemonId_abilityName_key" ON "PokemonAbility"("pokemonId", "abilityName");

-- CreateIndex
CREATE UNIQUE INDEX "PokemonForm_pokemonId_formName_key" ON "PokemonForm"("pokemonId", "formName");

-- CreateIndex
CREATE UNIQUE INDEX "GoEntry_pokemonId_key" ON "GoEntry"("pokemonId");

-- CreateIndex
CREATE UNIQUE INDEX "GoCheck_entryId_key" ON "GoCheck"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "GoStats_entryId_key" ON "GoStats"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "GoCostume_entryId_costumeName_key" ON "GoCostume"("entryId", "costumeName");

-- CreateIndex
CREATE UNIQUE INDEX "HomeEntry_pokemonId_key" ON "HomeEntry"("pokemonId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeLanguage_entryId_languageCode_key" ON "HomeLanguage"("entryId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "HomeAbility_entryId_abilityName_key" ON "HomeAbility"("entryId", "abilityName");

-- CreateIndex
CREATE UNIQUE INDEX "HomeGameOrigin_entryId_gameKey_key" ON "HomeGameOrigin"("entryId", "gameKey");

-- CreateIndex
CREATE UNIQUE INDEX "HomeGame_gameKey_key" ON "HomeGame"("gameKey");

-- CreateIndex
CREATE UNIQUE INDEX "SpriteCache_pokemonId_game_key" ON "SpriteCache"("pokemonId", "game");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_userId_key_key" ON "AppSetting"("userId", "key");
