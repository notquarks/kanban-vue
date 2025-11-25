import { Hono } from "hono";
import { validator } from "hono/validator";
import { eq, and, desc, count, getTableColumns } from "drizzle-orm";
import { db } from "../../index";
import {
  kanbanCardsTable,
  cardsToLabelsTable,
  labelsTable,
  usersTable,
  kanbanColumnsTable,
  cardsToMembersTable,
} from "../../db/schema";
import {
  type AuthVariables,
  createSafeUser,
  requireAuth,
  AuthException,
} from "../../middleware/auth";
import type {
  CreateCardRequest,
  UpdateCardRequest,
  DatabaseUpdateCardRequest,
  CardResponse,
  CardsResponse,
  MessageResponse,
  ErrorResponse,
} from "../../types/cards";

export const crudRoutes = new Hono<{ Variables: AuthVariables }>();

// Get all cards with optional filtering and pagination
crudRoutes.get("/", requireAuth(), async (c) => {
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
crudRoutes.get("/:id", requireAuth(), async (c) => {
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
crudRoutes.post(
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

// Move card between columns or reorder
crudRoutes.patch(
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
crudRoutes.put(
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
crudRoutes.delete("/:id", requireAuth(), async (c) => {
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
