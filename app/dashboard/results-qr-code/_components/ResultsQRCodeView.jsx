// app/dashboard/results-qr-code/_components/ResultsQRCodeView.jsx
"use client";

import { useRef } from "react";
import { QRCodeGenerator } from "./QRCodeGenerator";
import { QRCodeActions } from "./QRCodeActions";

import { useQRCodeConfig } from "@/hooks/use-qr-code";
import { QrCode } from "lucide-react";
import Header from "@/components/Header";

export default function ResultsQRCodeView({ activeYear }) {
  const printRef = useRef(null);
  const { resultsUrl, qrOptions } = useQRCodeConfig(activeYear);

  return (
    <div className="space-y-6">
      <Header
        title="RESULTS QR CODE"
        subTitle="Generate and share festival results instantly"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main QR Code */}
        <div className="lg:col-span-2 h-full">
          <QRCodeGenerator
            resultsUrl={resultsUrl}
            qrOptions={qrOptions}
            printRef={printRef}
          />
        </div>

        {/* Sidebar */}
        <div className="h-full">
          <QRCodeActions
            resultsUrl={resultsUrl}
            organizationName="SCOFIST"
            printRef={printRef}
          />

        </div>
      </div>
    </div>
  );
}
