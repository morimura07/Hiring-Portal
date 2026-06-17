-- CreateTable: connected Gmail accounts
CREATE TABLE "google_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "google_accounts_userId_key" ON "google_accounts"("userId");
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: conversation email/threading metadata
ALTER TABLE "conversations" ADD COLUMN "contactEmail" TEXT, ADD COLUMN "gmailThreadId" TEXT;
CREATE INDEX "conversations_gmailThreadId_idx" ON "conversations"("gmailThreadId");

-- AlterTable: message email metadata
ALTER TABLE "messages" ADD COLUMN "subject" TEXT, ADD COLUMN "externalId" TEXT, ADD COLUMN "messageIdHeader" TEXT;
CREATE UNIQUE INDEX "messages_externalId_key" ON "messages"("externalId");

-- CreateTable: attachments (local disk)
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "attachments_messageId_idx" ON "attachments"("messageId");
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
