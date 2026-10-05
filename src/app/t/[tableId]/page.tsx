import { redirect } from "next/navigation";

export default async function TablePage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  redirect(`/?table=${encodeURIComponent(tableId)}`);
}
