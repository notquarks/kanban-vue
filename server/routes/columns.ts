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
