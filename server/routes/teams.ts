import { Hono } from "hono";
import { db } from "../index";
import {
  teamsTable,
  usersTable,
  usersToTeamsTable,
  projectsTable,
} from "../db/schema";
import { eq, and } from "drizzle-orm";
import type { AuthVariables } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";

export const teamsRoutes = new Hono<{ Variables: AuthVariables }>();

teamsRoutes.get("/", async (c) => {
  try {
    const teams = await db.select().from(teamsTable);
    return c.json({ teams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    throw new HTTPException(500, { message: "Failed to fetch teams" });
  }
});

teamsRoutes.post("/", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const body = await c.req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new HTTPException(400, { message: "Team name is required" });
    }

    const [team] = await db
      .insert(teamsTable)
      .values({ name: name.trim() })
      .returning();
    return c.json({ team }, 201);
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error("Error creating team:", error);
    throw new HTTPException(500, { message: "Failed to create team" });
  }
});

teamsRoutes.post("/:teamId/users/:userId", async (c) => {
  try {
    const currentUser = c.get("user");
    if (!currentUser) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const teamId = c.req.param("teamId");
    const userId = c.req.param("userId");

    if (!teamId || !userId) {
      throw new HTTPException(400, {
        message: "Team ID and User ID are required",
      });
    }

    const [team] = await db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.id, teamId))
      .limit(1);
    if (!team) {
      throw new HTTPException(404, { message: "Team not found" });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) {
      throw new HTTPException(404, { message: "User not found" });
    }

    const [existingMember] = await db
      .select()
      .from(usersToTeamsTable)
      .where(
        and(
          eq(usersToTeamsTable.teamId, teamId),
          eq(usersToTeamsTable.userId, userId),
        ),
      )
      .limit(1);

    if (existingMember) {
      throw new HTTPException(409, {
        message: "User is already a member of this team",
      });
    }

    const [userTeam] = await db
      .insert(usersToTeamsTable)
      .values({ userId, teamId })
      .returning();
    return c.json({ userTeam }, 201);
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error("Error adding user to team:", error);
    throw new HTTPException(500, { message: "Failed to add user to team" });
  }
});

teamsRoutes.delete("/:teamId/users/:userId", async (c) => {
  try {
    const currentUser = c.get("user");
    if (!currentUser) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const teamId = c.req.param("teamId");
    const userId = c.req.param("userId");

    if (!teamId || !userId) {
      throw new HTTPException(400, {
        message: "Team ID and User ID are required",
      });
    }

    const [existingMember] = await db
      .select()
      .from(usersToTeamsTable)
      .where(
        and(
          eq(usersToTeamsTable.teamId, teamId),
          eq(usersToTeamsTable.userId, userId),
        ),
      )
      .limit(1);

    if (!existingMember) {
      throw new HTTPException(404, {
        message: "User is not a member of this team",
      });
    }

    await db
      .delete(usersToTeamsTable)
      .where(
        and(
          eq(usersToTeamsTable.teamId, teamId),
          eq(usersToTeamsTable.userId, userId),
        ),
      );

    return c.json({ message: "User removed from team successfully" });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error("Error removing user from team:", error);
    throw new HTTPException(500, {
      message: "Failed to remove user from team",
    });
  }
});

teamsRoutes.get("/:teamId/users", async (c) => {
  try {
    const currentUser = c.get("user");
    if (!currentUser) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const teamId = c.req.param("teamId");
    if (!teamId) {
      throw new HTTPException(400, { message: "Team ID is required" });
    }

    const [team] = await db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.id, teamId))
      .limit(1);
    if (!team) {
      throw new HTTPException(404, { message: "Team not found" });
    }

    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        isAdmin: usersTable.isAdmin,
        avatar: usersTable.avatar,
        status: usersTable.status,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .innerJoin(usersToTeamsTable, eq(usersTable.id, usersToTeamsTable.userId))
      .where(eq(usersToTeamsTable.teamId, teamId));

    return c.json({ users });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error("Error fetching team users:", error);
    throw new HTTPException(500, { message: "Failed to fetch team users" });
  }
});
