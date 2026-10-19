ALTER TABLE "User"
ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER',
ADD COLUMN "aiAccess" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "StudentAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminResponse" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentAccess_userId_studentId_key"
ON "StudentAccess"("userId", "studentId");
CREATE INDEX "StudentAccess_studentId_idx" ON "StudentAccess"("studentId");
CREATE INDEX "Ticket_userId_status_createdAt_idx"
ON "Ticket"("userId", "status", "createdAt");
CREATE INDEX "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt");

ALTER TABLE "StudentAccess"
ADD CONSTRAINT "StudentAccess_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAccess"
ADD CONSTRAINT "StudentAccess_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Etudiant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Etudiant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
