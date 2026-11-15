import { AdminContactInbox } from "@/components/admin/admin-contact-inbox";
import { getAdminContactSubmissions, type ContactSubmission } from "@/service/contact.service";

export default async function AdminContactPage() {
  const result = await getAdminContactSubmissions();
  const failed = typeof result === "object" && result !== null && "success" in result && result.success === false;

  return (
    <AdminContactInbox
      initialSubmissions={failed ? [] : result as ContactSubmission[]}
      initialError={failed ? (result as { success: false; message: string }).message : undefined}
    />
  );
}
