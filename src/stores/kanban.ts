import { defineStore } from "pinia";
import { api } from "../utils/api";
import { ref } from "vue";
import type { SafeUser } from "@/types";

export interface KanbanCard {
  id: string;
  title: string;
  description?: string | null;
  todos?: CardTodo[];
  columnId: string;
  order: number;
  assigneeId?: string | null;
  members?: SafeUser[];
  reporterId: string;
  priorityId: number;
  dueDate?: Date | null;
  status: "todo" | "in_progress" | "review" | "done";
  estimatedHours?: number | null;
  actualHours?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KanbanColumn {
  id: string;
  name: string;
  boardId: string;
  order: number;
  color?: string | null;
  maxCards?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KanbanBoard {
  id: string;
  name: string;
  projectId: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Priority {
  id: number;
  name: string;
  level: number;
  color: string;
  icon?: string | null;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  content: string;
  parentId?: string | null;
  isEdited: boolean;
  editedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  cardId: string;
  url: string;
  filename: string;
  filetype?: string | null;
  filesize: number;
  uploadedBy: string;
  createdAt: Date;
}

// Creation interfaces
export interface CreateBoardData {
  name: string;
  projectId: string;
}

export interface CreateColumnData {
  name: string;
  boardId: string;
  order: number;
  color?: string;
  maxCards?: number;
}

export interface CreateCardData {
  title: string;
  description?: string;
  columnId: string;
  order: number;
  assigneeId?: string;
  reporterId: string;
  priorityId: number;
  dueDate?: Date;
  status?: KanbanCard["status"];
  estimatedHours?: number;
}

export interface CardTodo {
  id: string;
  cardId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardMember {
  cardId: string;
  userId: string;
  createdAt: Date;
}

export const useKanbanStore = defineStore("kanban", () => {
  // State
  const boards = ref<KanbanBoard[]>([]);
  const columns = ref<KanbanColumn[]>([]);
  const cards = ref<KanbanCard[]>([]);
  const priorities = ref<Priority[]>([]);
  const labels = ref<Label[]>([]);
  const comments = ref<Comment[]>([]);
  const attachments = ref<Attachment[]>([]);

  const loading = ref(false);
  const error = ref<string | null>(null);

  // Boards
  const fetchBoards = async (projectId?: string): Promise<KanbanBoard[]> => {
    loading.value = true;
    error.value = null;

    try {
      const url = projectId ? `/boards?projectId=${projectId}` : "/boards";
      const response = await api.get(url);
      const data = response.boards || response;
      boards.value = data;
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to fetch boards";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createBoard = async (
    boardData: CreateBoardData,
  ): Promise<KanbanBoard> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.post("/boards", boardData);
      boards.value.push(data);
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to create board";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateBoard = async (
    id: string,
    boardData: Partial<CreateBoardData>,
  ): Promise<KanbanBoard> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.put(`/boards/${id}`, boardData);
      const index = boards.value.findIndex((b: KanbanBoard) => b.id === id);
      if (index !== -1) {
        boards.value[index] = data;
      }
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to update board";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteBoard = async (id: string): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/boards/${id}`);
      boards.value = boards.value.filter((b: KanbanBoard) => b.id !== id);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to delete board";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Columns
  const fetchColumns = async (boardId?: string): Promise<KanbanColumn[]> => {
    loading.value = true;
    error.value = null;

    try {
      const url = boardId ? `/columns?boardId=${boardId}` : "/columns";
      const response = await api.get(url);
      const data = response.columns || response; // Handle both response formats

      if (boardId) {
        const existingColumns = columns.value.filter(
          (col) => col.boardId !== boardId,
        );
        columns.value = [...existingColumns, ...data];
      } else {
        columns.value = data;
      }
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to fetch columns";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createColumn = async (
    columnData: CreateColumnData,
  ): Promise<KanbanColumn> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.post("/columns", columnData);
      columns.value.push(data);
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to create column";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateColumn = async (
    id: string,
    columnData: Partial<CreateColumnData>,
  ): Promise<KanbanColumn> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.put(`/columns/${id}`, columnData);
      const index = columns.value.findIndex((c: KanbanColumn) => c.id === id);
      if (index !== -1) {
        columns.value[index] = data;
      }
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to update column";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteColumn = async (id: string): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/columns/${id}`);
      columns.value = columns.value.filter((c: KanbanColumn) => c.id !== id);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to delete column";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const reorderColumn = async (
    columnId: string,
    boardId: string,
    newOrder: number,
  ): Promise<KanbanColumn> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.patch(`/columns/${columnId}/reorder`, {
        boardId,
        newOrder,
      });
      const updatedColumn = response.column || response;

      const index = columns.value.findIndex(
        (c: KanbanColumn) => c.id === columnId,
      );
      if (index !== -1) {
        columns.value[index] = {
          ...columns.value[index],
          ...updatedColumn,
          order: newOrder,
        };
      }
      await fetchColumns(boardId);

      return updatedColumn;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to reorder column";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Cards
  const fetchCards = async (columnId?: string): Promise<KanbanCard[]> => {
    loading.value = true;
    error.value = null;

    try {
      const url = columnId ? `/cards?columnId=${columnId}` : "/cards";
      const response = await api.get(url);
      const data = response.cards || response;

      if (columnId) {
        const otherCards = cards.value.filter(
          (c: KanbanCard) => c.columnId !== columnId,
        );
        cards.value = [...otherCards, ...data];
      } else {
        cards.value = data;
      }

      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to fetch cards";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createCard = async (cardData: CreateCardData): Promise<KanbanCard> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.post("/cards", cardData);
      cards.value.push(data);
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to create card";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateCard = async (
    id: string,
    cardData: Partial<CreateCardData>,
  ): Promise<KanbanCard> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.put(`/cards/${id}`, cardData);
      const index = cards.value.findIndex((c: KanbanCard) => c.id === id);
      if (index !== -1) {
        cards.value[index] = data;
      }
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to update card";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteCard = async (id: string): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/cards/${id}`);
      cards.value = cards.value.filter((c: KanbanCard) => c.id !== id);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to delete card";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const moveCard = async (
    cardId: string,
    newColumnId: string,
    newOrder: number,
  ): Promise<KanbanCard> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.patch(`/cards/${cardId}/move`, {
        columnId: newColumnId,
        order: newOrder,
      });
      const updatedCard = response.card || response;
      const index = cards.value.findIndex((c: KanbanCard) => c.id === cardId);
      if (index !== -1) {
        cards.value[index] = {
          ...cards.value[index],
          ...updatedCard,
          columnId: newColumnId,
          order: newOrder,
        };
      }

      return updatedCard;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unable to move card";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchCardTodos = async (cardId: string): Promise<CardTodo[]> => {
    try {
      const response = await api.get(`/cards/${cardId}/todos`);
      return response.todos || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to fetch card todos";
      throw err;
    }
  };

  const createCardTodo = async (
    cardId: string,
    title: string,
    order: number = 0,
  ): Promise<CardTodo> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.post(`/cards/${cardId}/todos`, { title, order });
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to create card todo";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateCardTodo = async (
    todoId: string,
    todoData: Partial<CardTodo>,
  ): Promise<CardTodo> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.put(`/cards/todos/${todoId}`, todoData);
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to update card todo";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteCardTodo = async (todoId: string): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/cards/todos/${todoId}`);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to delete card todo";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchPriorities = async (): Promise<Priority[]> => {
    try {
      const data = await api.get("/priorities");
      priorities.value = data;
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to fetch priorities";
      throw err;
    }
  };

  const fetchLabels = async (): Promise<Label[]> => {
    try {
      const data = await api.get("/labels");
      labels.value = data;
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to fetch labels";
      throw err;
    }
  };

  const fetchCardMembers = async (cardId: string): Promise<CardMember[]> => {
    try {
      const response = await api.get(`/cards/${cardId}/members`);
      return response.members || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to fetch card members";
      throw err;
    }
  };

  const addCardMember = async (
    cardId: string,
    userId: string,
  ): Promise<CardMember> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.post(`/cards/${cardId}/members/${userId}`, {});
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to add card member";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const removeCardMember = async (
    cardId: string,
    userId: string,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/cards/${cardId}/members/${userId}`);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to remove card member";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Card Attachments
  const fetchCardAttachments = async (
    cardId: string,
  ): Promise<Attachment[]> => {
    try {
      const response = await api.get(`/cards/${cardId}/attachments`);
      return response.attachments || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to fetch card attachments";
      throw err;
    }
  };

  const addCardAttachment = async (
    cardId: string,
    fileData: any,
  ): Promise<Attachment> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.post(`/cards/${cardId}/attachments`, fileData);
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to add card attachment";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteCardAttachment = async (attachmentId: string): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/cards/attachments/${attachmentId}`);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to delete card attachment";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchCardLabels = async (cardId: string): Promise<Label[]> => {
    try {
      const response = await api.get(`/cards/${cardId}/labels`);
      return response.labels || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to fetch card labels";
      throw err;
    }
  };

