"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { X, Camera, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const BarcodeScanner = ({ onScan, onClose }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [hasCamera, setHasCamera] = useState(true);
    const [isSecure, setIsSecure] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const scannerRef = useRef(null);

    const startScanner = async () => {
        setErrorMsg("");
        setHasCamera(true);

        // Check for secure context (required for camera)
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            setIsSecure(false);
            // We don't return here, we let the browser try, but we'll show a hint later
        }

        try {
            const scanner = new Html5Qrcode("reader");
            scannerRef.current = scanner;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            // Prefer back camera for mobile using facingMode
            await scanner.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    onScan(decodedText);
                    // stopScanner will be called by handleBarcodeScan in the parent or here
                },
                (errorMessage) => {
                    // Continuous scanning errors are expected and ignored
                }
            );
            setIsScanning(true);
        } catch (err) {
            console.error("Error starting scanner:", err);
            setHasCamera(false);

            let friendlyError = "Could not access camera.";
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                friendlyError = "Camera permission denied. Please enable it in your browser settings.";
            } else if (err.name === 'NotFoundError') {
                friendlyError = "No camera found on this device.";
            } else if (!window.isSecureContext) {
                friendlyError = "Camera access requires a secure connection (HTTPS).";
            }

            setErrorMsg(friendlyError);
            toast.error(friendlyError);
        }
    };

    useEffect(() => {
        // Small delay to ensure DOM is ready and any previous instance is cleared
        const timer = setTimeout(() => {
            startScanner();
        }, 500);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                setIsScanning(false);
            } catch (err) {
                console.error("Failed to stop scanner", err);
            }
        }
        onClose();
    };

    return (
        <div className="flex flex-col items-center gap-4 py-4">
            <div
                id="reader"
                className="relative w-full max-w-[300px] aspect-square rounded-lg border-2 border-primary/20 overflow-hidden bg-black flex items-center justify-center text-center p-4"
            >
                {!isScanning && (
                    <div className="flex flex-col items-center justify-center text-muted-foreground w-full">
                        {errorMsg ? (
                            <div className="space-y-3 flex flex-col items-center">
                                <AlertCircle className="w-10 h-10 text-destructive mb-2" />
                                <p className="text-sm font-medium text-destructive px-2">{errorMsg}</p>
                                <Button variant="outline" size="sm" onClick={startScanner} className="mt-2">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Retry
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <RefreshCw className="w-8 h-8 animate-spin mb-2 text-primary" />
                                <p className="text-sm">Initializing camera...</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={stopScanner}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                </Button>
            </div>

            {!window.isSecureContext && window.location.hostname !== 'localhost' && (
                <p className="text-[10px] text-destructive text-center px-6 font-medium">
                    CRITICAL: Browser blocks camera access on non-HTTPS sites. Use HTTPS or localhost.
                </p>
            )}

            <p className="text-xs text-muted-foreground italic text-center">
                Position the barcode within the box to scan automatically.
            </p>
        </div>
    );
};

export default BarcodeScanner;
