"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, AlertCircle, Upload, KeyRound, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const BarcodeScanner = ({ onScan, onClose, onError }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [isPermissionDenied, setIsPermissionDenied] = useState(false);
    const [isProcessingFile, setIsProcessingFile] = useState(false);

    const scannerRef = useRef(null);
    const onScanRef = useRef(onScan);
    const onCloseRef = useRef(onClose);
    const onErrorRef = useRef(onError);
    const fileInputRef = useRef(null);
    const isStartingRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        onScanRef.current = onScan;
        onCloseRef.current = onClose;
        onErrorRef.current = onError;
    });

    const stopAndClearScanner = async () => {
        const scanner = scannerRef.current;
        if (scanner) {
            try {
                if (scanner.isScanning) {
                    await scanner.stop();
                }
            } catch (_) { }
            try {
                await scanner.clear();
            } catch (_) { }
            scannerRef.current = null;
        }
    };

    const startScanner = async () => {
        if (!isMountedRef.current || isStartingRef.current) return;
        isStartingRef.current = true;
        setErrorMsg("");
        setIsPermissionDenied(false);

        // Safe config without restrictive aspectRatio that causes OverconstrainedError
        const config = {
            fps: 15,
            qrbox: { width: 220, height: 220 },
        };

        const handleSuccess = (decodedText) => {
            try {
                onScanRef.current?.(decodedText);
            } catch (err) {
                console.error("onScan error:", err);
            }
        };

        const handleError = () => {
            // ZXing NotFoundException on non-match frames is normal
        };

        try {
            await stopAndClearScanner();
            if (!isMountedRef.current) return;

            const scanner = new Html5Qrcode("barcode-scanner-viewport", { verbose: false });
            scannerRef.current = scanner;

            let started = false;

            // Strategy 1: Enumerate cameras and start directly with deviceId (avoids facingMode bugs on laptops)
            try {
                const cameras = await Html5Qrcode.getCameras();
                if (cameras && cameras.length > 0) {
                    // Prefer user-facing/front camera on laptop, or first available
                    const targetCam = cameras.find((c) => /user|front|webcam/i.test(c.label || "")) || cameras[0];
                    await scanner.start(targetCam.id, config, handleSuccess, handleError);
                    started = true;
                }
            } catch (enumErr) {
                console.warn("Camera enumeration note:", enumErr);
            }

            // Strategy 2: User facing mode fallback
            if (!started && isMountedRef.current) {
                try {
                    await scanner.start({ facingMode: "user" }, config, handleSuccess, handleError);
                    started = true;
                } catch (userErr) {
                    console.warn("User facing mode note:", userErr);
                }
            }

            // Strategy 3: Environment facing mode fallback
            if (!started && isMountedRef.current) {
                await scanner.start({ facingMode: "environment" }, config, handleSuccess, handleError);
                started = true;
            }

            if (started && isMountedRef.current) {
                setIsScanning(true);
                setErrorMsg("");
            }
        } catch (err) {
            if (!isMountedRef.current) return;
            setIsScanning(false);

            const errStr = String(err?.name || err?.message || err);
            const isDenied =
                errStr.includes("NotAllowedError") ||
                errStr.includes("PermissionDeniedError") ||
                errStr.includes("permission") ||
                errStr.includes("denied");

            setIsPermissionDenied(isDenied);

            let friendly = "Could not access camera.";
            if (isDenied) {
                friendly = "Camera access was denied or blocked. Please allow camera permissions.";
            } else if (errStr.includes("NotFoundError") || errStr.includes("DevicesNotFoundError")) {
                friendly = "No camera found on this device.";
            } else if (errStr.includes("NotReadableError") || errStr.includes("TrackStartError")) {
                friendly = "Camera is currently open in another tab or application. Please close it and retry.";
            } else if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") {
                friendly = "Camera access requires HTTPS or localhost.";
            }

            setErrorMsg(friendly);
            onErrorRef.current?.(err);
        } finally {
            isStartingRef.current = false;
        }
    };

    const handlePromptPermission = async () => {
        setErrorMsg("");
        setIsPermissionDenied(false);
        try {
            if (navigator?.mediaDevices?.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach((track) => {
                    try { track.stop(); } catch (_) { }
                });
                toast.success("Camera access allowed!");
                await new Promise((r) => setTimeout(r, 200));
            }
            await startScanner();
        } catch (e) {
            console.warn("User gesture permission prompt note:", e);
            const eStr = String(e?.name || e?.message || e);
            if (eStr.includes("NotAllowedError") || eStr.includes("denied")) {
                setIsPermissionDenied(true);
                setErrorMsg("Camera is blocked. Check the address bar icon or Windows Settings.");
            } else {
                await startScanner();
            }
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        const timer = setTimeout(() => {
            startScanner();
        }, 300);

        return () => {
            isMountedRef.current = false;
            clearTimeout(timer);
            stopAndClearScanner();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleStop = async () => {
        await stopAndClearScanner();
        onCloseRef.current?.();
    };

    const handleFileScan = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingFile(true);
        try {
            let scanner = scannerRef.current;
            if (!scanner) {
                scanner = new Html5Qrcode("barcode-scanner-viewport", { verbose: false });
                scannerRef.current = scanner;
            }

            const decodedText = await scanner.scanFile(file, true);
            if (decodedText) {
                toast.success("Barcode successfully scanned from image!");
                onScanRef.current?.(decodedText);
            }
        } catch (fileErr) {
            console.error("File scan failed:", fileErr);
            toast.error("Could not find a valid barcode/QR code in the image.");
        } finally {
            setIsProcessingFile(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 py-4 w-full">
            {/* Viewfinder Frame */}
            <div className="relative w-full max-w-[320px] aspect-square rounded-xl overflow-hidden bg-black flex items-center justify-center border-2 border-primary/20 shadow-inner">
                {/* 1. Dedicated untouched DOM node for html5-qrcode video insertion */}
                <div
                    id="barcode-scanner-viewport"
                    className="w-full h-full [&_video]:object-cover"
                    style={{ minHeight: "260px", width: "100%" }}
                />

                {/* 2. React Overlay: ONLY rendered when not scanning */}
                {!isScanning && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-3 bg-background/95 dark:bg-black/90 text-center overflow-y-auto">
                        {errorMsg ? (
                            <div className="space-y-2.5 flex flex-col items-center w-full">
                                {isPermissionDenied ? (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-0.5">
                                            <ShieldAlert className="w-5 h-5" />
                                        </div>
                                        <h4 className="text-xs sm:text-sm font-semibold text-foreground dark:text-white">
                                            Camera Permission Needed
                                        </h4>

                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={handlePromptPermission}
                                            className="w-full h-8 text-xs font-semibold shadow-sm"
                                        >
                                            <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                                            Click to Allow Camera Access
                                        </Button>

                                        <div className="text-[11px] text-muted-foreground text-left bg-muted/60 dark:bg-muted/20 p-2 rounded-lg space-y-1 w-full border border-border/50">
                                            <p className="font-semibold text-foreground text-[11px]">If the prompt doesn&apos;t appear:</p>
                                            <p>1. In Chrome address bar, click the <strong>camera icon with ❌</strong> (or sliders 🎛️) &rarr; set <strong>Camera = Allow</strong>.</p>
                                            <p>2. In Windows: <em>Win + R &gt; ms-settings:privacy-webcam &gt; Let desktop apps access camera = ON</em>.</p>
                                        </div>

                                        <div className="flex gap-2 w-full justify-center pt-1">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="h-8 text-xs font-medium"
                                                disabled={isProcessingFile}
                                            >
                                                <Upload className="w-3.5 h-3.5 mr-1.5" />
                                                Upload Photo Instead
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-9 h-9 text-destructive mb-1" />
                                        <p className="text-xs sm:text-sm font-medium text-destructive px-2 text-center">
                                            {errorMsg}
                                        </p>
                                        <div className="flex gap-2 pt-2">
                                            <Button variant="default" size="sm" onClick={startScanner} className="h-8 text-xs">
                                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                                Retry Camera
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="h-8 text-xs"
                                                disabled={isProcessingFile}
                                            >
                                                <Upload className="w-3.5 h-3.5 mr-1.5" />
                                                Upload Photo
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center space-y-2">
                                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-xs sm:text-sm">Starting camera...</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileScan}
            />

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFile}
                    className="h-8 text-xs"
                >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {isProcessingFile ? "Scanning..." : "Upload Photo"}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleStop} className="h-8 text-xs text-muted-foreground">
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Cancel
                </Button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
                Hold the student barcode or QR code in front of the camera to scan.
            </p>
        </div>
    );
};

export default BarcodeScanner;
