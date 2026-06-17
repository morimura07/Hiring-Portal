-- AlterTable: per-user Groq API key (encrypted) + optional bid background
ALTER TABLE "users" ADD COLUMN "groqApiKey" TEXT, ADD COLUMN "bidProfile" TEXT;
