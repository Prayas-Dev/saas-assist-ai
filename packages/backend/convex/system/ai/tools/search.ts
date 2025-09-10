import { google } from "@ai-sdk/google";
import { createTool } from "@convex-dev/agent";
import { generateText, embed } from "ai";
import z from "zod";
import { internal } from "../../../_generated/api";
import { supportAgent } from "../agents/supportAgent";
import rag from "../rag";

export const search = createTool({
  description: "Search the knowledge base for relevant information to help answer user queries.",
  args: z.object({
    query: z.string().describe("The search query to find relevant information")
  }),
  handler: async (ctx, args) => {
    if (!ctx.threadId) {
      return "Missing thread ID";
    }

    const conversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      { threadId: ctx.threadId }
    );

    if (!conversation) {
      return "Conversation not found";
    }

    const orgId = conversation.organizationId;

    // Generate embedding from the query
    const queryEmbedding = await embed({
      model: google.textEmbeddingModel("text-embedding-004"),
      value: args.query,
    });

    // Perform search in RAG
    const searchResult = await rag.search(ctx, {
      namespace: orgId, // must match ingestion namespace
      query: args.query,
      limit: 5,
    });

    // console.log("Search results:", searchResult);

    const contextText = searchResult.entries
      .map((e) => e.text || "")
      .join("\n\n");

    const response = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: `
        You are a support assistant. Use the knowledge base context to answer.

        Question: ${args.query}

        Context:
        ${contextText || "No relevant information found."}
      `,
    });

    await supportAgent.saveMessage(ctx, {
      threadId: ctx.threadId,
      message: {
        role: "assistant",
        content: response.text,
      },
    });

    return response.text;
  },
});
