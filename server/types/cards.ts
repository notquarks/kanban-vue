import type { SafeUser } from "../middleware/auth";
import type { kanbanCardsTable, labelsTable } from "../db/schema";

// Request body types
export interface CreateCardRequest {
  title: string;
  description?: string;
  columnId: string;
  priorityId: number;
  dueDate?: string;
  order?: number;
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  columnId?: string;
  priorityId?: number;
  dueDate?: string;
  order?: number;
  status?: string;
  estimatedHours?: number;
  actualHours?: number;
}

export interface DatabaseUpdateCardRequest {
  title?: string;
  description?: string | null;
  columnId?: string;
  priorityId?: number;
  dueDate?: Date | null;
  order?: number;
  status?: string;
  estimatedHours?: number;
  actualHours?: number;
}

// Response types
export interface CardResponse {
  card: typeof kanbanCardsTable.$inferSelect & {
    assignee?: SafeUser | null;
    members?: SafeUser[];
  };
}

export interface CardsResponse {
  cards: Array<
    typeof kanbanCardsTable.$inferSelect & {
      labels?: typeof labelsTable.$inferSelect | null;
      members?: SafeUser[];
    }
  >;
  total: number;
  page: number;
  limit: number;
}

export interface MessageResponse {
  message: string;
  success: boolean;
}

export interface ErrorResponse {
  error: string;
  details?: unknown;
}

// Todo type
export interface CardTodo {
  id: string;
  cardId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
