export default function AdminSettingsPage() {
  return (
    <div className="space-y-4">
      <header><p className="text-sm font-medium text-slate-500">Workspace preferences</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Store settings</h1><p className="mt-2 text-sm text-slate-600">Store configuration and operational preferences.</p></header>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        The current NestJS backend does not expose a general store-settings read/write API. This page intentionally contains no fake controls. We can add settings after defining the backend schema and authorized endpoints.
      </div>
    </div>
  );
}
