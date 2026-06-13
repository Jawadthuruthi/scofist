"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import useCrud from "@/hooks/use-crud";

function numberToWords(num) {
    if (!num && num !== 0) return "";
    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen",
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function toWords(n) {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
        if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + toWords(n % 100) : "");
        if (n < 100000) return toWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + toWords(n % 1000) : "");
        if (n < 10000000) return toWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + toWords(n % 100000) : "");
        return toWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + toWords(n % 10000000) : "");
    }

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    let result = toWords(rupees) + " Rupees";
    if (paise > 0) result += " and " + toWords(paise) + " Paise";
    return result + " Only";
}

export default function PrintableReceipt({ transaction, open, onClose, apiKey }) {
    const printRef = useRef(null);
    const [institution, setInstitution] = useState({});

    const { useFetchItems } = useCrud("settings", apiKey);
    const fetchSettingsQuery = useFetchItems(0, 0, {}, { enabled: !!apiKey && open });

    useEffect(() => {
        if (fetchSettingsQuery.data?.settings?.institution) {
            setInstitution(fetchSettingsQuery.data.settings.institution);
        }
    }, [fetchSettingsQuery.data]);

    if (!transaction) return null;

    const date = transaction.date
        ? new Date(transaction.date).toLocaleDateString("en-GB", {
            day: "2-digit", month: "2-digit", year: "numeric",
        })
        : "";

    const amountInWords = numberToWords(Number(transaction.amount) || 0);
    const rupees = Math.floor(Number(transaction.amount) || 0);
    const paise = Math.round(((Number(transaction.amount) || 0) - rupees) * 100);

    const institutionName = institution.name || "INSTITUTION NAME";
    const institutionTagline = institution.tagline || "";
    const institutionAddress = institution.address || "";
    const institutionLogo = institution.logo?.url || null;
    const primaryPhone = institution.contact?.primaryPhone || "";
    const secondaryPhone = institution.contact?.secondaryPhone || "";
    const email = institution.contact?.email || "";
    const website = institution.contact?.website || "";

    const phoneStr = [primaryPhone, secondaryPhone].filter(Boolean).join(", ");
    const contactLine = [
        phoneStr ? `Tel: ${phoneStr}` : "",
        email ? `Email: ${email}` : "",
        website ? website : "",
    ].filter(Boolean).join("  |  ");

    const handlePrint = () => {
        const printContents = printRef.current.innerHTML;
        const printWindow = window.open("", "_blank", "width=900,height=600");
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt No. ${transaction.invoiceNo || ""}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;900&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Montserrat', Arial, sans-serif; 
                        background: white; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                    }
                    @page { size: auto; margin: 10mm; }
                    @media print { 
                        body { margin: 0; } 
                        .receipt-wrapper { page-break-inside: avoid; }
                    }
                    img { max-width: 100%; }
                </style>
            </head>
            <body>
                <div class="receipt-wrapper" style="margin-bottom: 20px;">
                    <div style="max-width: 680px; margin: 0 auto 5px; text-align: right; font-size: 12px; font-weight: bold; color: #555;">Office Copy</div>
                    ${printContents}
                </div>
                <div style="border-top: 1px dashed #999; margin: 20px auto; max-width: 680px;"></div>
                <div class="receipt-wrapper" style="margin-bottom: 20px;">
                    <div style="max-width: 680px; margin: 0 auto 5px; text-align: right; font-size: 12px; font-weight: bold; color: #555;">Student/Payee Copy</div>
                    ${printContents}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl p-0 overflow-auto">
                <DialogTitle className="sr-only">Receipt Preview</DialogTitle>

                <div className="flex items-center justify-between p-3 border-b bg-gray-50 print:hidden">
                    <span className="font-semibold text-gray-700">
                        Receipt Preview — No.&nbsp;{transaction.invoiceNo}
                    </span>
                    <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                        <Printer className="h-4 w-4" /> Print Receipt
                    </Button>
                </div>

                <div className="p-4 bg-white" ref={printRef}>
                    <div style={{
                        border: "2.5px solid #333",
                        maxWidth: 680,
                        margin: "0 auto",
                        fontFamily: "'Montserrat', Arial, sans-serif",
                        background: "#F7F7F7",
                        position: "relative",
                    }}>
                        {/* Wrap content in a div so it sits above any potential watermarks */}
                        <div style={{ position: "relative", zIndex: 1 }}>
                        {/* ── INSTITUTION HEADER ── */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "10px 16px",
                        }}>
                            {/* Name + tagline + address */}
                            <div style={{ flex: 1, textAlign: "center" }}>
                                <div style={{
                                    fontSize: 23, fontWeight: 900,
                                    fontFamily: "'Montserrat', Arial, sans-serif",
                                    letterSpacing: 0.5, lineHeight: 1.2,
                                    color: "#111",
                                }}>
                                    {institutionName}
                                </div>
                                {institutionTagline && (
                                    <div style={{ fontSize: 14, fontWeight: "bold", color: "#333", fontFamily: "'Montserrat', Arial, sans-serif" }}>
                                        {institutionTagline}
                                    </div>
                                )}
                                {institutionAddress && (
                                    <div style={{ fontSize: 12, color: "#444", fontFamily: "'Montserrat', Arial, sans-serif", marginTop: 2 }}>
                                        {institutionAddress}
                                    </div>
                                )}
                                {contactLine && (
                                    <div style={{ fontSize: 11, color: "#444", fontFamily: "'Montserrat', Arial, sans-serif" }}>
                                        {contactLine}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── RECEIPT TITLE ── */}
                        <div style={{
                            textAlign: "center",
                            padding: "4px 0",
                            borderTop: "1.5px solid #333",
                            fontWeight: "bold",
                            fontFamily: "'Montserrat', Arial, sans-serif",
                            fontSize: 16,
                            letterSpacing: 2,
                        }}>
                            RECEIPT
                        </div>

                        {/* ── RECEIPT NO & DATE ── */}
                        <div style={{
                            display: "flex", justifyContent: "space-between",
                            alignItems: "center", padding: "6px 14px",
                        }}>
                            <span style={{ fontWeight: "bold", fontFamily: "'Montserrat', Arial, sans-serif", fontSize: 16 }}>
                                Nō&nbsp;<span style={{ fontSize: 20 }}>
                                    {transaction.invoiceNo}
                                </span>
                            </span>
                            <span style={{ fontSize: 14, fontStyle: "italic", fontFamily: "'Montserrat', Arial, sans-serif" }}>
                                Date:&nbsp;
                                <span style={{ fontStyle: "normal" }}>
                                    {date}
                                </span>
                            </span>
                        </div>

                        {/* ── BODY ── */}
                        <div style={{ paddingTop: 10, paddingBottom: 4 }}>

                            {/* Received with thanks from */}
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 0, paddingLeft: 16, paddingRight: 16 }}>
                                <span style={{ fontSize: 14, whiteSpace: "nowrap", flexShrink: 0, paddingTop: 2 }}>Received with thanks from</span>
                                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, minHeight: 18 }}>
                                    {transaction.recipient || ""}
                                </span>
                            </div>
                            {/* dot line: spacer mirrors label + gap, dots fill the rest to the border */}
                            <div style={{ display: "flex", marginBottom: 6 }}>
                                <span style={{ flexShrink: 0, paddingLeft: 16, fontSize: 14, visibility: "hidden", whiteSpace: "nowrap" }}>Received with thanks from</span>
                                <span style={{ width: 6, flexShrink: 0 }} />
                                <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", color: "#bbb", letterSpacing: 4, fontSize: 12 }}>{".".repeat(150)}</span>
                            </div>

                            {/* a sum of Rupees */}
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 0, paddingLeft: 16, paddingRight: 16 }}>
                                <span style={{ fontSize: 16, whiteSpace: "nowrap", flexShrink: 0, paddingTop: 2 }}>a sum of Rupees</span>
                                <span style={{ flex: 1, fontSize: 17, fontWeight: 600, minHeight: 18 }}>
                                    {amountInWords}
                                </span>
                            </div>
                            <div style={{ display: "flex", marginBottom: 6 }}>
                                <span style={{ flexShrink: 0, paddingLeft: 16, fontSize: 14, visibility: "hidden", whiteSpace: "nowrap" }}>a sum of Rupees</span>
                                <span style={{ width: 6, flexShrink: 0 }} />
                                <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", color: "#bbb", letterSpacing: 4, fontSize: 12 }}>{".".repeat(150)}</span>
                            </div>

                            {/* being */}
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 0, paddingLeft: 16, paddingRight: 16 }}>
                                <span style={{ fontSize: 16, whiteSpace: "nowrap", flexShrink: 0, paddingTop: 2 }}>being</span>
                                <span style={{ flex: 1, fontSize: 17, fontWeight: 600, minHeight: 18 }}>
                                    {transaction.item || transaction.category || ""}
                                </span>
                            </div>
                            <div style={{ display: "flex", marginBottom: 10 }}>
                                <span style={{ flexShrink: 0, paddingLeft: 16, fontSize: 14, visibility: "hidden", whiteSpace: "nowrap" }}>being</span>
                                <span style={{ width: 6, flexShrink: 0 }} />
                                <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", color: "#bbb", letterSpacing: 4, fontSize: 12 }}>{".".repeat(150)}</span>
                            </div>

                            {/* Amount box */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 16, paddingRight: 16 }}>
                                <span style={{ fontSize: 24, fontWeight: "bold" }}>₹</span>
                                <div style={{
                                    border: "2px solid #333", padding: "4px 18px",
                                    minWidth: 110, textAlign: "center",
                                    fontSize: 18, fontWeight: "bold",
                                }}>
                                    {rupees.toLocaleString("en-IN")}
                                    {paise > 0 ? `.${String(paise).padStart(2, "0")}` : ""}
                                </div>
                            </div>
                        </div>

                        {/* ── FOOTER ── */}
                        <div style={{
                            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
                            padding: "0 16px 16px", marginTop: 25,
                            position: "relative", zIndex: 10
                        }}>
                            {/* Left */}
                            <span style={{ fontSize: 13, fontFamily: "'Montserrat', Arial, sans-serif", fontWeight: "bold", flex: 1, textAlign: "left" }}>
                                Payee
                            </span>

                            {/* Center */}
                            <span style={{ fontSize: 13, fontFamily: "'Montserrat', Arial, sans-serif", fontWeight: "bold", flex: 1, textAlign: "center" }}>
                                Receiver
                            </span>

                            {/* Right */}
                            <span style={{ fontSize: 13, fontFamily: "'Montserrat', Arial, sans-serif", fontWeight: "bold", flex: 1, textAlign: "right" }}>
                                Secretary
                            </span>
                        </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
