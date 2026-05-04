import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  conversations,
  messages,
  tasks,
  agentMemory,
  userPreferences,
  type InsertUserPreference,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Conversation Queries
 */
export async function createConversation(
  userId: number,
  title: string,
  description?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(conversations).values({
    userId,
    title,
    description,
  });

  return result;
}

export async function getConversations(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversationById(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  return result[0];
}

/**
 * Message Queries
 */
export async function addMessage(
  conversationId: number,
  role: "user" | "assistant",
  content: string,
  metadata?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(messages).values({
    conversationId,
    role,
    content,
    metadata,
  });

  return result;
}

export async function getMessages(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

/**
 * Task Queries
 */
export async function createTask(
  conversationId: number,
  taskType: "shell" | "browser" | "filesystem" | "ai" | "other",
  description?: string,
  input?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tasks).values({
    conversationId,
    taskType,
    description,
    input,
    status: "pending",
  });

  return result;
}

export async function updateTask(
  taskId: number,
  updates: {
    status?: "pending" | "running" | "completed" | "failed";
    output?: string;
    executedAt?: Date;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(tasks).set(updates).where(eq(tasks.id, taskId));
}

export async function getTasks(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(tasks)
    .where(eq(tasks.conversationId, conversationId))
    .orderBy(desc(tasks.createdAt));
}

/**
 * Agent Memory Queries
 */
export async function saveMemory(
  userId: number,
  memoryType: "preference" | "lesson" | "context" | "skill",
  key: string,
  value: string,
  confidence?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(agentMemory).values({
    userId,
    memoryType,
    key,
    value,
    confidence: confidence ?? 50,
  });
}

export async function getMemory(
  userId: number,
  memoryType?: "preference" | "lesson" | "context" | "skill"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (memoryType) {
    return db
      .select()
      .from(agentMemory)
      .where(
        and(
          eq(agentMemory.userId, userId),
          eq(agentMemory.memoryType, memoryType)
        )
      )
      .orderBy(desc(agentMemory.updatedAt));
  }

  return db
    .select()
    .from(agentMemory)
    .where(eq(agentMemory.userId, userId))
    .orderBy(desc(agentMemory.updatedAt));
}

/**
 * User Preferences Queries
 */
export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return result[0];
}

export async function updateUserPreferences(
  userId: number,
  updates: Partial<InsertUserPreference>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserPreferences(userId);

  if (existing) {
    return db
      .update(userPreferences)
      .set(updates)
      .where(eq(userPreferences.userId, userId));
  } else {
    return db.insert(userPreferences).values({
      userId,
      ...updates,
    });
  }
}
