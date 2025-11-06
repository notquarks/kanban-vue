import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';
import { eq, and, desc, count, getTableColumns } from 'drizzle-orm';
import { db } from '../index';
import { kanbanCardsTable, cardsToLabelsTable, labelsTable, usersTable, kanbanColumnsTable } from '../db/schema';
import {
  type AuthVariables,
  type SafeUser,
  createSafeUser,
  requireAuth,
  AuthException
} from '../middleware/auth';

// Type definitions for request bodies
interface CreateCardRequest {
  title: string;
  description?: string;
  columnId: string;
  assigneeId?: string;
  priorityId: number;
  dueDate?: string;
  order?: number;
}

interface UpdateCardRequest {
  title?: string;
  description?: string;
  columnId?: string;
  assigneeId?: string;
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
  assigneeId?: string | null;
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
    assignee?: SafeUser;
  };
}

interface CardsResponse {
  cards: Array<typeof kanbanCardsTable.$inferSelect & {
    assignee?: SafeUser;
  }>;
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

// Create cards router with proper typing
export const cardsRoutes = new Hono<{ Variables: AuthVariables }>();

// Get all cards with optional filtering and pagination
cardsRoutes.get(
  '/',
  requireAuth(),
  async (c) => {
    try {
      // const currentUser = c.get('user'); // Unused for now
      const page = Number(c.req.query('page') || '1');
      const limit = Number(c.req.query('limit') || '20');
      const columnId = c.req.query('columnId');
      const assigneeId = c.req.query('assigneeId');
      const priorityId = c.req.query('priorityId');
      const status = c.req.query('status');

      // Build conditions
      const conditions: Array<ReturnType<typeof eq>> = [];
      if (columnId) {
        conditions.push(eq(kanbanCardsTable.columnId, columnId));
      }
      if (assigneeId) {
        conditions.push(eq(kanbanCardsTable.assigneeId, assigneeId));
      }
      if (priorityId) {
        conditions.push(eq(kanbanCardsTable.priorityId, Number(priorityId)));
      }
      if (status) {
        conditions.push(eq(kanbanCardsTable.status, status));
      }

      // Apply ordering and pagination
      const offset = (page - 1) * limit;

      const query = db
        .select({
          ...getTableColumns(kanbanCardsTable),
          assignee: usersTable,
        })
        .from(kanbanCardsTable)
        .leftJoin(usersTable, eq(kanbanCardsTable.assigneeId, usersTable.id));

      if (conditions.length > 0) {
        query.where(and(...conditions));
      }

      const cards = await query
        .orderBy(desc(kanbanCardsTable.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalResult = await db.select({ count: count() }).from(kanbanCardsTable);
      const totalCards = totalResult[0]?.count || 0;

      const safeCards = cards.map((cardItem: any) => ({
        ...cardItem,
        assignee: cardItem.assignee ? createSafeUser({
          id: cardItem.assignee.id,
          name: cardItem.assignee.name,
          email: cardItem.assignee.email,
          passwordHash: '',
          isAdmin: cardItem.assignee.isAdmin,
          avatar: cardItem.assignee.avatar,
          status: cardItem.assignee.status,
          lastLoginAt: null,
          emailVerifiedAt: null,
          createdAt: cardItem.assignee.createdAt,
          updatedAt: cardItem.assignee.createdAt
        }) : undefined,
      }));

      const response: CardsResponse = {
        cards: safeCards,
        total: totalCards,
        page: page,
        limit: limit,
      };

      return c.json(response);
    } catch (error) {
      console.error('Get cards error:', error);
      throw new AuthException('Failed to fetch cards', 500);
    }
  }
);

// Get card by ID
cardsRoutes.get(
  '/:id',
  requireAuth(),
  async (c) => {
    try {
      const id = c.req.param('id');

      const [card] = await db
        .select({
          ...getTableColumns(kanbanCardsTable),
          assignee: usersTable,
          labels: labelsTable,
        })
        .from(kanbanCardsTable)
        .leftJoin(usersTable, eq(kanbanCardsTable.assigneeId, usersTable.id))
        .leftJoin(cardsToLabelsTable, eq(kanbanCardsTable.id, cardsToLabelsTable.cardId))
        .leftJoin(labelsTable, eq(cardsToLabelsTable.labelId, labelsTable.id))
        .where(eq(kanbanCardsTable.id, id))
        .limit(1);

      if (!card) {
        throw new AuthException('Card not found', 404);
      }

      const response: CardResponse = {
        card: {
          ...card,
          assignee: card.assignee ? createSafeUser({
            id: (card.assignee as any).id,
            name: (card.assignee as any).name,
            email: (card.assignee as any).email,
            passwordHash: '',
            isAdmin: (card.assignee as any).isAdmin,
            avatar: (card.assignee as any).avatar,
            status: (card.assignee as any).status,
            lastLoginAt: null,
            emailVerifiedAt: null,
            createdAt: (card.assignee as any).createdAt,
            updatedAt: (card.assignee as any).createdAt
          }) : undefined,
        },
      };

      return c.json(response);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('Get card error:', error);
      throw new AuthException('Failed to fetch card', 500);
    }
  }
);

// Create new card
cardsRoutes.post(
  '/',
  requireAuth(),
  validator('json', (value: unknown, c) => {
    const body = value as CreateCardRequest;

    if (!body.title?.trim()) {
      return c.json({ error: 'Title is required' } as ErrorResponse, 400);
    }

    if (!body.columnId?.trim()) {
      return c.json({ error: 'Column ID is required' } as ErrorResponse, 400);
    }

    if (!body.priorityId) {
      return c.json({ error: 'Priority ID is required' } as ErrorResponse, 400);
    }

    if (body.title.length > 200) {
      return c.json({ error: 'Title must be less than 200 characters' } as ErrorResponse, 400);
    }

    if (body.description && body.description.length > 2000) {
      return c.json({ error: 'Description must be less than 2000 characters' } as ErrorResponse, 400);
    }

    return body;
  }),
  async (c) => {
    try {
      const { title, description, columnId, assigneeId, priorityId, dueDate, order = 0 } = c.req.valid('json') as CreateCardRequest;
      const currentUser = c.get('user');

      // Verify column exists (optional but good practice)
      const [column] = await db.select().from(kanbanColumnsTable).where(eq(kanbanColumnsTable.id, columnId)).limit(1);
      if (!column) {
        throw new AuthException('Column not found', 404);
      }

      let parsedDueDate: Date | undefined;
      if (dueDate) {
        parsedDueDate = new Date(dueDate);
        if (Number.isNaN(parsedDueDate.getTime())) {
          throw new AuthException('Invalid due date format', 400);
        }
      }

      // Create card
      const [card] = await db
        .insert(kanbanCardsTable)
        .values({
          title: title.trim(),
          description: description?.trim() || null,
          columnId,
          assigneeId: assigneeId || null,
          reporterId: currentUser.id,
          priorityId,
          dueDate: parsedDueDate,
          order,
          status: 'todo',
        })
        .returning();

      // Fetch complete card with user info
      const [completeCard] = await db
        .select({
          ...getTableColumns(kanbanCardsTable),
          assignee: {
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            avatar: usersTable.avatar,
            status: usersTable.status,
            isAdmin: usersTable.isAdmin,
            createdAt: usersTable.createdAt,
          },
        })
        .from(kanbanCardsTable)
        .leftJoin(usersTable, eq(kanbanCardsTable.assigneeId, usersTable.id))
        .where(eq(kanbanCardsTable.id, card.id))
        .limit(1);

      const safeCard = {
        ...completeCard,
        assignee: completeCard.assignee ? createSafeUser({
          id: (completeCard.assignee as any).id,
          name: (completeCard.assignee as any).name,
          email: (completeCard.assignee as any).email,
          passwordHash: '',
          isAdmin: (completeCard.assignee as any).isAdmin,
          avatar: (completeCard.assignee as any).avatar,
          status: (completeCard.assignee as any).status,
          lastLoginAt: null,
          emailVerifiedAt: null,
          createdAt: (completeCard.assignee as any).createdAt,
          updatedAt: (completeCard.assignee as any).createdAt
        }) : undefined,
      };

      const response: CardResponse = {
        card: safeCard,
      };

      return c.json(response, 201);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('Create card error:', error);
      throw new AuthException('Failed to create card', 500);
    }
  }
);

// Update card
cardsRoutes.put(
  '/:id',
  requireAuth(),
  validator('json', (value: unknown, c) => {
    const body = value as UpdateCardRequest;

    if (body.title !== undefined) {
      if (!body.title?.trim()) {
        return c.json({ error: 'Title cannot be empty' } as ErrorResponse, 400);
      }
      if (body.title.length > 200) {
        return c.json({ error: 'Title must be less than 200 characters' } as ErrorResponse, 400);
      }
    }

    if (body.description !== undefined && body.description && body.description.length > 2000) {
      return c.json({ error: 'Description must be less than 2000 characters' } as ErrorResponse, 400);
    }

    if (body.status !== undefined) {
      const validStatuses = ['todo', 'in_progress', 'review', 'done'];
      if (!validStatuses.includes(body.status)) {
        return c.json({ error: 'Invalid status' } as ErrorResponse, 400);
      }
    }

    if (body.dueDate !== undefined && body.dueDate) {
      const parsedDate = new Date(body.dueDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return c.json({ error: 'Invalid due date format' } as ErrorResponse, 400);
      }
    }

    return body;
  }),
  async (c) => {
    try {
      const id = c.req.param('id');
      const updateData = c.req.valid('json') as UpdateCardRequest;
      // const currentUser = c.get('user'); // Unused for now

      // Check if card exists
      const [existingCard] = await db
        .select()
        .from(kanbanCardsTable)
        .where(eq(kanbanCardsTable.id, id))
        .limit(1);

      if (!existingCard) {
        throw new AuthException('Card not found', 404);
      }

      // Prepare database update data
      const dbUpdateData: DatabaseUpdateCardRequest = {};

      // Parse due date if provided
      if (updateData.dueDate !== undefined) {
        dbUpdateData.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
      }

      // Clean up data
      if (updateData.title !== undefined) {
        dbUpdateData.title = updateData.title.trim();
      }
      if (updateData.description !== undefined) {
        dbUpdateData.description = updateData.description?.trim() || null;
      }
      if (updateData.columnId !== undefined) {
        dbUpdateData.columnId = updateData.columnId;
      }
      if (updateData.assigneeId !== undefined) {
        dbUpdateData.assigneeId = updateData.assigneeId || null;
      }
      if (updateData.priorityId !== undefined) {
        dbUpdateData.priorityId = updateData.priorityId;
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

      // Fetch complete card with user info
      const [completeCard] = await db
        .select({
          ...getTableColumns(kanbanCardsTable),
          assignee: {
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            avatar: usersTable.avatar,
            status: usersTable.status,
            isAdmin: usersTable.isAdmin,
            createdAt: usersTable.createdAt,
          },
        })
        .from(kanbanCardsTable)
        .leftJoin(usersTable, eq(kanbanCardsTable.assigneeId, usersTable.id))
        .where(eq(kanbanCardsTable.id, updatedCard.id))
        .limit(1);

      const safeCard = {
        ...completeCard,
        assignee: completeCard.assignee ? createSafeUser({
          id: (completeCard.assignee as any).id,
          name: (completeCard.assignee as any).name,
          email: (completeCard.assignee as any).email,
          passwordHash: '',
          isAdmin: (completeCard.assignee as any).isAdmin,
          avatar: (completeCard.assignee as any).avatar,
          status: (completeCard.assignee as any).status,
          lastLoginAt: null,
          emailVerifiedAt: null,
          createdAt: (completeCard.assignee as any).createdAt,
          updatedAt: (completeCard.assignee as any).createdAt
        }) : undefined,
      };

      const response: CardResponse = {
        card: safeCard,
      };

      return c.json(response);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('Update card error:', error);
      throw new AuthException('Failed to update card', 500);
    }
  }
);

// Delete card
cardsRoutes.delete(
  '/:id',
  requireAuth(),
  async (c) => {
    try {
      const id = c.req.param('id');
      const currentUser = c.get('user');

      // Check if card exists
      const [existingCard] = await db
        .select()
        .from(kanbanCardsTable)
        .where(eq(kanbanCardsTable.id, id))
        .limit(1);

      if (!existingCard) {
        throw new AuthException('Card not found', 404);
      }

      // Users can delete cards they reported or are assigned to, admins can delete any
      if (!currentUser.isAdmin && existingCard.reporterId !== currentUser.id && existingCard.assigneeId !== currentUser.id) {
        throw new AuthException('Forbidden: You can only delete cards you created or are assigned to', 403);
      }

      // Delete card (cascade will handle related records)
      await db.delete(kanbanCardsTable).where(eq(kanbanCardsTable.id, id));

      const response: MessageResponse = {
        message: 'Card deleted successfully',
        success: true,
      };

      return c.json(response);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('Delete card error:', error);
      throw new AuthException('Failed to delete card', 500);
    }
  }
);

// Add label to card
cardsRoutes.post(
  '/:cardId/labels/:labelId',
  requireAuth(),
  async (c) => {
    try {
      const cardId = c.req.param('cardId');
      const labelId = c.req.param('labelId');
      // const currentUser = c.get('user'); // Unused for now

      // Verify card exists
      const [card] = await db.select().from(kanbanCardsTable).where(eq(kanbanCardsTable.id, cardId)).limit(1);
      if (!card) {
        throw new AuthException('Card not found', 404);
      }

      // Verify label exists
      const [label] = await db.select().from(labelsTable).where(eq(labelsTable.id, labelId)).limit(1);
      if (!label) {
        throw new AuthException('Label not found', 404);
      }

      // Check if association already exists
      const [existing] = await db
        .select()
        .from(cardsToLabelsTable)
        .where(and(eq(cardsToLabelsTable.cardId, cardId), eq(cardsToLabelsTable.labelId, labelId)))
        .limit(1);

      if (existing) {
        throw new AuthException('Label already added to card', 409);
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

      console.error('Add label to card error:', error);
      throw new AuthException('Failed to add label to card', 500);
    }
  }
);

// Remove label from card
cardsRoutes.delete(
  '/:cardId/labels/:labelId',
  requireAuth(),
  async (c) => {
    try {
      const cardId = c.req.param('cardId');
      const labelId = c.req.param('labelId');

      // Verify card exists
      const [card] = await db.select().from(kanbanCardsTable).where(eq(kanbanCardsTable.id, cardId)).limit(1);
      if (!card) {
        throw new AuthException('Card not found', 404);
      }

      // Remove label from card
      await db
        .delete(cardsToLabelsTable)
        .where(and(eq(cardsToLabelsTable.cardId, cardId), eq(cardsToLabelsTable.labelId, labelId)));

      const response: MessageResponse = {
        message: 'Label removed from card successfully',
        success: true,
      };

      return c.json(response);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('Remove label from card error:', error);
      throw new AuthException('Failed to remove label from card', 500);
    }
  }
);

// Get card labels
cardsRoutes.get(
  '/:id/labels',
  requireAuth(),
  async (c) => {
    try {
      const cardId = c.req.param('id');

      // Verify card exists
      const [card] = await db.select().from(kanbanCardsTable).where(eq(kanbanCardsTable.id, cardId)).limit(1);
      if (!card) {
        throw new AuthException('Card not found', 404);
      }

      const labels = await db
        .select({
          id: labelsTable.id,
          name: labelsTable.name,
          color: labelsTable.color,
          description: labelsTable.description,
        })
        .from(labelsTable)
        .innerJoin(cardsToLabelsTable, eq(labelsTable.id, cardsToLabelsTable.labelId))
        .where(eq(cardsToLabelsTable.cardId, cardId));

      return c.json({ labels });
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('Get card labels error:', error);
      throw new AuthException('Failed to fetch card labels', 500);
    }
  }
);

// Global error handler for cards routes
cardsRoutes.onError((err, c) => {
  if (err instanceof AuthException) {
    return c.json({ error: err.message }, err.status);
  }

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  console.error('Unhandled cards error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});
