import { AdminDashboard } from "@/components/AdminDashboard";
import { getPublicAppUrl } from "@/lib/public-url";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <main className="min-h-full bg-white">
      <AdminDashboard appUrl={getPublicAppUrl()} />
    </main>
  );
}
