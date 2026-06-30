"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function GenerateInvoiceButton() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  async function generateInvoice() {
    setGenerating(true);
    try {
      await fetch("/api/billing/invoices", { method: "POST" });
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Button onClick={generateInvoice} disabled={generating} className="w-full sm:w-auto">
      {generating ? "Generating..." : "Generate This Month Invoice"}
    </Button>
  );
}
