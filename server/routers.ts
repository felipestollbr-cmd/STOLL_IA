import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  createConversation,
  getConversations,
  getConversationById,
  addMessage,
  getMessages,
  createTask,
  updateTask,
  getTasks,
  saveMemory,
  getMemory,
  getUserPreferences,
  updateUserPreferences,
} from "./db";

export const appRouter = router({
  // OAuth and system routers
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Chat and Conversation Routers
  chat: router({
    // Criar uma nova conversa
    createConversation: protectedProcedure
      .input(z.object({ title: z.string(), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await createConversation(ctx.user.id, input.title, input.description);
        return { success: true, conversationId: (result as any).insertId };
      }),

    // Listar conversas do usuário
    listConversations: protectedProcedure.query(async ({ ctx }) => {
      return await getConversations(ctx.user.id);
    }),

    // Obter uma conversa específica
    getConversation: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        return await getConversationById(input.conversationId);
      }),

    // Enviar mensagem e obter resposta do LLM
    sendMessage: protectedProcedure
      .input(z.object({ conversationId: z.number(), content: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Salvar mensagem do usuário
        await addMessage(input.conversationId, "user", input.content);

        // Chamar LLM para obter resposta
        const prefs = await getUserPreferences(ctx.user.id);
        const response = await invokeLLM({
          messages: [
            {
              role: "system" as const,
              content:
                prefs?.systemPrompt ||
                "Você é um assistente de IA útil e amigável chamado STOLL.",
            },
            { role: "user" as const, content: input.content },
          ],
        });

        const messageContent = response.choices?.[0]?.message?.content;
        const assistantMessage =
          typeof messageContent === "string"
            ? messageContent
            : "Desculpe, não consegui processar sua mensagem.";

        // Salvar resposta do assistente
        await addMessage(input.conversationId, "assistant", assistantMessage);

        return { success: true, message: assistantMessage };
      }),

    // Obter histórico de mensagens
    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        return await getMessages(input.conversationId);
      }),
  }),

  // Task Routers
  tasks: router({
    // Criar uma tarefa
    createTask: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          taskType: z.enum(["shell", "browser", "filesystem", "ai", "other"]),
          description: z.string().optional(),
          input: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await createTask(
          input.conversationId,
          input.taskType,
          input.description,
          input.input
        );
        return { success: true, taskId: (result as any).insertId };
      }),

    // Atualizar status de uma tarefa
    updateTask: protectedProcedure
      .input(
        z.object({
          taskId: z.number(),
          status: z.enum(["pending", "running", "completed", "failed"]).optional(),
          output: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await updateTask(input.taskId, {
          status: input.status,
          output: input.output,
          executedAt: input.status === "completed" ? new Date() : undefined,
        });
        return { success: true };
      }),

    // Listar tarefas de uma conversa
    getTasks: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        return await getTasks(input.conversationId);
      }),
  }),

  // Agent Memory Routers
  memory: router({
    // Salvar memória
    saveMemory: protectedProcedure
      .input(
        z.object({
          memoryType: z.enum(["preference", "lesson", "context", "skill"]),
          key: z.string(),
          value: z.string(),
          confidence: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await saveMemory(
          ctx.user.id,
          input.memoryType,
          input.key,
          input.value,
          input.confidence
        );
        return { success: true };
      }),

    // Obter memória
    getMemory: protectedProcedure
      .input(
        z.object({
          memoryType: z.enum(["preference", "lesson", "context", "skill"]).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        return await getMemory(ctx.user.id, input.memoryType);
      }),
  }),

  // User Preferences Routers
  preferences: router({
    // Obter preferências do usuário
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      return await getUserPreferences(ctx.user.id);
    }),

    // Atualizar preferências do usuário
    updatePreferences: protectedProcedure
      .input(
        z.object({
          preferredModel: z.string().optional(),
          agentPersona: z.string().optional(),
          temperature: z.number().optional(),
          maxTokens: z.number().optional(),
          systemPrompt: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserPreferences(ctx.user.id, input);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
