import { Hono } from 'hono';
import { db } from '../index';
import { kanbanBoardsTable, kanbanColumnsTable, projectsTable, usersToTeamsTable } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { AuthVariables } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';

export const boardsRoutes = new Hono<{ Variables: AuthVariables }>();

// Helper function to check if user has access to a project
async function checkProjectAccess(userId: string, projectId: string) {
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (projects.length === 0) {
    return null;
  }

  const project = projects[0];

  // Check if user is the owner
  if (project.ownerId === userId) {
    return project;
  }

  // Check if user is a member of the project's team
  if (project.teamId) {
    const teamMemberships = await db
      .select()
      .from(usersToTeamsTable)
      .where(eq(usersToTeamsTable.teamId, project.teamId));

    const isTeamMember = teamMemberships.some(membership => membership.userId === userId);
    if (isTeamMember) {
      return project;
    }
  }

  return null;
}

// Helper function to check if user has access to a board via project access
async function checkBoardAccess(userId: string, boardId: string) {
  const boards = await db
    .select({ projectId: kanbanBoardsTable.projectId })
    .from(kanbanBoardsTable)
    .where(eq(kanbanBoardsTable.id, boardId));

  if (boards.length === 0) {
    return null;
  }

  const board = boards[0];
  return await checkProjectAccess(userId, board.projectId);
}

boardsRoutes.get('/', requireAuth(), async (c) => {
  const currentUser = c.get('user');
  
  // Get projects where user is owner
  const ownedProjects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.ownerId, currentUser.id));

  

  // Get team IDs the user belongs to
  const teamMemberships = await db
    .select()
    .from(usersToTeamsTable)
    .where(eq(usersToTeamsTable.userId, currentUser.id));

  const teamIds = teamMemberships.map(membership => membership.teamId);

  // Get project IDs the user has access to
  let teamProjects: typeof ownedProjects = [];
  if (teamIds.length > 0) {
    teamProjects = await db
      .select()
      .from(projectsTable)
      .where(inArray(projectsTable.teamId, teamIds));
  }

  // Combine and remove duplicates
  const allProjects = [...ownedProjects, ...teamProjects];
  const uniqueProjects = allProjects.filter((project, index, self) =>
    index === self.findIndex((p) => p.id === project.id)
  );

  const accessibleProjectIds = uniqueProjects.map(project => project.id);

  // Get boards for accessible projects
  let boards: Array<typeof kanbanBoardsTable.$inferSelect> = [];
  if (accessibleProjectIds.length > 0) {
    boards = await db
      .select()
      .from(kanbanBoardsTable)
      .where(inArray(kanbanBoardsTable.projectId, accessibleProjectIds));
  }
  if (accessibleProjectIds.length > 0) {
    boards = await db
      .select()
      .from(kanbanBoardsTable)
      .where(inArray(kanbanBoardsTable.projectId, accessibleProjectIds));
  }

  return c.json({ boards });
});

boardsRoutes.get('/:id', requireAuth(), async (c) => {
  const currentUser = c.get('user');
  const id = c.req.param('id');

  // Check if user has access to the board via project access
  const project = await checkBoardAccess(currentUser.id, id);
  
  if (!project) {
    return c.json({ error: 'Board not found or access denied' }, 404);
  }

  const [board] = await db
    .select()
    .from(kanbanBoardsTable)
    .where(eq(kanbanBoardsTable.id, id));

  return c.json({ board });
});

boardsRoutes.get('/project/:projectId', requireAuth(), async (c) => {
  const currentUser = c.get('user');
  const projectId = c.req.param('projectId');

  // Check if user has access to the project
  const project = await checkProjectAccess(currentUser.id, projectId);
  
  if (!project) {
    return c.json({ error: 'Project not found or access denied' }, 404);
  }

  const boards = await db
    .select()
    .from(kanbanBoardsTable)
    .where(eq(kanbanBoardsTable.projectId, projectId));

  return c.json({ boards });
});

boardsRoutes.post('/', requireAuth(), async (c) => {
  const currentUser = c.get('user');
  const { name, projectId } = await c.req.json();

  // Check if user has access to the project
  const project = await checkProjectAccess(currentUser.id, projectId);
  
  if (!project) {
    return c.json({ error: 'Project not found or access denied' }, 404);
  }

  const [board] = await db
    .insert(kanbanBoardsTable)
    .values({ name, projectId })
    .returning();

  return c.json({ board });
});

boardsRoutes.put('/:id', requireAuth(), async (c) => {
  const currentUser = c.get('user');
  const id = c.req.param('id');
  const { name } = await c.req.json();

  // Check if user has access to the board via project access
  const project = await checkBoardAccess(currentUser.id, id);
  
  if (!project) {
    return c.json({ error: 'Board not found or access denied' }, 404);
  }

  const [board] = await db
    .update(kanbanBoardsTable)
    .set({ name, updatedAt: new Date() })
    .where(eq(kanbanBoardsTable.id, id))
    .returning();

  return c.json({ board });
});

boardsRoutes.delete('/:id', requireAuth(), async (c) => {
  const currentUser = c.get('user');
  const id = c.req.param('id');

  // Check if user has access to the board via project access
  const project = await checkBoardAccess(currentUser.id, id);
  
  if (!project) {
    return c.json({ error: 'Board not found or access denied' }, 404);
  }

  await db
    .delete(kanbanBoardsTable)
    .where(eq(kanbanBoardsTable.id, id));

  return c.json({ success: true });
});

boardsRoutes.get('/:id/columns', requireAuth(), async (c) => {
  const currentUser = c.get('user');
  const boardId = c.req.param('id');

  // Check if user has access to the board via project access
  const project = await checkBoardAccess(currentUser.id, boardId);
  
  if (!project) {
    return c.json({ error: 'Board not found or access denied' }, 404);
  }

  const columns = await db
    .select()
    .from(kanbanColumnsTable)
    .where(eq(kanbanColumnsTable.boardId, boardId))
    .orderBy(kanbanColumnsTable.order);

  return c.json({ columns });
});
