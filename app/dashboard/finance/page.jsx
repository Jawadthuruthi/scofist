"use client";
import dynamic from "next/dynamic";

const FinanceClient = dynamic(() => import("@/components/FinanceClient"), {
  ssr: false,
});

export default function FinancePage() {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  return <FinanceClient apiKey={apiKey} />;
}
