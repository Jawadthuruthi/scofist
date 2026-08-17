// app/dashboard/results-qr-code/_components/QRCodeGenerator.jsx
"use client";

import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";

export function QRCodeGenerator({ resultsUrl, qrOptions, printRef }) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Festival Results QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center pt-0">
        <div
          ref={printRef}
          id="qr-code-canvas"
          className="flex flex-col items-center justify-center space-y-4 p-4 sm:px-8 sm:pb-8 sm:pt-4 bg-white rounded-lg max-w-full overflow-hidden"
        >
          <QRCodeCanvas
            value={resultsUrl}
            size={qrOptions.width}
            level={qrOptions.level}
            marginSize={qrOptions.margin}
            bgColor={qrOptions.color.light}
            fgColor={qrOptions.color.dark}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <p className="text-sm text-center text-muted-foreground mt-4">
            Scan to view festival results
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
