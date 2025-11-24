import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { validator } from "hono/validator";
import { eq, and, desc, count, getTableColumns } from "drizzle-orm";
import { db } from "../index";
import {
  kanbanCardsTable,
  cardsToLabelsTable,
  labelsTable,
  usersTable,
  kanbanColumnsTable,
  cardTodosTable,
  prioritiesTable,
  cardsToMembersTable,
  attachmentsTable,
  commentsTable,
} from "../db/schema";
import {
  type AuthVariables,
  type SafeUser,
  createSafeUser,
  requireAuth,
  AuthException,
} from "../middleware/auth";

// Type definitions for request bodies
interface CreateCardRequest {
  title: string;
  description?: string;
  columnId: string;
  priorityId: number;
  dueDate?: string;
  order?: number;
}

interface UpdateCardRequest {
  title?: string;
  description?: string;
  columnId?: string;
  priorityId?: number;
  dueDate?: string;
  order?: number;
  status?: string;
  estimatedHours?: number;
  actualHours?: number;
}

interface DatabaseUpdateCardRequest {
  title?: string;
  description?: string | null;
  columnId?: string;
  priorityId?: number;
  dueDate?: Date | null;
  order?: number;
  status?: string;
  estimatedHours?: number;
  actualHours?: number;
}

// Type definitions for responses
interface CardResponse {
  card: typeof kanbanCardsTable.$inferSelect & {
    assignee?: SafeUser | null;
    members?: SafeUser[];
  };
}

interface CardsResponse {
  cards: Array<
    typeof kanbanCardsTable.$inferSelect & {
      labels?: typeof labelsTable.$inferSelect | null;
      members?: SafeUser[];
    }
  >;
  total: number;
  page: number;
  limit: number;
}

