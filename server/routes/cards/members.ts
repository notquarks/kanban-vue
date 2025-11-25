import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../../index";
import {
  kanbanCardsTable,
  cardsToMembersTable,
  usersTable,
} from "../../db/schema";
import {
  type AuthVariables,
  requireAuth,
  AuthException,
} from "../../middleware/auth";
import type { MessageResponse } from "../../types/cards";

export const membersRoutes = new Hono<{ Variables: AuthVariables }>();

// Get all members for a card
membersRoutes.get("/:cardId/members", requireAuth(), async (c) => {
  try {
    const cardId = c.req.param("cardId");

    const [card] = await db
      .select()
      .from(kanbanCardsTable)
      .where(eq(kanbanCardsTable.id, cardId))
      .limit(1);

    if (!card) {
      throw new AuthException("Card not found", 404);
    }

    const members = await db
      .select({
        cardId: cardsToMembersTable.cardId,
        userId: cardsToMembersTable.userId,
        user: usersTable,
      })
      .from(cardsToMembersTable)
      .leftJoin(usersTable, eq(cardsToMembersTable.userId, usersTable.id))
      .where(eq(cardsToMembersTable.cardId, cardId));

    return c.json({ members });
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }
    console.error("Get card members error:", error);
    throw new AuthException("Failed to fetch card members", 500);
  }
});

// Add member to card
membersRoutes.post("/:cardId/members/:userId", requireAuth(), async (c) => {
  try {
    const cardId = c.req.param("cardId");
    const userId = c.req.param("userId");

    const [card] = await db
      .select()
      .from(kanbanCardsTable)
      .where(eq(kanbanCardsTable.id, cardId))
      .limit(1);

    if (!card) {
      throw new AuthException("Card not found", 404);
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      throw new AuthException("User not found", 404);
    }

    const [existing] = await db
      .select()
      .from(cardsToMembersTable)
      .where(
        and(
          eq(cardsToMembersTable.cardId, cardId),
          eq(cardsToMembersTable.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new AuthException("User is already a member of this card", 409);
    }

    const [cardMember] = await db
      .insert(cardsToMembersTable)
      .values({
        cardId,
        userId,
      })
      .returning();

    return c.json({ cardMember }, 201);
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }
    console.error("Add card member error:", error);
    throw new AuthException("Failed to add card member", 500);
  }
});

// Remove member from card
membersRoutes.delete("/:cardId/members/:userId", requireAuth(), async (c) => {
  try {
    const cardId = c.req.param("cardId");
    const userId = c.req.param("userId");

    await db
      .delete(cardsToMembersTable)
      .where(
        and(
          eq(cardsToMembersTable.cardId, cardId),
          eq(cardsToMembersTable.userId, userId),
        ),
      );

    const response: MessageResponse = {
      message: "Member removed from card successfully",
      success: true,
    };

    return c.json(response);
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }
    console.error("Remove card member error:", error);
    throw new AuthException("Failed to remove card member", 500);
  }
});
