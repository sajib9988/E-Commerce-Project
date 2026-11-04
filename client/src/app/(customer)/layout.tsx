export default function CustomerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="min-h-screen bg-stone-50 text-stone-900">{children}</main>;
}
