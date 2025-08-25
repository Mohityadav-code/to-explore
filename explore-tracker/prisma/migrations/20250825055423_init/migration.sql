-- CreateTable
CREATE TABLE "ExploreItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "primaryUrl" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "kind" TEXT,
    "itemId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Link_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ExploreItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExploreItemTag" (
    "itemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("itemId", "tagId"),
    CONSTRAINT "ExploreItemTag_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ExploreItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExploreItemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "ExploreItemTag_tagId_idx" ON "ExploreItemTag"("tagId");