interface MessageResponse {
  message: string;
  success: boolean;
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

interface CardTodo {
  id: string;
  cardId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Create cards router with proper typing
export const cardsRoutes = new Hono<{ Variables: AuthVariables }>();

// Get all cards with optional filtering and pagination
cardsRoutes.get("/", requireAuth(), async (c) => {
  try {
    const page = Number(c.req.query("page") || "1");
    const limit = Number(c.req.query("limit") || "20");
    const columnId = c.req.query("columnId");
    const assigneeId = c.req.query("assigneeId");
    const priorityId = c.req.query("priorityId");
    const status = c.req.query("status");

    // Build conditions for the main card query
    const conditions: Array<ReturnType<typeof eq>> = [];
    if (columnId) {
      conditions.push(eq(kanbanCardsTable.columnId, columnId));
    }
    if (priorityId) {
      conditions.push(eq(kanbanCardsTable.priorityId, Number(priorityId)));
    }
    if (status) {
      conditions.push(eq(kanbanCardsTable.status, status));
    }

    // Apply ordering and pagination
    const offset = (page - 1) * limit;

    let query;
    if (assigneeId) {
      query = db
        .selectDistinct({
          ...getTableColumns(kanbanCardsTable),
        })
        .from(kanbanCardsTable)
        .innerJoin(
          cardsToMembersTable,
          eq(kanbanCardsTable.id, cardsToMembersTable.cardId),
        )
        .where(and(...conditions, eq(cardsToMembersTable.userId, assigneeId)));
    } else {
      query = db
        .select({
          ...getTableColumns(kanbanCardsTable),
        })
        .from(kanbanCardsTable);

      if (conditions.length > 0) {
        query.where(and(...conditions));
      }
    }

    const cards = await query
      .orderBy(desc(kanbanCardsTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination (considering member filter if present)
    let totalResult;
    if (assigneeId) {
      totalResult = await db
        .select({ count: count() })
        .from(kanbanCardsTable)
        .innerJoin(
          cardsToMembersTable,
          eq(kanbanCardsTable.id, cardsToMembersTable.cardId),
        )
        .where(eq(cardsToMembersTable.userId, assigneeId));
    } else {
      totalResult = await db.select({ count: count() }).from(kanbanCardsTable);
    }

    const totalCards = totalResult[0]?.count || 0;

    // For each card, get its members
    const cardsWithMembers = await Promise.all(
      cards.map(async (cardItem) => {
        const members = await db
          .select({
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            avatar: usersTable.avatar,
            status: usersTable.status,
            isAdmin: usersTable.isAdmin,
            createdAt: usersTable.createdAt,
          })
          .from(cardsToMembersTable)
          .leftJoin(usersTable, eq(cardsToMembersTable.userId, usersTable.id))
          .where(eq(cardsToMembersTable.cardId, cardItem.id));

        const safeMembers = members.map((member) =>
          createSafeUser({
            id: member.id as string,
            name: member.name as string,
            email: member.email as string,
            passwordHash: "",
            avatar: member.avatar as string | null,
            status: member.status as string,
            isAdmin: member.isAdmin as boolean,
            createdAt: member.createdAt as Date,
            updatedAt: member.createdAt as Date,
            lastLoginAt: null,
            emailVerifiedAt: null,
          }),
        );

        return {
          ...cardItem,
          members: safeMembers,
        };
      }),
    );

    const response: CardsResponse = {
      cards: cardsWithMembers,
      total: totalCards,
      page: page,
      limit: limit,
    };

    return c.json(response);
  } catch (error) {
    console.error("Get cards error:", error);
    throw new AuthException("Failed to fetch cards", 500);
  }
});

// Get card by ID
cardsRoutes.get("/:id", requireAuth(), async (c) => {
  try {
    const id = c.req.param("id");

    // Get card with labels and members
    const [card] = await db
      .select({
        ...getTableColumns(kanbanCardsTable),
        labels: labelsTable,
        members: usersTable,
      })
      .from(kanbanCardsTable)
      .leftJoin(
        cardsToLabelsTable,
        eq(kanbanCardsTable.id, cardsToLabelsTable.cardId),
      )
      .leftJoin(labelsTable, eq(cardsToLabelsTable.labelId, labelsTable.id))
      .leftJoin(
        cardsToMembersTable,
        eq(kanbanCardsTable.id, cardsToMembersTable.cardId),
      )
      .leftJoin(usersTable, eq(cardsToMembersTable.userId, usersTable.id))
      .where(eq(kanbanCardsTable.id, id))
      .limit(1);

    if (!card) {
      throw new AuthException("Card not found", 404);
    }

    // Group members by card
    const [fullCard] = await db
      .select({
        ...getTableColumns(kanbanCardsTable),
        labels: labelsTable,
      })
      .from(kanbanCardsTable)
      .leftJoin(
        cardsToLabelsTable,
        eq(kanbanCardsTable.id, cardsToLabelsTable.cardId),
      )
      .leftJoin(labelsTable, eq(cardsToLabelsTable.labelId, labelsTable.id))
      .where(eq(kanbanCardsTable.id, id));

    // Get all members for this card
    const members = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        avatar: usersTable.avatar,
        status: usersTable.status,
        isAdmin: usersTable.isAdmin,
        createdAt: usersTable.createdAt,
      })
      .from(cardsToMembersTable)
      .leftJoin(usersTable, eq(cardsToMembersTable.userId, usersTable.id))
      .where(eq(cardsToMembersTable.cardId, id));

    const safeMembers = members.map((member) =>
      createSafeUser({
        id: member.id as string,
        name: member.name as string,
        email: member.email as string,
        passwordHash: "",
        avatar: member.avatar as string | null,
        status: member.status as string,
        isAdmin: member.isAdmin as boolean,
        createdAt: member.createdAt as Date,
        updatedAt: member.createdAt as Date,
        lastLoginAt: null,
        emailVerifiedAt: null,
      }),
    );

    const response: CardResponse = {
      card: {
        ...fullCard,
        members: safeMembers,
      },
    };

    return c.json(response);
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }

    console.error("Get card error:", error);
    throw new AuthException("Failed to fetch card", 500);
  }
});

// Create new card
cardsRoutes.post(
  "/",
  requireAuth(),
  validator("json", (value: unknown, c) => {
    const body = value as CreateCardRequest;

    if (!body.title?.trim()) {
      return c.json({ error: "Title is required" } as ErrorResponse, 400);
    }

    if (!body.columnId?.trim()) {
      return c.json({ error: "Column ID is required" } as ErrorResponse, 400);
    }

    if (!body.priorityId) {
      return c.json({ error: "Priority ID is required" } as ErrorResponse, 400);
    }

    if (body.title.length > 200) {
      return c.json(
        { error: "Title must be less than 200 characters" } as ErrorResponse,
        400,
      );
    }

    if (body.description && body.description.length > 2000) {
      return c.json(
        {
          error: "Description must be less than 2000 characters",
        } as ErrorResponse,
        400,
      );
    }

    return body;
  }),
  async (c) => {
    try {
      const {
        title,
        description,
        columnId,
        priorityId,
        dueDate,
        order = 0,
      } = c.req.valid("json") as CreateCardRequest;
      const currentUser = c.get("user");

      // Verify column exists
      const [column] = await db
        .select()
        .from(kanbanColumnsTable)
        .where(eq(kanbanColumnsTable.id, columnId))
        .limit(1);
      if (!column) {
        throw new AuthException("Column not found", 404);
      }

      let parsedDueDate: Date | undefined;
      if (dueDate) {
        parsedDueDate = new Date(dueDate);
        if (Number.isNaN(parsedDueDate.getTime())) {
          throw new AuthException("Invalid due date format", 400);
        }
      }

      // Create card
      const [card] = await db
        .insert(kanbanCardsTable)
        .values({
          title: title.trim(),
          description: description?.trim() || null,
          columnId,
          reporterId: currentUser.id,
          priorityId,
          dueDate: parsedDueDate,
          order,
          status: "todo",
        })
        .returning();

      // Fetch complete card with user info
      const [completeCard] = await db
        .select({
          ...getTableColumns(kanbanCardsTable),
        })
        .from(kanbanCardsTable)
        .where(eq(kanbanCardsTable.id, card.id))
        .limit(1);

      const safeCard = {
        ...completeCard,
        members: [],
      };

      const response: CardResponse = {
        card: safeCard,
      };

      return c.json(response, 201);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error("Create card error:", error);
      throw new AuthException("Failed to create card", 500);
    }
  },
);

cardsRoutes.patch(
  "/:id/move",
  requireAuth(),
  validator("json", (value: unknown, c) => {
    const body = value as { columnId: string; order: number };

    if (!body.columnId?.trim()) {
      return c.json({ error: "Column ID is required" }, 400);
    }

    if (typeof body.order !== "number" || body.order < 0) {
      return c.json({ error: "Order must be a non-negative number" }, 400);
    }

    return body;
  }),
  async (c) => {
    try {
      const id = c.req.param("id");
      const { columnId, order: newOrder } = c.req.valid("json") as {
        columnId: string;
        order: number;
      };

      // Get the card being moved
      const [existingCard] = await db
        .select()
        .from(kanbanCardsTable)
        .where(eq(kanbanCardsTable.id, id))
        .limit(1);

      if (!existingCard) {
        throw new AuthException("Card not found", 404);
      }

      const oldColumnId = existingCard.columnId;
      const oldOrder = existingCard.order;

      await db.transaction(async (tx) => {
        if (oldColumnId === columnId) {
          if (oldOrder === newOrder) {
            return;
          }

          const cardsInColumn = await tx
            .select()
            .from(kanbanCardsTable)
            .where(eq(kanbanCardsTable.columnId, columnId))
            .orderBy(kanbanCardsTable.order);

          const otherCards = cardsInColumn.filter((c) => c.id !== id);
          otherCards.splice(newOrder, 0, existingCard);

          for (let i = 0; i < otherCards.length; i++) {
            await tx
              .update(kanbanCardsTable)
              .set({ order: i })
              .where(eq(kanbanCardsTable.id, otherCards[i].id));
          }
        }
        // Case 2: Moving to a different column
        else {
          // Move card to new column
          await tx
            .update(kanbanCardsTable)
            .set({
              columnId: columnId,
              order: newOrder,
            })
            .where(eq(kanbanCardsTable.id, id));

          // Get all cards in the OLD column (excluding the moved card)
          const cardsInOldColumn = await tx
            .select()
            .from(kanbanCardsTable)
            .where(eq(kanbanCardsTable.columnId, oldColumnId))
            .orderBy(kanbanCardsTable.order);

          // Reorder cards in the old column
          for (let i = 0; i < cardsInOldColumn.length; i++) {
            await tx
              .update(kanbanCardsTable)
              .set({ order: i })
              .where(eq(kanbanCardsTable.id, cardsInOldColumn[i].id));
          }

          // Get all cards in the NEW column
          const cardsInNewColumn = await tx
            .select()
            .from(kanbanCardsTable)
            .where(eq(kanbanCardsTable.columnId, columnId))
            .orderBy(kanbanCardsTable.order);

          // Reorder cards in the new column
          for (let i = 0; i < cardsInNewColumn.length; i++) {
            await tx
              .update(kanbanCardsTable)
              .set({ order: i })
              .where(eq(kanbanCardsTable.id, cardsInNewColumn[i].id));
          }
        }
      });

      const [updatedCard] = await db
        .select()
        .from(kanbanCardsTable)
        .where(eq(kanbanCardsTable.id, id))
        .limit(1);

      // Get all members for this card
      const members = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          avatar: usersTable.avatar,
          status: usersTable.status,
          isAdmin: usersTable.isAdmin,
          createdAt: usersTable.createdAt,
        })
        .from(cardsToMembersTable)
        .leftJoin(usersTable, eq(cardsToMembersTable.userId, usersTable.id))
        .where(eq(cardsToMembersTable.cardId, id));

      const safeMembers = members.map((member) =>
        createSafeUser({
          id: member.id as string,
          name: member.name as string,
          email: member.email as string,
          passwordHash: "",
          avatar: member.avatar as string | null,
          status: member.status as string,
          isAdmin: member.isAdmin as boolean,
          createdAt: member.createdAt as Date,
          updatedAt: member.createdAt as Date,
          lastLoginAt: null,
          emailVerifiedAt: null,
        }),
      );

      const safeCard = {
        ...updatedCard,
        members: safeMembers,
      };

      return c.json({ card: safeCard });
    } catch (error) {
      console.error("Move card error:", error);
      if (error instanceof AuthException) {
        throw error;
      }
      throw new AuthException(
        "Failed to move card: " +
          (error instanceof Error ? error.message : "Unknown error"),
        500,
      );
    }
  },
);

