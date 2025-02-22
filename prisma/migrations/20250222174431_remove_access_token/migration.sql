/*
  Warnings:

  - You are about to drop the column `accessToken` on the `Workspace` table. All the data in the column will be lost.
  - Added the required column `botId` to the `Workspace` table without a default value. This is not possible if the table is not empty.
  - Added the required column `botToken` to the `Workspace` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "accessToken",
ADD COLUMN     "botId" TEXT NOT NULL,
ADD COLUMN     "botToken" TEXT NOT NULL;
