import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getConversationForAdmin } from "../actions";

/**
 * Integration test against the real database for the ADMIN dispute-resolution
 * escape hatch (Domain Model Spec §2.12: "ADMIN may read for dispute
 * resolution (audit-logged access)"). Confirms the read succeeds AND that
 * every access is recorded — the part that's easy to silently regress.
 */

// Zod's .uuid() validates real RFC 4122 version/variant nibbles, so these
// must be genuine v4-shaped UUIDs, not hand-rolled placeholders.
const ADMIN_ID = "bf138c64-d518-4c46-88fd-d221c9cffd6b";
const USER_A_ID = "fc8723ff-7bfa-47e0-bc52-04e9ae282754";
const USER_B_ID = "eb5f3648-034f-4154-85a1-edc37c6ea487";
const CONVERSATION_ID = "754c9c0b-3cde-4347-a20e-172ea00a7bf3";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "bf138c64-d518-4c46-88fd-d221c9cffd6b", roles: ["ADMIN"] }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: ADMIN_ID },
    create: { id: ADMIN_ID, email: "admin-test@example.com", firstName: "Admin", lastName: "Test", roles: ["ADMIN"] },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: USER_A_ID },
    create: { id: USER_A_ID, email: "msgtest-a@example.com", firstName: "A", lastName: "Test", roles: ["CUSTOMER"] },
    update: {},
  });
  await prisma.user.upsert({
    where: { id: USER_B_ID },
    create: { id: USER_B_ID, email: "msgtest-b@example.com", firstName: "B", lastName: "Test", roles: ["CUSTOMER"] },
    update: {},
  });
  await prisma.conversation.upsert({
    where: { id: CONVERSATION_ID },
    create: {
      id: CONVERSATION_ID,
      participants: { create: [{ userId: USER_A_ID }, { userId: USER_B_ID }] },
    },
    update: {},
  });
  await prisma.message.create({
    data: { conversationId: CONVERSATION_ID, senderId: USER_A_ID, body: "disputed message" },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { targetId: CONVERSATION_ID } });
  await prisma.message.deleteMany({ where: { conversationId: CONVERSATION_ID } });
  await prisma.conversationParticipant.deleteMany({ where: { conversationId: CONVERSATION_ID } });
  await prisma.conversation.deleteMany({ where: { id: CONVERSATION_ID } });
  await prisma.user.deleteMany({ where: { id: { in: [ADMIN_ID, USER_A_ID, USER_B_ID] } } });
  await prisma.$disconnect();
});

describe("getConversationForAdmin", () => {
  it("returns the thread even though the admin isn't a participant, and writes an AuditLog row", async () => {
    const before = await prisma.auditLog.count({ where: { targetId: CONVERSATION_ID, action: "ADMIN_VIEWED_CONVERSATION" } });

    const result = await getConversationForAdmin({ conversationId: CONVERSATION_ID });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.messages).toHaveLength(1);
      expect(result.data.messages[0].body).toBe("disputed message");
    }

    const after = await prisma.auditLog.count({ where: { targetId: CONVERSATION_ID, action: "ADMIN_VIEWED_CONVERSATION" } });
    expect(after).toBe(before + 1);

    const logRow = await prisma.auditLog.findFirst({
      where: { targetId: CONVERSATION_ID, action: "ADMIN_VIEWED_CONVERSATION" },
      orderBy: { createdAt: "desc" },
    });
    expect(logRow?.actorId).toBe(ADMIN_ID);
    expect(logRow?.targetType).toBe("Conversation");
  });

  it("logs a separate row for each access (never silently dedupes admin reads)", async () => {
    await getConversationForAdmin({ conversationId: CONVERSATION_ID });
    const count = await prisma.auditLog.count({
      where: { targetId: CONVERSATION_ID, action: "ADMIN_VIEWED_CONVERSATION" },
    });
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("returns NOT_FOUND for a non-existent conversation", async () => {
    const result = await getConversationForAdmin({
      conversationId: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.success).toBe(false);
  });
});
