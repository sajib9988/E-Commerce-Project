"use server";

import { revalidatePath } from "next/cache";
import { getAuthHeaders } from "@/lib/api/get-auth-headers";
import { safeJson } from "@/lib/api/safe-json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export async function updateMyCustomerProfile(name: string) {
  if (!BASE_URL) return { success: false as const, message: "NEXT_PUBLIC_BASE_URL is not configured" };

  try {
    const response = await fetch(`${BASE_URL.replace(/\/+$/, "")}/auth/me`, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ name: name.trim() }),
      cache: "no-store",
    });
    const data = await safeJson<{ message?: string }>(response);
    if (!response.ok) {
      const message = typeof data === "object" && data !== null && "message" in data
        ? String(data.message) : `Request failed: ${response.status}`;
      return { success: false as const, message };
    }
    revalidatePath("/account");
    revalidatePath("/account/profile");
    return data;
  } catch (error) {
    console.error("Customer profile update failed:", error);
    return { success: false as const, message: "Unable to connect to the server" };
  }
}
