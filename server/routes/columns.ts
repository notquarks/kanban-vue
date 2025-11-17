import { Hono } from 'hono';
import { db } from '../index';
import { kanbanColumnsTable, kanbanCardsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const columnsRoutes = new Hono();

columnsRoutes.get('/', async (c) => {
  const columns = await db.select().from(kanbanColumnsTable);
  return c.json({ columns });
});

columnsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [column] = await db.select().from(kanbanColumnsTable).where(eq(kanbanColumnsTable.id, id));
  return c.json({ column });
});

columnsRoutes.post('/', async (c) => {
  const { name, boardId, order } = await c.req.json();
  const [column] = await db.insert(kanbanColumnsTable).values({ name, boardId, order: order || 0 }).returning();
  return c.json({ column });
});

columnsRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const { name, order } = await c.req.json();
  const [column] = await db.update(kanbanColumnsTable).set({ name, order }).where(eq(kanbanColumnsTable.id, id)).returning();
  return c.json({ column });
});

columnsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await db.delete(kanbanColumnsTable).where(eq(kanbanColumnsTable.id, id));
  return c.json({ success: true });
});

columnsRoutes.get('/:id/cards', async (c) => {
  const columnId = c.req.param('id');
  const cards = await db.select().from(kanbanCardsTable).where(eq(kanbanCardsTable.columnId, columnId)).orderBy(kanbanCardsTable.order);
  return c.json({ cards });
});

columnsRoutes.patch('/:id/reorder', async (c) => {
  const columnId = c.req.param('id');
  const { boardId, newOrder } = await c.req.json();

  if (typeof newOrder !== 'number' || newOrder < 0) {
    return c.json({ error: 'Invalid order value' }, 400);
  }

  try {
    const [columnToMove] = await db
      .select()
      .from(kanbanColumnsTable)
      .where(eq(kanbanColumnsTable.id, columnId));

    if (!columnToMove) {
      return c.json({ error: 'Column not found' }, 404);
    }

    const oldOrder = columnToMove.order;

    const allColumns = await db
      .select()
      .from(kanbanColumnsTable)
      .where(eq(kanbanColumnsTable.boardId, boardId))
      .orderBy(kanbanColumnsTable.order);

    if (oldOrder < newOrder) {
      for (const col of allColumns) {
        if (col.id === columnId) continue;
        if (col.order > oldOrder && col.order <= newOrder) {
          await db
            .update(kanbanColumnsTable)
            .set({ order: col.order - 1 })
            .where(eq(kanbanColumnsTable.id, col.id));
        }
      }
    } else if (oldOrder > newOrder) {
      for (const col of allColumns) {
        if (col.id === columnId) continue;
        if (col.order >= newOrder && col.order < oldOrder) {
          await db
            .update(kanbanColumnsTable)
            .set({ order: col.order + 1 })
            .where(eq(kanbanColumnsTable.id, col.id));
        }
      }
    }

    const [updatedColumn] = await db
      .update(kanbanColumnsTable)
      .set({ order: newOrder })
      .where(eq(kanbanColumnsTable.id, columnId))
      .returning();

    return c.json({ column: updatedColumn });
  } catch (error) {
    console.error('Error reordering column:', error);
    return c.json({ error: 'Failed to reorder column' }, 500);
  }
});