ALTER TABLE "Ticket"
DROP CONSTRAINT "Ticket_studentId_fkey",
ALTER COLUMN "studentId" DROP NOT NULL;

ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Etudiant"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicketMessage_ticketId_createdAt_idx"
ON "TicketMessage"("ticketId", "createdAt");
CREATE INDEX "Notification_userId_readAt_createdAt_idx"
ON "Notification"("userId", "readAt", "createdAt");

ALTER TABLE "TicketMessage"
ADD CONSTRAINT "TicketMessage_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketMessage"
ADD CONSTRAINT "TicketMessage_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
