import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database functions
vi.mock("./db", () => ({
  createConversation: vi.fn().mockResolvedValue({ insertId: 1 }),
  getConversations: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, title: "Test Conversation", createdAt: new Date() },
  ]),
  getConversationById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    title: "Test Conversation",
  }),
  addMessage: vi.fn().mockResolvedValue({ insertId: 1 }),
  getMessages: vi.fn().mockResolvedValue([
    { id: 1, role: "user", content: "Hello", createdAt: new Date() },
    { id: 2, role: "assistant", content: "Hi there!", createdAt: new Date() },
  ]),
  getUserPreferences: vi.fn().mockResolvedValue({
    userId: 1,
    systemPrompt: "You are a helpful assistant.",
  }),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "This is a test response from the LLM.",
        },
      },
    ],
  }),
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

describe("Chat Router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createAuthContext();
  });

  it("should create a new conversation", async () => {
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.createConversation({
      title: "Test Conversation",
      description: "A test conversation",
    });

    expect(result.success).toBe(true);
    expect(result.conversationId).toBe(1);
  });

  it("should list conversations for the user", async () => {
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.listConversations();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should get a specific conversation", async () => {
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.getConversation({
      conversationId: 1,
    });

    expect(result).toBeDefined();
    expect(result?.id).toBe(1);
  });

  it("should send a message and get a response", async () => {
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.sendMessage({
      conversationId: 1,
      content: "Hello, STOLL!",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
    expect(typeof result.message).toBe("string");
  });

  it("should get messages from a conversation", async () => {
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.getMessages({
      conversationId: 1,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
