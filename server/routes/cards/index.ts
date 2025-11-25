import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type AuthVariables, AuthException } from "../../middleware/auth";
import { crudRoutes } from "./crud";
import { labelsRoutes } from "./labels";
import { todosRoutes } from "./todos";
import { membersRoutes } from "./members";
import { attachmentsRoutes } from "./attachments";

export const cardsRoutes = new Hono<{ Variables: AuthVariables }>();

// Mount all sub-routers
cardsRoutes.route("/", crudRoutes);
cardsRoutes.route("/", labelsRoutes);
cardsRoutes.route("/", todosRoutes);
cardsRoutes.route("/", membersRoutes);
cardsRoutes.route("/", attachmentsRoutes);

// Global error handler for cards routes
cardsRoutes.onError((err, c) => {
  if (err instanceof AuthException) {
    return c.json({ error: err.message }, err.status);
  }

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  console.error("Unhandled cards error:", err);
  return c.json({ error: "Internal server error" }, 500);
});
