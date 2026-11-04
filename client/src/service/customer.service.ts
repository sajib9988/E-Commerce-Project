"use server";

import { cookies } from "next/headers";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
type ApiError = { success: false; message: string; statusCode?: number };

async function getAuthHeaders() {
  const store = await cookies();
  const token = store.get("accessToken")?.value;
  return { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function safeJson<T>(response: Response): Promise<T | ApiError> {
  try { return (await response.json()) as T; }
  catch { return { success: false, message: "Invalid JSON response from server" }; }
}

// The current API exposes the signed-in user's profile through /auth/me.
// Profile editing and saved-address endpoints are not present in the backend yet.
export async function getMyCustomerProfile() {
  if (!BASE_URL) return { success: false as const, message: "NEXT_PUBLIC_BASE_URL is not configured" };
  try {
    const response = await fetch(`${BASE_URL.replace(/\/+$/, "")}/auth/me`, {
      headers: await getAuthHeaders(), cache: "no-store",
    });
    const data = await safeJson(response);
    if (!response.ok) {
      const message = typeof data === "object" && data !== null && "message" in data
        ? String(data.message) : `Request failed: ${response.status}`;
      return { success: false as const, statusCode: response.status, message };
    }
    return data;
  } catch (error) {
    console.error("Customer profile request failed:", error);
    return { success: false as const, message: "Unable to connect to the server" };
  }
}
