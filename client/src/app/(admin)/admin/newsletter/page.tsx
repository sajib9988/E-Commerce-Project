import { AdminNewsletterClient } from "@/components/admin/admin-newsletter-client";
import { getNewsletterSubscribers } from "@/service/newsletter.service";
export default async function NewsletterPage(){const result=await getNewsletterSubscribers();const failed=result&&typeof result==="object"&&"success"in result&&(result as any).success===false;return <AdminNewsletterClient initialSubscribers={failed?[]:result as any[]} initialError={failed?(result as any).message:undefined}/>;}
