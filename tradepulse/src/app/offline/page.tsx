import Link from "next/link";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Offline — TradePulse" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <CloudOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-bold">You are offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        No problem — keep recording sales in the chat. They are saved on your device and will sync
        automatically when you are back online.
      </p>
      <Link href="/trader/chat">
        <Button>Go to chat</Button>
      </Link>
    </div>
  );
}