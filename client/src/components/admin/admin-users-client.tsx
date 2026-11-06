"use client";
import { useState } from "react";
import { createAdminUser, deleteAdminUser, updateAdminUser, updateAdminUserRole } from "@/service/admin.service";
type Role = "USER" | "ADMIN" | "SUPER_ADMIN";
type User = { id: string; name: string; email: string; role: Role };
export function AdminUsersClient({ initialUsers, initialError }: { initialUsers: User[]; initialError?: string }) {
  const [users,setUsers]=useState(initialUsers); const [error,setError]=useState(initialError??""); const [notice,setNotice]=useState(""); const [busy,setBusy]=useState(false);
  const [editing,setEditing]=useState<User|null>(null); const [form,setForm]=useState({name:"",email:"",password:"",role:"USER" as Role});
  const reset=()=>{setEditing(null);setForm({name:"",email:"",password:"",role:"USER"});};
  const failed=(r:unknown)=>!!r&&typeof r==="object"&&"success" in r&&(r as {success?:boolean}).success===false;
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError("");setNotice("");try{
    const r=editing?await updateAdminUser(editing.id,{name:form.name,email:form.email,...(form.password?{password:form.password}:{})}):await createAdminUser(form);
    if(failed(r))throw new Error(String((r as {message?:string}).message??"Save failed"));
    const saved=r as User;setUsers((old)=>editing?old.map((u)=>u.id===editing.id?{...u,...saved}:u):[saved,...old]);setNotice(editing?"User updated.":"User created.");reset();
  }catch(err){setError(err instanceof Error?err.message:"Unable to save user");}finally{setBusy(false);}};
  const role=async(user:User,next:Role)=>{setBusy(true);setError("");const r=await updateAdminUserRole(user.id,next);if(failed(r))setError(String((r as {message?:string}).message??"Role update failed"));else{setUsers((old)=>old.map((u)=>u.id===user.id?{...u,role:next}:u));setNotice("Role updated; active sessions were revoked.");}setBusy(false);};
  const remove=async(user:User)=>{if(!window.confirm(`Delete ${user.email}? This cannot be undone.`))return;setBusy(true);setError("");const r=await deleteAdminUser(user.id);if(failed(r))setError(String((r as {message?:string}).message??"Delete failed"));else{setUsers((old)=>old.filter((u)=>u.id!==user.id));setNotice("User deleted.");}setBusy(false);};
  const cls="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return <div className="space-y-6"><header><p className="text-sm text-slate-500">SUPER_ADMIN only</p><h1 className="mt-1 text-3xl font-bold">Users & roles</h1><p className="mt-2 text-sm text-slate-600">Create, edit, change role and delete users. Backend guards enforce access.</p></header>
    {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{notice&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-2"><h2 className="font-semibold md:col-span-2">{editing?"Edit user":"Create user"}</h2>
      <input className={cls} placeholder="Name" required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/><input className={cls} type="email" placeholder="Email" required value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/>
      <input className={cls} type="password" minLength={8} required={!editing} placeholder={editing?"New password (optional)":"Temporary password (8+ characters)"} value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}/>
      {!editing&&<select className={cls} value={form.role} onChange={(e)=>setForm({...form,role:e.target.value as Role})}><option>USER</option><option>ADMIN</option><option>SUPER_ADMIN</option></select>}
      <div className="flex gap-2 md:col-span-2"><button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{busy?"Saving…":editing?"Save changes":"Create user"}</button>{editing&&<button type="button" onClick={reset} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>}</div>
    </form>
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Actions</th></tr></thead><tbody className="divide-y">{users.map((u)=><tr key={u.id}><td className="p-4 font-medium">{u.name}</td><td className="p-4">{u.email}</td><td className="p-4"><select disabled={busy} aria-label={`Role for ${u.email}`} className="rounded-md border px-2 py-1" value={u.role} onChange={(e)=>void role(u,e.target.value as Role)}><option>USER</option><option>ADMIN</option><option>SUPER_ADMIN</option></select></td><td className="p-4"><div className="flex gap-2"><button disabled={busy} onClick={()=>{setEditing(u);setForm({name:u.name,email:u.email,password:"",role:u.role});}} className="rounded-md border px-3 py-1.5">Edit</button><button disabled={busy} onClick={()=>void remove(u)} className="rounded-md border border-rose-200 px-3 py-1.5 text-rose-700">Delete</button></div></td></tr>)}</tbody></table>{!users.length&&<p className="p-8 text-center text-sm text-slate-500">No users returned.</p>}</div>
  </div>;
}