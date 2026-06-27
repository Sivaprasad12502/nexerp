"use client";

import { Download, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function GreetingsPageHeader({
  orgName,
  onShare,
  onDownload,
  downloading,
}: {
  orgName: string;
  onShare: () => void;
  onDownload: () => void;
  downloading?: boolean;
}) {
  return (
    <div className="border-b border-zinc-200 bg-white px-6 pb-4 pt-4 sm:px-8">
      <nav className="text-sm text-zinc-400">
        {orgName} <span className="mx-0.5">&gt;</span> Generate Greetings{" "}
        <span className="mx-0.5">&gt;</span>
      </nav>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-zinc-900">
          Generate Greetings
        </h1>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onShare}
            className="border-zinc-300 text-zinc-700"
          >
            <Share2 className="mr-2 size-4" />
            Share
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDownload}
            disabled={downloading}
            className="border-[#7438dc] text-[#7438dc] hover:bg-[#f3effc]"
          >
            <Download className="mr-2 size-4" />
            {downloading ? "Downloading…" : "Download Image"}
          </Button>
        </div>
      </div>
    </div>
  );
}
