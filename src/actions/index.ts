import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import { GrammarFixSessions, GrammarIssues, and, db, eq } from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getOwnedSession(sessionId: string, userId: string) {
  const [session] = await db
    .select()
    .from(GrammarFixSessions)
    .where(and(eq(GrammarFixSessions.id, sessionId), eq(GrammarFixSessions.userId, userId)));

  if (!session) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Grammar fix session not found.",
    });
  }

  return session;
}

export const server = {
  createSession: defineAction({
    input: z.object({
      language: z.string().optional(),
      originalText: z.string().min(1),
      correctedText: z.string().min(1),
      overallComment: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [session] = await db
        .insert(GrammarFixSessions)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          language: input.language,
          originalText: input.originalText,
          correctedText: input.correctedText,
          overallComment: input.overallComment,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { success: true, data: { session } };
    },
  }),

  updateSession: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        language: z.string().optional(),
        originalText: z.string().optional(),
        correctedText: z.string().optional(),
        overallComment: z.string().optional(),
      })
      .refine(
        (input) =>
          input.language !== undefined ||
          input.originalText !== undefined ||
          input.correctedText !== undefined ||
          input.overallComment !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedSession(input.id, user.id);

      const [session] = await db
        .update(GrammarFixSessions)
        .set({
          ...(input.language !== undefined ? { language: input.language } : {}),
          ...(input.originalText !== undefined ? { originalText: input.originalText } : {}),
          ...(input.correctedText !== undefined ? { correctedText: input.correctedText } : {}),
          ...(input.overallComment !== undefined ? { overallComment: input.overallComment } : {}),
          updatedAt: new Date(),
        })
        .where(eq(GrammarFixSessions.id, input.id))
        .returning();

      return { success: true, data: { session } };
    },
  }),

  listSessions: defineAction({
    input: z.object({}).optional(),
    handler: async (_input, context) => {
      const user = requireUser(context);

      const sessions = await db
        .select()
        .from(GrammarFixSessions)
        .where(eq(GrammarFixSessions.userId, user.id));

      return { success: true, data: { items: sessions, total: sessions.length } };
    },
  }),

  createIssue: defineAction({
    input: z.object({
      sessionId: z.string().min(1),
      issueType: z.string().optional(),
      originalFragment: z.string().optional(),
      correctedFragment: z.string().optional(),
      explanation: z.string().optional(),
      severity: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedSession(input.sessionId, user.id);

      const [issue] = await db
        .insert(GrammarIssues)
        .values({
          id: crypto.randomUUID(),
          sessionId: input.sessionId,
          issueType: input.issueType,
          originalFragment: input.originalFragment,
          correctedFragment: input.correctedFragment,
          explanation: input.explanation,
          severity: input.severity,
          createdAt: new Date(),
        })
        .returning();

      return { success: true, data: { issue } };
    },
  }),

  listIssues: defineAction({
    input: z.object({
      sessionId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedSession(input.sessionId, user.id);

      const issues = await db
        .select()
        .from(GrammarIssues)
        .where(eq(GrammarIssues.sessionId, input.sessionId));

      return { success: true, data: { items: issues, total: issues.length } };
    },
  }),
};
