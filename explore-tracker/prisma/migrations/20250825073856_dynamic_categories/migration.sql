/*
  Warnings:

  - You are about to drop the column `category` on the `ExploreItem` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExploreItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "primaryUrl" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "categoryId" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExploreItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ExploreItem" ("createdAt", "description", "id", "isArchived", "isFavorite", "notes", "primaryUrl", "status", "title", "updatedAt") SELECT "createdAt", "description", "id", "isArchived", "isFavorite", "notes", "primaryUrl", "status", "title", "updatedAt" FROM "ExploreItem";
DROP TABLE "ExploreItem";
ALTER TABLE "new_ExploreItem" RENAME TO "ExploreItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
