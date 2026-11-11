"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, AlertCircle, Upload, ShieldAlert, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const BarcodeScanner = ({ onScan, onClose, onError }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [permissionStatus, setPermissionStatus] = useState("checking"); // "checking" | "granted" | "prompt" | "denied" | "unknown"
    const [currentOrigin, setCurrentOrigin] = useState("");
    const [isProcessingFile, setIsProcessingFile] = useState(false);

    const scannerRef = useRef(null);
    const onScanRef = useRef(onScan);
    const onCloseRef = useRef(onClose);
    const onErrorRef = useRef(onError);
    const fileInputRef = useRef(null);
    const isStartingRef = useRef(false);

    useEffect(() => {
        onScanRef.current = onScan;
        onCloseRef.current = onClose;
        onErrorRef.current = onError;
        if (typeof window !== "undefined") {
            setCurrentOrigin(window.location.origin);
        }
    });

        // Check browser permission status directly using the Permissions API
        const checkBrowserPermission = useCallback(async () => {
            try {
                if (typeof navigator !== "undefined" && navigator.permissions?.query) {
                    const status = await navigator.permissions.query({ name: "camera" });
                    setPermissionStatus(status.state);
                    status.onchange = () => {
                        setPermissionStatus(status.state);
                        if (status.state === "granted") {
                            startScanner();
                        }
                    };
                    return status.state;
                }
            } catch (_) { }
            return "unknown";
        }, []); // eslint-disable-line react-hooks/exhaustive-deps

        const startScanner = useCallback(async () => {
            if (isStartingRef.current) return;
            isStartingRef.current = true;
            setIsLoading(true);
            setErrorMsg("");

            const config = {
                fps: 15,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            const handleSuccess = (decodedText) => {
                try {
                    onScanRef.current?.(decodedText);
                } catch (err) {
                    console.error("onScan error:", err);
                }
            };

            const handleError = () => {
                // ZXing NotFoundException on non-matching frames is expected and ignored
            };

            try {
                // Safely stop any previous scanner instance
                if (scannerRef.current) {
                    try {
                        await scannerRef.current.stop();
                    } catch (_) { }
                    try {
                        await scannerRef.current.clear();
                    } catch (_) { }
                    scannerRef.current = null;
                }

                const scanner = new Html5Qrcode("barcode-reader-view", { verbose: false });
                scannerRef.current = scanner;

                // Strategy 1: User-facing webcam (laptop webcams)
                try {
                    await scanner.start(
                        { facingMode: "user" },
                        config,
                        handleSuccess,
                        handleError
                    );
                    setIsScanning(true);
                    setIsLoading(false);
                    setPermissionStatus("granted");
                } catch (firstErr) {
                    const firstErrStr = String(firstErr?.name || firstErr?.message || firstErr);
                    if (firstErrStr.includes("NotAllowedError") || firstErrStr.includes("Permission") || firstErrStr.includes("denied")) {
                        throw firstErr;
                    }

                    // Strategy 2: Fallback to environment / rear camera
                    await scanner.clear().catch(() => { });
                    const fallbackScanner = new Html5Qrcode("barcode-reader-view", { verbose: false });
                    scannerRef.current = fallbackScanner;
                    await fallbackScanner.start(
                        { facingMode: "environment" },
                        config,
                        handleSuccess,
                        handleError
                    );
                    setIsScanning(true);
                    setIsLoading(false);
                    setPermissionStatus("granted");
                }
            } catch (err) {
                setIsScanning(false);
                setIsLoading(false);

                const errStr = String(err?.name || err?.message || err);
                const isDenied = errStr.includes("NotAllowedError") ||
                    errStr.includes("PermissionDeniedError") ||
                    errStr.includes("permission") ||
                    errStr.includes("denied");

                if (isDenied) {
                    setPermissionStatus("denied");
                    console.warn("BarcodeScanner: Camera access denied by browser or system:", err);
                } else {
                    console.error("BarcodeScanner: Error starting scanner:", err);
                }

                let friendly = "Could not access camera.";
                if (isDenied) {
                    friendly = "Camera access is currently blocked for this site or in Windows.";
                } else if (errStr.includes("NotFoundError") || errStr.includes("DevicesNotFoundError")) {
                    friendly = "No camera found on this device.";
                } else if (errStr.includes("NotReadableError") || errStr.includes("TrackStartError")) {
                    friendly = "Camera is in use by another app (e.g. Zoom, Teams). Please close other camera tabs.";
                } else if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") {
                    friendly = "Camera requires HTTPS or localhost.";
                }

                setErrorMsg(friendly);
                onErrorRef.current?.(err);
            } finally {
                isStartingRef.current = false;
            }
    }, []);

    // Explicit user-gesture trigger to prompt browser permission dialog
    const handlePromptPermission = async () => {
        setIsLoading(true);
        setErrorMsg("");
        try {
            if (navigator?.mediaDevices?.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach((track) => {
                    try { track.stop(); } catch (_) { }
                });
                setPermissionStatus("granted");
                toast.success("Camera access allowed!");
                await new Promise((r) => setTimeout(r, 200));
            }
            await startScanner();
        } catch (e) {
            console.warn("Direct user-gesture permission request note:", e);
            const eStr = String(e?.name || e?.message || e);
            if (eStr.includes("NotAllowedError") || eStr.includes("denied")) {
                setPermissionStatus("denied");
                setErrorMsg("Camera is blocked. Check the address bar icon or Windows Settings.");
            } else {
                await startScanner();
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkBrowserPermission();
        const timer = setTimeout(() => {
            startScanner();
    }, 350);

    return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
            try {
                scannerRef.current.stop().catch(() => { });
            } catch (_) { }
            try {
                scannerRef.current.clear().catch(() => { });
            } catch (_) { }
            scannerRef.current = null;
        }
    };
    }, [checkBrowserPermission, startScanner]);