// Update card
cardsRoutes.put(
  "/:id",
  requireAuth(),
  validator("json", (value: unknown, c) => {
    const body = value as UpdateCardRequest;

    if (body.title !== undefined && !body.title.trim()) {
      return c.json({ error: "Title cannot be empty" } as ErrorResponse, 400);
    }

    if (body.title && body.title.length > 200) {
      return c.json(
        { error: "Title must be less than 200 characters" } as ErrorResponse,
        400,
      );
    }

    if (body.description && body.description.length > 2000) {
      return c.json(
        {
          error: "Description must be less than 2000 characters",
        } as ErrorResponse,
        400,
      );
    }

    return body;
  }),
  async (c) => {
    try {
      const id = c.req.param("id");
      const updateData = c.req.valid("json") as UpdateCardRequest;
      const currentUser = c.get("user");

      const [existingCard] = await db
        .select()
        .from(kanbanCardsTable)
        .where(eq(kanbanCardsTable.id, id))
        .limit(1);

      if (!existingCard) {
        throw new AuthException("Card not found", 404);
      }

      const isMember = await db
        .select()
        .from(cardsToMembersTable)
        .where(
          and(
            eq(cardsToMembersTable.cardId, id),
            eq(cardsToMembersTable.userId, currentUser.id),
          ),
        )
        .limit(1);

      if (
        !currentUser.isAdmin &&
        existingCard.reporterId !== currentUser.id &&
        isMember.length === 0
      ) {
        throw new AuthException(
          "Forbidden: You can only update cards you created or are a member of",
          403,
        );
      }

      const dbUpdateData: DatabaseUpdateCardRequest = {};

      if (updateData.title !== undefined) {
        dbUpdateData.title = updateData.title.trim();
      }

      if (updateData.description !== undefined) {
        dbUpdateData.description = updateData.description?.trim() || null;
      }

      if (updateData.columnId !== undefined) {
        const [column] = await db
          .select()
          .from(kanbanColumnsTable)
          .where(eq(kanbanColumnsTable.id, updateData.columnId))
          .limit(1);
        if (!column) {
          throw new AuthException("Column not found", 404);
        }
        dbUpdateData.columnId = updateData.columnId;
      }

      if (updateData.priorityId !== undefined) {
        dbUpdateData.priorityId = updateData.priorityId;
      }

      if (updateData.dueDate !== undefined) {
        if (updateData.dueDate) {
          const parsedDueDate = new Date(updateData.dueDate);
          if (Number.isNaN(parsedDueDate.getTime())) {
            throw new AuthException("Invalid due date format", 400);
          }
          dbUpdateData.dueDate = parsedDueDate;
        } else {
          dbUpdateData.dueDate = null;
        }
      }

      if (updateData.order !== undefined) {
        dbUpdateData.order = updateData.order;
      }

      if (updateData.status !== undefined) {
        dbUpdateData.status = updateData.status;
      }

      if (updateData.estimatedHours !== undefined) {
        dbUpdateData.estimatedHours = updateData.estimatedHours;
      }

      if (updateData.actualHours !== undefined) {
        dbUpdateData.actualHours = updateData.actualHours;
      }

      // Update card
      const [updatedCard] = await db
        .update(kanbanCardsTable)
        .set(dbUpdateData)
        .where(eq(kanbanCardsTable.id, id))
        .returning();

      // Get all members for this card
      const members = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          avatar: usersTable.avatar,
          status: usersTable.status,
          isAdmin: usersTable.isAdmin,
          createdAt: usersTable.createdAt,
        })
        .from(cardsToMembersTable)
        .leftJoin(usersTable, eq(cardsToMembersTable.userId, usersTable.id))
        .where(eq(cardsToMembersTable.cardId, id));

      const safeMembers = members.map((member) =>
        createSafeUser({
          id: member.id as string,
          name: member.name as string,
          email: member.email as string,
          passwordHash: "",
          avatar: member.avatar as string | null,
          status: member.status as string,
          isAdmin: member.isAdmin as boolean,
          createdAt: member.createdAt as Date,
          updatedAt: member.createdAt as Date,
          lastLoginAt: null,
          emailVerifiedAt: null,
        }),
      );

      const safeCard = {
        ...updatedCard,
        members: safeMembers,
      };

      return c.json(safeCard);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error("Update card error:", error);
      throw new AuthException("Failed to update card", 500);
    }
  },
);

