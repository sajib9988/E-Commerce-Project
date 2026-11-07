"use server";

import { getAuthHeaders } from "@/lib/api/get-auth-headers";
import { safeJson } from "@/lib/api/safe-json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

type ApiError = {
  success: false;
  message: string;
  statusCode?: number;
};

export const getMyCustomerProfile = async () => {
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: await getAuthHeaders(),
      cache: "no-store",
    });

    const result = await safeJson(res);

    if (!res.ok) {
      return {
        success: false,
        statusCode: res.status,
        message:
          result && typeof result === "object" && "message" in result
            ? String(result.message)
            : "Failed to fetch customer profile",
      } satisfies ApiError;
    }

    return result;
  } catch (error) {
    console.error("Error fetching customer profile:", error);
    return { success: false, message: "Failed to fetch customer profile" } satisfies ApiError;
  }
};
