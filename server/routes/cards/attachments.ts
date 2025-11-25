import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";
import { db } from "../../index";
import { kanbanCardsTable, attachmentsTable } from "../../db/schema";
import {
  type AuthVariables,
  requireAuth,
  AuthException,
} from "../../middleware/auth";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export const attachmentsRoutes = new Hono<{ Variables: AuthVariables }>();

// Get all attachments for a card
attachmentsRoutes.get("/:cardId/attachments", requireAuth(), async (c) => {
  try {
    const cardId = c.req.param("cardId");

    const [card] = await db
      .select()
      .from(kanbanCardsTable)
      .where(eq(kanbanCardsTable.id, cardId))
      .limit(1);

    if (!card) {
      throw new AuthException("Card not found", 404);
    }

    const attachments = await db
      .select()
      .from(attachmentsTable)
      .where(eq(attachmentsTable.cardId, cardId))
      .orderBy(attachmentsTable.createdAt);

    return c.json({ attachments });
  } catch (error) {
    if (error instanceof AuthException) {
      throw error;
    }
    console.error("Get card attachments error:", error);
    throw new AuthException("Failed to fetch card attachments", 500);
  }
});

// Upload attachment to Cloudinary
attachmentsRoutes.post("/:id/attachments", requireAuth(), async (c) => {
  try {
    const id = c.req.param("id");
    const currentUser = c.get("user");

    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "File is required" }, 400);
    }

    // Check if card exists
    const [existingCard] = await db
      .select()
      .from(kanbanCardsTable)
      .where(eq(kanbanCardsTable.id, id))
      .limit(1);

    if (!existingCard) {
      throw new AuthException("Card not found", 404);
    }

    // Upload to Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `kanban/${id}`,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        },
      );
      uploadStream.end(buffer);
    });

    // Save to database
    const [attachment] = await db
      .insert(attachmentsTable)
      .values({
        cardId: id,
        url: uploadResult.secure_url,
        filename: file.name,
        filetype: file.type,
        filesize: file.size,
        uploadedBy: currentUser.id,
      })
      .returning();

    return c.json({ attachment }, 201);
  } catch (error) {
    console.error("Add card attachment error:", error);
    if (error instanceof AuthException) {
      return c.json({ error: error.message }, error.status);
    }
    return c.json({ error: "Failed to add card attachment" }, 500);
  }
});

// Delete attachment from Cloudinary and database
attachmentsRoutes.delete(
  "/:id/attachments/:attachmentId",
  requireAuth(),
  async (c) => {
    try {
      const id = c.req.param("id");
      const attachmentId = c.req.param("attachmentId");

      // Check if attachment exists
      const [attachment] = await db
        .select()
        .from(attachmentsTable)
        .where(
          and(
            eq(attachmentsTable.id, attachmentId),
            eq(attachmentsTable.cardId, id),
          ),
        )
        .limit(1);

      if (!attachment) {
        throw new AuthException("Attachment not found", 404);
      }

      // Extract public ID from URL and delete from Cloudinary
      try {
        const regex = /\/v\d+\/(.+)\.[a-zA-Z0-9]+$/;
        const match = attachment.url.match(regex);
        if (match && match[1]) {
          await cloudinary.uploader.destroy(match[1]);
        }
      } catch (e) {
        console.error("Failed to delete from Cloudinary", e);
      }

      await db
        .delete(attachmentsTable)
        .where(eq(attachmentsTable.id, attachmentId));

      return c.json({ success: true });
    } catch (error) {
      console.error("Delete attachment error:", error);
      if (error instanceof AuthException) {
        return c.json({ error: error.message }, error.status);
      }
      return c.json({ error: "Failed to delete attachment" }, 500);
    }
  },
);