const handleStop = async () => {
    if (scannerRef.current) {
        try {
            await scannerRef.current.stop();
        } catch (_) { }
        try {
            await scannerRef.current.clear();
        } catch (_) { }
        scannerRef.current = null;
    }
    onCloseRef.current?.();
};

const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
        let scanner = scannerRef.current;
        if (!scanner) {
            scanner = new Html5Qrcode("barcode-reader-view", { verbose: false });
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
        {/* Viewfinder container */}
        <div
            id="barcode-reader-view"
            className="relative w-full max-w-[340px] aspect-square min-h-[270px] rounded-xl border-2 border-primary/20 overflow-hidden bg-black flex items-center justify-center text-center p-2 shadow-inner"
        >
            {!isScanning && (
                <div className="flex flex-col items-center justify-center text-muted-foreground w-full p-3 overflow-y-auto max-h-[320px]">
                    {errorMsg ? (
                        <div className="space-y-2.5 flex flex-col items-center w-full">
                                { permissionStatus === "denied" ? (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-0.5">
                                            <ShieldAlert className="w-5 h-5" />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="text-xs sm:text-sm font-semibold text-foreground dark:text-white">
                                                Camera Access Blocked
                                            </h4>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                Site: <code>{currentOrigin || "localhost:3000"}</code>
                                            </p>
                                        </div>

                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={handlePromptPermission}
                                            disabled={isLoading}
                                            className="w-full h-8 text-xs font-semibold shadow-sm"
                                        >
                                            <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                                            Click to Request Camera Permission
                                        </Button>

                                            <div className="text-[11px] text-muted-foreground text-left bg-muted/60 dark:bg-muted/20 p-2.5 rounded-lg space-y-1.5 w-full border border-border/50">
                                                <p className="font-semibold text-foreground text-[11px]">How to unblock in Chrome:</p>
                                                <p>1. Look at the right side of Chrome&apos;s address bar for a <strong>camera icon with a red ❌</strong> (or click the sliders icon 🎛️ on the left).</p>
                                                <p>2. Select <strong>&ldquo;Always allow {currentOrigin || "this site"} to access your camera&rdquo;</strong> &rarr; click <strong>Done</strong>.</p>
                                                <p>3. In Windows: <em>Win + R &gt; ms-settings:privacy-webcam &gt; Let desktop apps access camera = ON</em>.</p>
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
