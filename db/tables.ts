/**
 * Grammar Fixer - correct grammar, spelling, and style.
 *
 * Design goals:
 * - Store original text and corrected text.
 * - Provide an explanation log that we can show in UI (for learning).
 * - Track severity / issue type counts for future insights.
 */

import { defineTable, column, NOW } from "astro:db";

export const GrammarFixSessions = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    language: column.text({ optional: true }),         // e.g. "en", "ta"
    originalText: column.text(),
    correctedText: column.text(),                      // best corrected version
    overallComment: column.text({ optional: true }),   // summary feedback ("clear, minor issues")
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const GrammarIssues = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    sessionId: column.text({
      references: () => GrammarFixSessions.columns.id,
    }),
    issueType: column.text({ optional: true }),        // "spelling", "grammar", "style", "punctuation"
    originalFragment: column.text({ optional: true }),
    correctedFragment: column.text({ optional: true }),
    explanation: column.text({ optional: true }),      // human-friendly explanation
    severity: column.text({ optional: true }),         // "minor", "moderate", "major"
    createdAt: column.date({ default: NOW }),
  },
});

export const tables = {
  GrammarFixSessions,
  GrammarIssues,
} as const;
