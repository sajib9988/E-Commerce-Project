import { getAnalyticsOverview } from "@/service/analytics.service";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
type Data=Parameters<typeof AnalyticsDashboard>[0]["data"];
export default async function AdminAnalyticsPage(){
 const result=await getAnalyticsOverview();
 if(!result||typeof result!=="object"||("success" in result&&(result as {success?:boolean}).success===false))return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{String((result as {message?:string}|null)?.message??"Analytics could not be loaded.")}</div>;
 return <AnalyticsDashboard data={result as Data}/>;
}