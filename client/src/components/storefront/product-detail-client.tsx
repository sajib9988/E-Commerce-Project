"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCartStore } from "@/providers/cart-store-provider";

type Variant = { id: string; sku: string; regularPrice: string | number; salePrice?: string | number | null; stockQuantity: number; colorName?: string | null; colorHex?: string | null; size?: { label: string } };
type Product = { id: string; name: string; description?: string | null; imageUrl: string; regularPrice: string | number; salePrice?: string | number | null; stockQuantity?: number; category?: { name: string }; variants?: Variant[]; collections?: Array<{ collection?: { name: string; slug: string } }> };
const money=(v:unknown)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(v??0));

export function ProductDetailClient({ product }: { product: Product }) {
  const [variantId,setVariantId]=useState("");
  const [quantity,setQuantity]=useState(1);
  const [message,setMessage]=useState("");
  const addItem=useCartStore(s=>s.addItem);
  const variants=product.variants ?? [];
  const selected=variants.find(v=>v.id===variantId);
  const price=selected?.salePrice ?? selected?.regularPrice ?? product.salePrice ?? product.regularPrice;
  const stock=selected?.stockQuantity ?? product.stockQuantity ?? 0;
  const available=variants.length ? variants.filter(v=>v.stockQuantity>0) : [];
  function addToCart(){
    if(variants.length && !selected){setMessage("Please select a size and color option.");return;}
    if(stock<quantity){setMessage("The selected option does not have enough stock.");return;}
    addItem({productId:product.id,variantId:selected?.id,name:product.name+(selected?.size?.label? ` · ${selected.size.label}`:"")+(selected?.colorName? ` · ${selected.colorName}`:""),imageUrl:product.imageUrl,unitPrice:Number(price),quantity});
    setMessage("Added to your cart.");
  }
  return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8"><Link href="/products" className="text-sm text-stone-500 underline">Back to shop</Link><div className="mt-6 grid gap-10 md:grid-cols-2"><div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-stone-100">{product.imageUrl&&<Image src={product.imageUrl} alt={product.name} fill priority sizes="(max-width:768px) 100vw,50vw" className="object-cover" unoptimized/>}</div><section className="py-2"><p className="text-xs font-semibold uppercase tracking-[.18em] text-stone-500">{product.category?.name ?? "Product"}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{product.name}</h1><p className="mt-4 text-2xl font-semibold">{money(price)}{(selected?.salePrice ?? product.salePrice) != null && <span className="ml-3 text-base font-normal text-stone-400 line-through">{money(selected?.regularPrice ?? product.regularPrice)}</span>}</p>{product.description&&<p className="mt-6 whitespace-pre-line text-sm leading-7 text-stone-600">{product.description}</p>}
    {variants.length>0&&<div className="mt-8"><label htmlFor="variant" className="text-sm font-semibold">Size / color</label><select id="variant" value={variantId} onChange={e=>{setVariantId(e.target.value);setMessage("");}} className="mt-2 h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"><option value="">Choose an option</option>{variants.map(v=><option key={v.id} value={v.id} disabled={v.stockQuantity<1}>{[v.size?.label,v.colorName].filter(Boolean).join(" / ") || v.sku} — {money(v.salePrice??v.regularPrice)} {v.stockQuantity<1?"(Out of stock)":""}</option>)}</select></div>}
    <div className="mt-6 flex items-center gap-4"><label htmlFor="quantity" className="text-sm font-semibold">Quantity</label><input id="quantity" type="number" min="1" max={Math.max(1,stock)} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(99,Number(e.target.value)||1)))} className="h-11 w-20 rounded-lg border px-3 text-center"/></div>
    <button type="button" onClick={addToCart} disabled={variants.length>0 ? available.length===0 : stock<1} className="mt-7 h-12 w-full rounded-full bg-stone-950 px-6 text-sm font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300">{stock<1?"Out of stock":"Add to cart"}</button>
    {message&&<p role="status" className="mt-3 text-sm text-stone-600">{message}</p>}<p className="mt-5 text-xs leading-5 text-stone-500">Displayed price and stock are checked again by the server during checkout.</p><Link href="/cart" className="mt-5 inline-block text-sm font-semibold underline">View cart</Link>
  </section></div></main>;
}
