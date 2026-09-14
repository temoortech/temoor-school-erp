"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/state";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page-shell">
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title="This screen could not be loaded"
          description="An unexpected error occurred while loading the ERP workspace."
          action={<Button onClick={reset}>Try again</Button>}
        />
      </div>
    </div>
  );
}
