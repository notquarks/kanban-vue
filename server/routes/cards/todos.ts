import { Hono } from "hono";
import { validator } from "hono/validator";
import { eq } from "drizzle-orm";
import { db } from "../../index";
import { kanbanCardsTable, cardTodosTable } from "../../db/schema";
import {
  type AuthVariables,
  requireAuth,
  AuthException,
} from "../../middleware/auth";
import type { CardTodo, MessageResponse } from "../../types/cards";

export const todosRoutes = new Hono<{ Variables: AuthVariables }>();

// Get all todos for a card
todosRoutes.get("/:cardId/todos", requireAuth(), async (c) => {
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

// Create a new todo
todosRoutes.post(
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

// Update a todo
todosRoutes.put("/todos/:todoId", requireAuth(), async (c) => {
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

// Delete a todo
todosRoutes.delete("/todos/:todoId", requireAuth(), async (c) => {
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