// Delete card
cardsRoutes.delete("/:id", requireAuth(), async (c) => {
  try {
    const id = c.req.param("id");
    const currentUser = c.get("user");

    // Check if card exists
    const [existingCard] = await db
      .select()
      .from(kanbanCardsTable)
      .where(eq(kanbanCardsTable.id, id))
      .limit(1);

    if (!existingCard) {
      throw new AuthException("Card not found", 404);
    }

    // Check if user is a member of the card
    const isMember = await db
      .select()
      .from(cardsToMembersTable)
      .where(
        and(
          eq(cardsToMembersTable.cardId, id),
          eq(cardsToMembersTable.userId, currentUser.id),
        ),
      )
      .limit(1);

    // Users can delete cards they reported or are members of, admins can delete any
    if (
      !currentUser.isAdmin &&
      existingCard.reporterId !== currentUser.id &&
      isMember.length === 0
    ) {
      throw new AuthException(
        "Forbidden: You can only delete cards you created or are a member of",
        403,
      );
    }

    // Delete card (cascade will handle related records)
    await db.delete(kanbanCardsTable).where(eq(kanbanCardsTable.id, id));

    const response: MessageResponse = {
      message: "Card deleted successfully",
      success: true,
    };

    return c.json(response);
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }

    console.error("Delete card error:", error);
    throw new AuthException("Failed to delete card", 500);
  }
});

