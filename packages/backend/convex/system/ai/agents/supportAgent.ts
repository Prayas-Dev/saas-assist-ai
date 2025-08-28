import { google } from '@ai-sdk/google';
import { Agent } from '@convex-dev/agent';
import { components } from "../../../_generated/api"

export const supportAgent = new Agent(components.agent, {
  chat: google.chat("gemini-1.5-flash"),
  instructions: `You are a customer support agent. Use "resolvedConversation" to mark conversations as resolved when the customer's issue has been addressed. Use "escalateConversation" to escalate the conversation to a human agent if you are unable to assist the customer or when user requests a human explicitly.`,
  
});