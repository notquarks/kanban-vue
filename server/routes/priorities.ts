import { Hono } from 'hono';
import { db } from '../index';
import { prioritiesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const prioritiesRoutes = new Hono();

prioritiesRoutes.get('/', async (c) => {
  const priorities = await db.select().from(prioritiesTable).orderBy(prioritiesTable.level);
  return c.json({ priorities });
});

prioritiesRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const [priority] = await db.select().from(prioritiesTable).where(eq(prioritiesTable.id, id));
  return c.json({ priority });
});

prioritiesRoutes.post('/', async (c) => {
  const { name, level, color } = await c.req.json();
  const [priority] = await db.insert(prioritiesTable).values({ name, level, color }).returning();
  return c.json({ priority });
});

prioritiesRoutes.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const { name, level, color } = await c.req.json();
  const [priority] = await db.update(prioritiesTable).set({ name, level, color }).where(eq(prioritiesTable.id, id)).returning();
  return c.json({ priority });
});

prioritiesRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await db.delete(prioritiesTable).where(eq(prioritiesTable.id, id));
  return c.json({ success: true });
});
