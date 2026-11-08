import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollectionBySlug } from "@/service/collection.service";

export const instant = false;

export default async function CollectionDetailPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const result=await getCollectionBySlug(slug) as any;
 if(!result||("success"in result&&result.success===false))notFound();
 const collection=result as any; const products=(collection.products??[]).flatMap((entry:any)=>entry.product?[entry.product]:[]);
 const money=(v:any)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(v??0));
 return <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><Link href="/collections" className="text-sm text-stone-500 underline">All collections</Link><header className="mt-5 mb-8">{collection.bannerImage&&<div className="relative mb-6 aspect-[16/5] overflow-hidden rounded-2xl bg-stone-100"><Image src={collection.bannerImage} alt={collection.name} fill priority sizes="100vw" className="object-cover" unoptimized/></div>}<h1 className="text-4xl font-semibold">{collection.name}</h1>{collection.description&&<p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">{collection.description}</p>}</header>{products.length===0?<div className="rounded-2xl border border-dashed p-12 text-center text-sm text-stone-500">No published products in this collection yet.</div>:<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{products.map((p:any)=><Link key={p.id} href={`/products/${p.id}`} className="overflow-hidden rounded-2xl border bg-white"><div className="relative aspect-[4/5] bg-stone-100">{p.imageUrl&&<Image src={p.imageUrl} alt={p.name} fill sizes="(max-width:640px) 50vw,25vw" className="object-cover" unoptimized/>}</div><div className="p-4"><h2 className="text-sm font-semibold">{p.name}</h2><p className="mt-2 text-sm font-semibold">{money(p.salePrice??p.regularPrice)}</p></div></Link>)}</div>}</main>;
}
