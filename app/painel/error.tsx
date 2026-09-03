"use client";

import { Button } from "@/components/ui/button";

export default function ErroPainel({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="space-y-4 py-8 text-center">
      <p className="text-sm text-destructive">{error.message}</p>
      <Button onClick={reset} variant="outline">
        Tentar de novo
      </Button>
    </div>
  );
}
