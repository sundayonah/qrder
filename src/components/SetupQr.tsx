"use client";

import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/Button";

const TABLES = Array.from({ length: 12 }, (_, i) => String(i + 1));

export function TableQrGrid({
  appUrl,
  compact = false,
}: {
  appUrl: string;
  compact?: boolean;
}) {
  const origin = appUrl.replace(/\/$/, "");

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Scan these on a phone. They use{" "}
        <span className="break-all font-medium text-black">
          {origin || "Set APP_URL in .env"}
        </span>
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {TABLES.map((tableId) => {
          const url = origin
            ? `${origin}/?table=${tableId}`
            : `/?table=${tableId}`;
          return (
            <div
              key={tableId}
              className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 p-4"
            >
              <p className="text-sm font-semibold">Table {tableId}</p>
              {origin ? (
                <QRCodeSVG
                  value={url}
                  size={compact ? 112 : 128}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              ) : (
                <div className="h-28 w-28 bg-neutral-100" />
              )}
              <p className="break-all text-center text-[10px] text-neutral-500">
                {url}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SetupQr({ appUrl }: { appUrl: string }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
          Qrder
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Table QR codes</h1>
      </header>
      <div className="flex flex-wrap gap-2">
        <a href="/admin">
          <Button type="button">Admin · orders</Button>
        </a>
        <a href={`${appUrl.replace(/\/$/, "")}/?table=1`}>
          <Button type="button" variant="secondary">
            Preview table 1
          </Button>
        </a>
      </div>
      <TableQrGrid appUrl={appUrl} />
    </div>
  );
}
