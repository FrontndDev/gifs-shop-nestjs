/*
  Warnings:

  - Added the required column `slug` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titleEn` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "priceUSD" REAL,
    "video" TEXT NOT NULL,
    "original" TEXT,
    "badge" TEXT,
    "showcase" TEXT,
    "profileColor" TEXT,
    "theme" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_products" ("badge", "createdAt", "id", "original", "price", "priceUSD", "profileColor", "showcase", "theme", "title", "titleEn", "slug", "updatedAt", "video") 
SELECT 
  "badge", 
  "createdAt", 
  "id", 
  "original", 
  "price", 
  "priceUSD", 
  "profileColor", 
  "showcase", 
  "theme", 
  "title",
  "title" as "titleEn",
  lower(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace("title", ' ', '-'), 'а', 'a'), 'б', 'b'), 'в', 'v'), 'г', 'g'), 'д', 'd'), 'е', 'e'), 'ё', 'e'), 'ж', 'zh'), 'з', 'z')) || '-' || substr("id", length("id")-7) as "slug",
  "updatedAt", 
  "video" 
FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
