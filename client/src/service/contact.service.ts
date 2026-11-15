"use server";

import { apiRequest, type ApiError } from "@/lib/api/server-request";

export type ContactSubmissionInput = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
};

export type ContactSubmissionResult = {
  success: true;
  message: string;
};

export async function submitContactForm(
  data: ContactSubmissionInput,
): Promise<ContactSubmissionResult | ApiError> {
  return apiRequest<ContactSubmissionResult>(
    "/contact",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    {
      authenticated: false,
      context: "Contact form submission",
      fallbackMessage: "We could not send your message. Please try again.",
    },
  );
}
