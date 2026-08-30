import { pgTable, text, timestamp, jsonb, integer, boolean, serial } from "drizzle-orm/pg-core";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const boardCache = pgTable("board_cache", {
  id: serial("id").primaryKey(),
  boardId: text("board_id").notNull().unique(),
  boardName: text("board_name").notNull(),
  boardType: text("board_type").notNull(), // 'deals' | 'work_orders'
  data: jsonb("data").notNull(),
  itemCount: integer("item_count").default(0),
  lastFetched: timestamp("last_fetched").defaultNow().notNull(),
  isStale: boolean("is_stale").default(false),
});

export const agentSessions = pgTable("agent_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