  const addCardLabel = async (
    cardId: string,
    labelId: string,
  ): Promise<any> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.post(`/cards/${cardId}/labels/${labelId}`, {});
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to add card label";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const removeCardLabel = async (
    cardId: string,
    labelId: string,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/cards/${cardId}/labels/${labelId}`);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to remove card label";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Helper functions
  const getBoardById = (id: string): KanbanBoard | undefined => {
    return boards.value.find((b: KanbanBoard) => b.id === id);
  };

  const getColumnById = (id: string): KanbanColumn | undefined => {
    return columns.value.find((c: KanbanColumn) => c.id === id);
  };

  const getCardById = (id: string): KanbanCard | undefined => {
    return cards.value.find((c: KanbanCard) => c.id === id);
  };

  const getCardsByColumnId = (columnId: string): KanbanCard[] => {
    return cards.value
      .filter((c: KanbanCard) => c.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  };

  const getPriorityById = (id: number): Priority | undefined => {
    return priorities.value.find((p: Priority) => p.id === id);
  };

  const getLabelById = (id: string): Label | undefined => {
    return labels.value.find((l: Label) => l.id === id);
  };

  // Clear functions
  const clearBoards = (): void => {
    boards.value = [];
  };

  const clearColumns = (): void => {
    columns.value = [];
  };

  const clearCards = (): void => {
    cards.value = [];
  };

  const clearAll = (): void => {
    boards.value = [];
    columns.value = [];
    cards.value = [];
    priorities.value = [];
    labels.value = [];
    comments.value = [];
    attachments.value = [];
  };

  return {
    // State
    boards,
    columns,
    cards,
    priorities,
    labels,
    comments,
    attachments,
    loading,
    error,

    // Board actions
    fetchBoards,
    createBoard,
    updateBoard,
    deleteBoard,

    // Column actions
    fetchColumns,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumn,

    // Card actions
    fetchCards,
    createCard,
    updateCard,
    deleteCard,
    moveCard,

    // CardTodo actions
    fetchCardTodos,
    createCardTodo,
    updateCardTodo,
    deleteCardTodo,

    // CardMember actions
    fetchCardMembers,
    addCardMember,
    removeCardMember,

    // CardAttachments actions
    fetchCardAttachments,
    addCardAttachment,
    deleteCardAttachment,

    // CardLabels actions
    fetchCardLabels,
    addCardLabel,
    removeCardLabel,

    // Reference data
    fetchPriorities,
    fetchLabels,

    // Helper functions
    getBoardById,
    getColumnById,
    getCardById,
    getCardsByColumnId,
    getPriorityById,
    getLabelById,

    // Clear functions
    clearBoards,
    clearColumns,
    clearCards,
    clearAll,
  };
});
