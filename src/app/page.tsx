import { HomeGuest } from "@/components/HomeGuest";
import { getPublicAppUrl } from "@/lib/public-url";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-full bg-white">
      <HomeGuest appUrl={getPublicAppUrl()} />
    </main>
  );
}
