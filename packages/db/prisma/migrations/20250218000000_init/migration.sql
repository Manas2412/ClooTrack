CREATE TYPE "Category" AS ENUM ('billing', 'technical', 'account', 'general');

CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE "Status" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "priority" "Priority" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);
