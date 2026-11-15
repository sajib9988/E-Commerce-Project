"use server";

import { revalidatePath } from "next/cache";
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

export type ContactStatus = "NEW" | "READ" | "RESOLVED";

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
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

export async function getAdminContactSubmissions(): Promise<ContactSubmission[] | ApiError> {
  return apiRequest<ContactSubmission[]>("/contact/admin/submissions", {}, {
    context: "Admin contact inbox",
    fallbackMessage: "Could not load contact submissions.",
  });
}

export async function updateAdminContactStatus(
  id: string,
  status: ContactStatus,
): Promise<ContactSubmission | ApiError> {
  const result = await apiRequest<ContactSubmission>(
    `/contact/admin/submissions/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
    {
      context: "Update contact submission",
      fallbackMessage: "Could not update the contact status.",
    },
  );

  if (!(typeof result === "object" && result !== null && "success" in result && result.success === false)) {
    revalidatePath("/admin/contact");
  }
  return result;
}
