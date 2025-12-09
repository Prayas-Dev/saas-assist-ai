import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import type { StorageActionWriter } from "convex/server";
import { assert } from "convex-helpers"
import { Id } from "../_generated/dataModel";
import { mime } from "zod/v4";

const AI_MODELS = {
    image: google.chat("gemini-2.5-flash-lite-preview-09-2025"),
    pdf: google.chat("gemini-2.5-flash-lite-preview-09-2025"),
    html: google.chat("gemini-2.5-flash-lite-preview-09-2025")
} as const;

const SUPPORTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
] as const;

const SYSTEM_PROMPTS = {
    image: "You turn images into text. If the image contains text, extract and return only the text. If the image contains no text, describe the image in a concise manner.",
    pdf: "You are a text extraction AI. Extract and return the main text content from the PDF document. Ignore any images, formatting, or non-text elements.",
    html: "You are a text extraction AI. Extract and return the main text content from the HTML document. Ignore any images, formatting, or non-text elements.",
}

export type ExtractTextContentArgs = {
    storageId: Id<"_storage">;
    filename: string;
    bytes?: ArrayBuffer;
    mimeType: string;
}

export async function extractTextContent(
    ctx: { storage: StorageActionWriter },
    args: ExtractTextContentArgs
): Promise<string> {
    const { storageId, filename, bytes, mimeType } = args;
    
    const url = await ctx.storage.getUrl(storageId);
    assert(url, "Failed to get storage URL");

    if(SUPPORTED_IMAGE_TYPES.some((type) => type === mimeType)) {
        return extractImageText(url);
    }

    if (mimeType.toLowerCase().includes("pdf")) {
        return extractPdfText(url, mimeType, filename);
    }

    if(mimeType.toLowerCase().includes("text")) {
        return extractTextFileContent(ctx, storageId, bytes, mimeType);
    }

    throw new Error(`Unsupported MIME type: ${mimeType}`)
}

async function extractTextFileContent(
    ctx: { storage: StorageActionWriter},
    storageId: Id<"_storage">,
    bytes: ArrayBuffer | undefined,
    mimeType: string
): Promise<string> {
    const arrayBuffer = 
        bytes || (await (await ctx.storage.get(storageId))?.arrayBuffer());

        if(!arrayBuffer) {
            throw new Error("Failed to get file content");
        }

        const text = new TextDecoder().decode(arrayBuffer);

        if(mimeType.toLowerCase() !== "text/plain") {
            const result = await generateText({
                model: AI_MODELS.html,
                system: SYSTEM_PROMPTS.html,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text },
                            {
                                type: "text",
                                text: "Extract the text and print it in a markdown format without explaining that you'll do so"
                            },
                        ],
                    },
                ],
            })

            return result.text;
        }

        return text;
};

async function extractPdfText(url: string, mimeType: string, filename: string): Promise<string> {
    const result = await generateText({
        model: AI_MODELS.pdf,
        system: SYSTEM_PROMPTS.pdf,
        messages: [
            { role: "user",
                content: [
                    { type: "file", data: new URL(url), mimeType, filename },
                    {
                        type: "text",
                        text: "Extract the main text content from the PDF document without explaining it. Ignore any images, formatting, or non-text elements."
                    }
                ]
            }
        ]
    })

    return result.text;
}

async function extractImageText(url: string): Promise<string> {
    const result = await generateText({
        model: AI_MODELS.image,
        system: SYSTEM_PROMPTS.image,
        messages: [
            {
                role: "user",
                content: [{ type: "image", image: new URL(url) }]
            },
        ],
    });

    return result.text;
}