// Add label to card
cardsRoutes.post("/:cardId/labels/:labelId", requireAuth(), async (c) => {
  try {
    const cardId = c.req.param("cardId");
    const labelId = c.req.param("labelId");
    // const currentUser = c.get('user'); // Unused for now

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
cardsRoutes.delete("/:cardId/labels/:labelId", requireAuth(), async (c) => {
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

// Get card labels
cardsRoutes.get("/:id/labels", requireAuth(), async (c) => {
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

// Global error handler for cards routes
cardsRoutes.onError((err, c) => {
  if (err instanceof AuthException) {
    return c.json({ error: err.message }, err.status);
  }

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  console.error("Unhandled cards error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

cardsRoutes.get("/:cardId/todos", requireAuth(), async (c) => {
  try {
    const cardId = c.req.param("cardId");

    // Verify card exists
    const [card] = await db
      .select()
      .from(kanbanCardsTable)
      .where(eq(kanbanCardsTable.id, cardId))
      .limit(1);

    if (!card) {
      throw new AuthException("Card not found", 404);
    }

    const todos = await db
      .select()
      .from(cardTodosTable)
      .where(eq(cardTodosTable.cardId, cardId))
      .orderBy(cardTodosTable.order);

    return c.json({ todos });
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }
    console.error("Get card todos error:", error);
    throw new AuthException("Failed to fetch card todos", 500);
  }
});

cardsRoutes.post(
  "/:cardId/todos",
  requireAuth(),
  validator("json", (value: unknown, c) => {
    const body = value as { title: string; order?: number };

    if (!body.title?.trim()) {
      return c.json({ error: "Todo title is required" }, 400);
    }

    if (body.title.length > 500) {
      return c.json(
        { error: "Todo title must be less than 500 characters" },
        400,
      );
    }

    return body;
  }),
  async (c) => {
    try {
      const cardId = c.req.param("cardId");
      const { title, order = 0 } = c.req.valid("json") as {
        title: string;
        order?: number;
      };

      // Verify card exists
      const [card] = await db
        .select()
        .from(kanbanCardsTable)
        .where(eq(kanbanCardsTable.id, cardId))
        .limit(1);

      if (!card) {
        throw new AuthException("Card not found", 404);
      }

      // Create the todo
      const [todo] = await db
        .insert(cardTodosTable)
        .values({
          cardId,
          title: title.trim(),
          order,
          isCompleted: false,
        })
        .returning();

      return c.json({ todo }, 201);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }
      console.error("Create card todo error:", error);
      throw new AuthException("Failed to create card todo", 500);
    }
  },
);

cardsRoutes.put("/todos/:todoId", requireAuth(), async (c) => {
  try {
    const todoId = c.req.param("todoId");
    const todoData = (await c.req.json()) as Partial<CardTodo>;

    // Verify todo exists
    const [existingTodo] = await db
      .select()
      .from(cardTodosTable)
      .where(eq(cardTodosTable.id, todoId))
      .limit(1);

    if (!existingTodo) {
      throw new AuthException("Todo not found", 404);
    }

    // Update the todo
    const [updatedTodo] = await db
      .update(cardTodosTable)
      .set({
        ...todoData,
        updatedAt: new Date(),
      })
      .where(eq(cardTodosTable.id, todoId))
      .returning();

    return c.json({ todo: updatedTodo });
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }
    console.error("Update card todo error:", error);
    throw new AuthException("Failed to update card todo", 500);
  }
});

cardsRoutes.delete("/todos/:todoId", requireAuth(), async (c) => {
  try {
    const todoId = c.req.param("todoId");

    // Verify todo exists
    const [existingTodo] = await db
      .select()
      .from(cardTodosTable)
      .where(eq(cardTodosTable.id, todoId))
      .limit(1);

    if (!existingTodo) {
      throw new AuthException("Todo not found", 404);
    }

    // Delete the todo
    await db.delete(cardTodosTable).where(eq(cardTodosTable.id, todoId));

    const response: MessageResponse = {
      message: "Todo deleted successfully",
      success: true,
    };

    return c.json(response);
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }
    console.error("Delete card todo error:", error);
    throw new AuthException("Failed to delete card todo", 500);
  }
});

cardsRoutes.get("/:cardId/members", requireAuth(), async (c) => {
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

cardsRoutes.post("/:cardId/members/:userId", requireAuth(), async (c) => {
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

cardsRoutes.delete("/:cardId/members/:userId", requireAuth(), async (c) => {
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

cardsRoutes.get("/:cardId/attachments", requireAuth(), async (c) => {
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

    const attachments = await db
      .select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.cardId, cardId))
      .orderBy(attachmentsTable.createdAt);

    return c.json({ attachments });
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }
    console.error("Get card attachments error:", error);
    throw new AuthException("Failed to fetch card attachments", 500);
  }
});

cardsRoutes.post("/:cardId/attachments", requireAuth(), async (c) => {
  try {
    const cardId = c.req.param("cardId");
    const currentUser = c.get("user");

    const [card] = await db
      .select()
      .from(kanbanCardsTable)
      .where(eq(kanbanCardsTable.id, cardId))
      .limit(1);

    if (!card) {
      throw new AuthException("Card not found", 404);
    }

    const attachmentData = (await c.req.json()) as {
      url: string;
      filename: string;
      filetype?: string;
      filesize: number;
    };

    const [attachment] = await db
      .insert(attachmentsTable)
      .values({
        cardId,
        url: attachmentData.url,
        filename: attachmentData.filename,
        filetype: attachmentData.filetype,
        filesize: attachmentData.filesize,
        uploadedBy: currentUser.id,
      })
      .returning();

    return c.json({ attachment }, 201);
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }
    console.error("Add card attachment error:", error);
    throw new AuthException("Failed to add card attachment", 500);
  }
});

cardsRoutes.delete("/attachments/:attachmentId", requireAuth(), async (c) => {
  try {
    const attachmentId = c.req.param("attachmentId");
    const currentUser = c.get("user");

    const [attachment] = await db
      .select({
        id: attachmentsTable.id,
        uploadedBy: attachmentsTable.uploadedBy,
        cardId: attachmentsTable.cardId,
      })
      .from(attachmentsTable)
      .where(eq(attachmentsTable.id, attachmentId))
      .limit(1);

    if (!attachment) {
      throw new AuthException("Attachment not found", 404);
    }

    if (!currentUser.isAdmin && attachment.uploadedBy !== currentUser.id) {
      throw new AuthException(
        "Forbidden: You can only delete attachments you uploaded",
        403,
      );
    }

    await db
      .delete(attachmentsTable)
      .where(eq(attachmentsTable.id, attachmentId));

    const response: MessageResponse = {
      message: "Attachment deleted successfully",
      success: true,
    };

    return c.json(response);
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }
    console.error("Delete attachment error:", error);
    throw new AuthException("Failed to delete attachment", 500);
  }
});

cardsRoutes.get("/:cardId/labels", requireAuth(), async (c) => {
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

    const labels = await db
      .select({
        id: labelsTable.id,
        name: labelsTable.name,
        color: labelsTable.color,
        description: labelsTable.description,
        createdAt: labelsTable.createdAt,
        updatedAt: labelsTable.updatedAt,
      })
      .from(cardsToLabelsTable)
      .leftJoin(labelsTable, eq(cardsToLabelsTable.labelId, labelsTable.id))
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

cardsRoutes.post("/:cardId/labels/:labelId", requireAuth(), async (c) => {
  try {
    const cardId = c.req.param("cardId");
    const labelId = c.req.param("labelId");

    const [card] = await db
      .select()
      .from(kanbanCardsTable)
      .where(eq(kanbanCardsTable.id, cardId))
      .limit(1);

    if (!card) {
      throw new AuthException("Card not found", 404);
    }

    const [label] = await db
      .select()
      .from(labelsTable)
      .where(eq(labelsTable.id, labelId))
      .limit(1);

    if (!label) {
      throw new AuthException("Label not found", 404);
    }

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
      return c.json({ message: "Label already assigned to card" }, 200);
    }

    const [cardLabel] = await db
      .insert(cardsToLabelsTable)
      .values({
        cardId,
        labelId,
      })
      .returning();

    return c.json({ cardLabel }, 201);
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }
    console.error("Add card label error:", error);
    throw new AuthException("Failed to add card label", 500);
  }
});

cardsRoutes.delete("/:cardId/labels/:labelId", requireAuth(), async (c) => {
  try {
    const cardId = c.req.param("cardId");
    const labelId = c.req.param("labelId");

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
    console.error("Remove card label error:", error);
    throw new AuthException("Failed to remove card label", 500);
  }
});
