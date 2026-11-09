"use server";

import { getAuthHeaders } from "@/lib/api/get-auth-headers";
import { safeJson } from "@/lib/api/safe-json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export type AiChatProduct = {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  regularPrice: string;
  salePrice: string | null;
  stockQuantity: number;
  imageUrl: string | null;
  category: string;
  subcategory: string;
  variants: Array<{
    size: string;
    color: string | null;
    regularPrice: string;
    salePrice: string | null;
    stockQuantity: number;
  }>;
};

export type AiChatResponse = {
  answer: string;
  products: AiChatProduct[];
  sources: Array<{ title?: string; slug?: string }>;
};

export type AiChatResult =
  | { success: true; data: AiChatResponse }
  | { success: false; message: string };

type ApiError = { message?: string | string[]; error?: string };

const getErrorMessage = (value: unknown) => {
  if (!value || typeof value !== "object" || !("message" in value)) {
    return "The shopping assistant could not respond. Please try again.";
  }

  const message = (value as ApiError).message;
  return Array.isArray(message) ? message.join(", ") : message || "Request failed";
};

/**
 * Calls the public NestJS AI endpoint from the server.
 * The OpenAI key stays on the backend and the browser never receives it.
 */
export async function sendAiChatMessage(message: string): Promise<AiChatResult> {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return { success: false, message: "Please enter a message." };
  }

  if (trimmedMessage.length > 1000) {
    return { success: false, message: "Please keep your message under 1,000 characters." };
  }

  if (!BASE_URL) {
    return {
      success: false,
      message: "The API server is not configured. Please contact the store team.",
    };
  }

  try {
    const response = await fetch(
      `${BASE_URL.replace(/\/+$/, "")}/ai/chat`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ message: trimmedMessage }),
        cache: "no-store",
      },
    );

    const result = await safeJson<AiChatResponse | ApiError>(response);

    if (!response.ok) {
      return {
        success: false,
        message: getErrorMessage(result),
      };
    }

    if (
      !result ||
      typeof result !== "object" ||
      !("answer" in result) ||
      typeof result.answer !== "string"
    ) {
      return {
        success: false,
        message: "The assistant returned an unexpected response. Please try again.",
      };
    }

    return {
      success: true,
      data: {
        answer: result.answer,
        products: Array.isArray(result.products) ? result.products : [],
        sources: Array.isArray(result.sources) ? result.sources : [],
      },
    };
  } catch (error) {
    console.error("AI chat request failed:", error);
    return {
      success: false,
      message: "Unable to reach the shopping assistant. Please try again.",
    };
  }
}
