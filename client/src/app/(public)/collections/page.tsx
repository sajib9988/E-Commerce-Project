import Image from "next/image";
import Link from "next/link";
import { getCollections } from "@/service/collection.service";

type Collection={id:string;name:string;slug:string;description?:string|null;thumbnail?:string|null;bannerImage?:string|null;_count?:{products:number}};
export default async function CollectionsPage(){
 const result=await getCollections({page:1,limit:50}) as any;
 const failed=result&&typeof result==="object"&&"success"in result&&result.success===false;
 const items:Collection[]=Array.isArray(result)?result:!failed?(result.items??[]):[];
 return <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><header className="mb-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-stone-500">Curated for you</p><h1 className="mt-2 text-4xl font-semibold">Collections</h1><p className="mt-2 text-sm text-stone-600">Browse products grouped by collection.</p></header>{failed?<p role="alert" className="rounded-xl bg-rose-50 p-5 text-sm text-rose-800">{result.message}</p>:items.length===0?<div className="rounded-2xl border border-dashed p-12 text-center text-sm text-stone-500">No collections are available yet.</div>:<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(c=><Link key={c.id} href={`/collections/${c.slug}`} className="group overflow-hidden rounded-2xl border bg-white"><div className="relative aspect-[16/10] bg-stone-100">{(c.thumbnail||c.bannerImage)&&<Image src={(c.thumbnail||c.bannerImage)!} alt={c.name} fill sizes="(max-width:768px) 100vw,33vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" unoptimized/>}</div><div className="p-5"><h2 className="text-xl font-semibold">{c.name}</h2><p className="mt-2 line-clamp-2 text-sm text-stone-600">{c.description||"Explore this collection."}</p><p className="mt-4 text-xs font-medium text-stone-500">{c._count?.products??0} products · Explore collection →</p></div></Link>)}</div>}</main>;
}
