import { Hono } from 'hono';
import { db } from '../index';
import { labelsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const labelsRoutes = new Hono();

labelsRoutes.get('/', async (c) => {
  const labels = await db.select().from(labelsTable);
  return c.json({ labels });
});

labelsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [label] = await db.select().from(labelsTable).where(eq(labelsTable.id, id));
  return c.json({ label });
});

labelsRoutes.post('/', async (c) => {
  const { name, color } = await c.req.json();
  const [label] = await db.insert(labelsTable).values({ name, color }).returning();
  return c.json({ label });
});

labelsRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const { name, color } = await c.req.json();
  const [label] = await db.update(labelsTable).set({ name, color }).where(eq(labelsTable.id, id)).returning();
  return c.json({ label });
});

labelsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await db.delete(labelsTable).where(eq(labelsTable.id, id));
  return c.json({ success: true });
});
