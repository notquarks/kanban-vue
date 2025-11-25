import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../../index";
import {
  kanbanCardsTable,
  cardsToLabelsTable,
  labelsTable,
} from "../../db/schema";
import {
  type AuthVariables,
  requireAuth,
  AuthException,
} from "../../middleware/auth";
import type { MessageResponse } from "../../types/cards";

export const labelsRoutes = new Hono<{ Variables: AuthVariables }>();

// Get card labels
labelsRoutes.get("/:id/labels", requireAuth(), async (c) => {
  try {
    const cardId = c.req.param("id");

    // Verify card exists
    const [card] = await db
      .select()
      .from(kanbanCardsTable)
      .where(eq(kanbanCardsTable.id, cardId))
      .limit(1);
    if (!card) {
      throw new AuthException("Card not found", 404);
    }

    const labels = await db
      .select({
        id: labelsTable.id,
        name: labelsTable.name,
        color: labelsTable.color,
        description: labelsTable.description,
      })
      .from(labelsTable)
      .innerJoin(
        cardsToLabelsTable,
        eq(labelsTable.id, cardsToLabelsTable.labelId),
      )
      .where(eq(cardsToLabelsTable.cardId, cardId));

    return c.json({ labels });
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }

    console.error("Get card labels error:", error);
    throw new AuthException("Failed to fetch card labels", 500);
  }
});

// Add label to card
labelsRoutes.post("/:cardId/labels/:labelId", requireAuth(), async (c) => {
  try {
    const cardId = c.req.param("cardId");
    const labelId = c.req.param("labelId");

    // Verify card exists
    const [card] = await db
      .select()
      .from(kanbanCardsTable)
      .where(eq(kanbanCardsTable.id, cardId))
      .limit(1);
    if (!card) {
      throw new AuthException("Card not found", 404);
    }

    // Verify label exists
    const [label] = await db
      .select()
      .from(labelsTable)
      .where(eq(labelsTable.id, labelId))
      .limit(1);
    if (!label) {
      throw new AuthException("Label not found", 404);
    }

    // Check if association already exists
    const [existing] = await db
      .select()
      .from(cardsToLabelsTable)
      .where(
        and(
          eq(cardsToLabelsTable.cardId, cardId),
          eq(cardsToLabelsTable.labelId, labelId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new AuthException("Label already added to card", 409);
    }

    // Add label to card
    const [cardLabel] = await db
      .insert(cardsToLabelsTable)
      .values({ cardId, labelId })
      .returning();

    return c.json({ cardLabel }, 201);
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }

    console.error("Add label to card error:", error);
    throw new AuthException("Failed to add label to card", 500);
  }
});

// Remove label from card
labelsRoutes.delete("/:cardId/labels/:labelId", requireAuth(), async (c) => {
  try {
    const cardId = c.req.param("cardId");
    const labelId = c.req.param("labelId");

    // Verify card exists
    const [card] = await db
      .select()
      .from(kanbanCardsTable)
      .where(eq(kanbanCardsTable.id, cardId))
      .limit(1);
    if (!card) {
      throw new AuthException("Card not found", 404);
    }

    // Remove label from card
    await db
      .delete(cardsToLabelsTable)
      .where(
        and(
          eq(cardsToLabelsTable.cardId, cardId),
          eq(cardsToLabelsTable.labelId, labelId),
        ),
      );

    const response: MessageResponse = {
      message: "Label removed from card successfully",
      success: true,
    };

    return c.json(response);
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }

    console.error("Remove label from card error:", error);
    throw new AuthException("Failed to remove label from card", 500);
  }
});
