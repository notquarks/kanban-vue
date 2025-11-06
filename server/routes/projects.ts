import { Hono } from 'hono';
import { db } from '../index';
import { projectsTable, usersToTeamsTable } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { AuthVariables } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';

export const projectsRoutes = new Hono<{ Variables: AuthVariables }>();

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

// GET /projects - List all projects user has access to
projectsRoutes.get('/', requireAuth(), async (c) => {
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

  // Get projects that belong to user's teams
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

  return c.json({ projects: uniqueProjects });
});

// POST /projects - Create a new project
projectsRoutes.post('/', requireAuth(), async (c) => {
  const currentUser = c.get('user');
  const { name, description, teamId } = await c.req.json();

  const [project] = await db
    .insert(projectsTable)
    .values({
      name,
      description,
      ownerId: currentUser.id, // Set current user as owner
      teamId
    })
    .returning();

  return c.json({ project });
});

// GET /projects/:id - Get a specific project
projectsRoutes.get('/:id', requireAuth(), async (c) => {
  const currentUser = c.get('user');
  const id = c.req.param('id');

  const project = await checkProjectAccess(currentUser.id, id);

  if (!project) {
    return c.json({ error: 'Project not found or access denied' }, 404);
  }

  return c.json({ project });
});

// PUT /projects/:id - Update a project
projectsRoutes.put('/:id', requireAuth(), async (c) => {
  const currentUser = c.get('user');
  const id = c.req.param('id');
  const { name, description, teamId } = await c.req.json();

  // Check if user has access to the project
  const project = await checkProjectAccess(currentUser.id, id);

  if (!project) {
    return c.json({ error: 'Project not found or access denied' }, 404);
  }

  // Only allow owner to update project details
  if (project.ownerId !== currentUser.id) {
    return c.json({ error: 'Only project owners can update projects' }, 403);
  }

  const [updatedProject] = await db
    .update(projectsTable)
    .set({
      name,
      description,
      teamId,
      updatedAt: new Date()
    })
    .where(eq(projectsTable.id, id))
    .returning();

  return c.json({ project: updatedProject });
});

// DELETE /projects/:id - Delete a project
projectsRoutes.delete('/:id', requireAuth(), async (c) => {
  const currentUser = c.get('user');
  const id = c.req.param('id');

  // Check if user has access to the project
  const project = await checkProjectAccess(currentUser.id, id);

  if (!project) {
    return c.json({ error: 'Project not found or access denied' }, 404);
  }

  // Only allow owner to delete project
  if (project.ownerId !== currentUser.id) {
    return c.json({ error: 'Only project owners can delete projects' }, 403);
  }

  await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, id));

  return c.json({ success: true });
});
