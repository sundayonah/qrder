import { SetupQr } from "@/components/SetupQr";
import { getPublicAppUrl } from "@/lib/public-url";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  return (
    <main className="min-h-full bg-white">
      <SetupQr appUrl={getPublicAppUrl()} />
    </main>
  );
}
