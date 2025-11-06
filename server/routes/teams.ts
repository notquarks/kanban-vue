import { Hono } from 'hono';
import { db } from '../index';
import { teamsTable, usersTable, usersToTeamsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const teamsRoutes = new Hono();

teamsRoutes.get('/', async (c) => {
  const teams = await db.select().from(teamsTable);
  return c.json({ teams });
});

teamsRoutes.post('/', async (c) => {
  const { name } = await c.req.json();
  const [team] = await db.insert(teamsTable).values({ name }).returning();
  return c.json({ team });
});

teamsRoutes.post('/:teamId/users/:userId', async (c) => {
  const teamId = c.req.param('teamId');
  const userId = c.req.param('userId');
  const [userTeam] = await db.insert(usersToTeamsTable).values({ userId, teamId }).returning();
  return c.json({ userTeam });
});

teamsRoutes.get('/:teamId/users', async (c) => {
  const teamId = c.req.param('teamId');
  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email
  })
    .from(usersTable)
    .innerJoin(usersToTeamsTable, eq(usersTable.id, usersToTeamsTable.userId))
    .where(eq(usersToTeamsTable.teamId, teamId));
  return c.json({ users });
});
