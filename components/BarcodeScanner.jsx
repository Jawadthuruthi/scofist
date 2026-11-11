"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, AlertCircle, FlipHorizontal, Upload, Camera } from "lucide-react";
import { toast } from "sonner";

const BarcodeScanner = ({ onScan, onClose, onError }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [isSecureContext, setIsSecureContext] = useState(true);
    const [isLocalhost, setIsLocalhost] = useState(false);
    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState("");
    const [isProcessingFile, setIsProcessingFile] = useState(false);

    const scannerRef = useRef(null);
    const isMountedRef = useRef(true);
    const fileInputRef = useRef(null);
    const readerIdRef = useRef(`barcode-reader-${Math.random().toString(36).substring(2, 9)}`);
    const readerId = readerIdRef.current;

    // Safely stop and clear any running scanner instance
    const cleanupScanner = useCallback(async () => {
        const scanner = scannerRef.current;
        if (!scanner) return;

        try {
            // Check state: 2 = SCANNING, 3 = PAUSED
            const state = typeof scanner.getState === "function" ? scanner.getState() : (scanner.isScanning ? 2 : 1);
            if (state === 2 || state === 3) {
                await scanner.stop();
            }
        } catch (err) {
            console.warn("BarcodeScanner: non-critical error stopping scanner:", err);
        }

        try {
            await scanner.clear();
        } catch (err) {
            console.warn("BarcodeScanner: non-critical error clearing scanner:", err);
        } finally {
            scannerRef.current = null;
        }
    }, []);

    const waitForContainer = useCallback(async (maxAttempts = 20, delayMs = 100) => {
        for (let i = 0; i < maxAttempts; i++) {
            if (!isMountedRef.current) return null;
            const el = document.getElementById(readerId);
            if (el && el.clientWidth > 0) return el;
            await new Promise((res) => setTimeout(res, delayMs));
        }
        return document.getElementById(readerId);
    }, [readerId]);

    const startScanner = useCallback(async (cameraIdToUse = null) => {
        if (!isMountedRef.current) return;
        setIsLoading(true);
        setErrorMsg("");

        try {
            // Verify secure context (HTTPS or localhost)
            if (typeof window !== "undefined") {
                const isSecure = window.isSecureContext;
                const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
                setIsSecureContext(isSecure);
                setIsLocalhost(isLocal);

                if (!isSecure && !isLocal) {
                    throw new Error("INSECURE_CONTEXT");
                }

                if (!navigator?.mediaDevices?.getUserMedia) {
                    throw new Error("MEDIA_DEVICES_UNSUPPORTED");
                }
            }

            // Cleanup any existing instance
            await cleanupScanner();
            if (!isMountedRef.current) return;

            // Wait for dialog animation & container element to be ready
            const container = await waitForContainer();
            if (!container || !isMountedRef.current) {
                throw new Error("CONTAINER_NOT_FOUND");
            }

            const { Html5Qrcode } = await import("html5-qrcode");
            if (!isMountedRef.current) return;

            const scanner = new Html5Qrcode(readerId, {
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true,
                },
                verbose: false,
            });
            scannerRef.current = scanner;

            // Responsive QR and barcode scanning box calculation
            const config = {
                fps: 15,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const boxWidth = Math.max(Math.floor(viewfinderWidth * 0.8), 180);
                    const boxHeight = Math.max(Math.floor(boxWidth * 0.65), 140);
                    return {
                        width: Math.min(boxWidth, viewfinderWidth - 20),
                        height: Math.min(boxHeight, viewfinderHeight - 20),
                    };
                },
            };

            const onScanSuccess = (decodedText) => {
                if (!isMountedRef.current) return;
                try {
                    onScan(decodedText);
                } catch (e) {
                    console.error("Error executing onScan callback:", e);
                }
            };

            const onScanError = () => {
                // Ignore per-frame non-match scan warnings
            };

            // Detect mobile vs desktop to choose the right initial camera
            const isMobile = typeof navigator !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
            const primaryMode = isMobile ? "environment" : "user";
            const fallbackMode = isMobile ? "user" : "environment";

            let started = false;
            const primaryConstraint = cameraIdToUse ? { deviceId: cameraIdToUse } : { facingMode: primaryMode };

            // Strategy 1: Target primary camera (front webcam on laptop/PC, rear camera on mobile)
            try {
                await scanner.start(primaryConstraint, config, onScanSuccess, onScanError);
                started = true;
            } catch (firstErr) {
                console.warn("First scanner start strategy failed, attempting fallback:", firstErr);
            }

            // Strategy 2: Alternate facing mode fallback
            if (!started && isMountedRef.current && !cameraIdToUse) {
                try {
                    await scanner.clear().catch(() => { });
                    const fallbackScanner = new Html5Qrcode(readerId, {
                        experimentalFeatures: {
                            useBarCodeDetectorIfSupported: true,
                        },
                        verbose: false,
                    });
                    scannerRef.current = fallbackScanner;
                    await fallbackScanner.start({ facingMode: fallbackMode }, config, onScanSuccess, onScanError);
                    started = true;
                } catch (secondErr) {
                    console.warn("Second scanner start strategy failed:", secondErr);
                }
            }

            // Strategy 3: Direct hardware device enumeration fallback
            if (!started && isMountedRef.current && navigator?.mediaDevices?.enumerateDevices) {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevices = devices.filter((d) => d.kind === "videoinput");
                    if (videoDevices.length > 0) {
                        await scanner.clear().catch(() => { });
                        const fallbackScanner3 = new Html5Qrcode(readerId, {
                            experimentalFeatures: {
                                useBarCodeDetectorIfSupported: true,
                            },
                            verbose: false,
                        });
                        scannerRef.current = fallbackScanner3;
                        await fallbackScanner3.start({ deviceId: videoDevices[0].deviceId }, config, onScanSuccess, onScanError);
                        started = true;
                    }
                } catch (thirdErr) {
                    console.warn("Third scanner start strategy failed:", thirdErr);
                }
            }

            if (!started) {
                throw new Error("CAMERA_START_FAILED");
            }

            if (isMountedRef.current) {
                setIsScanning(true);
                setIsLoading(false);
            }

            // Query and populate available cameras in background without blocking start
            if (navigator?.mediaDevices?.enumerateDevices) {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevices = devices
                        .filter((d) => d.kind === "videoinput")
                        .map((d) => ({ id: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}` }));
                    if (isMountedRef.current && videoDevices.length) {
                        setCameras(videoDevices);
                    }
                } catch (_) { }
            }
        } catch (err) {
            if (!isMountedRef.current) return;
            console.warn("BarcodeScanner: scanner could not start:", err);
            setIsScanning(false);
            setIsLoading(false);

            const errStr = typeof err === "string" ? err : (err?.message || err?.name || String(err));
            let friendlyError = "Could not access camera.";

            if (errStr.includes("INSECURE_CONTEXT")) {
                friendlyError = "Camera access requires HTTPS or localhost. If you are using a local IP or network address, please use HTTPS.";
            } else if (errStr.includes("NotAllowedError") || errStr.includes("PermissionDeniedError") || errStr.includes("permission") || errStr.includes("denied")) {
                friendlyError = "Camera permission was denied. Please allow camera permissions in your browser address bar.";
            } else if (errStr.includes("NotFoundError") || errStr.includes("DevicesNotFoundError") || errStr.includes("No camera")) {
                friendlyError = "No camera found on this device. You can upload an image of the barcode below.";
            } else if (errStr.includes("NotReadableError") || errStr.includes("TrackStartError")) {
                friendlyError = "Camera is currently in use by another application or browser tab.";
            } else if (errStr.includes("MEDIA_DEVICES_UNSUPPORTED")) {
                friendlyError = "Your browser does not support camera capture. Please try an updated browser like Chrome or Safari.";
            } else if (errStr.includes("OverconstrainedError")) {
                friendlyError = "Camera format not supported by your camera hardware. Try uploading a photo instead.";
            }

            setErrorMsg(friendlyError);
            toast.error(friendlyError);
            onError?.(err);
        }
    }, [readerId, cleanupScanner, onScan, onError, waitForContainer]);

    // Switch between front/back or other detected cameras
    const handleSwitchCamera = async () => {
        if (cameras.length < 2) return;
        const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        const nextCameraId = cameras[nextIndex].id;
        setSelectedCameraId(nextCameraId);
        await startScanner(nextCameraId);
    };

    // Fallback: Scan from uploaded photo/file
    const handleFileScan = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingFile(true);
        try {
            let scanner = scannerRef.current;
            if (!scanner) {
                const { Html5Qrcode } = await import("html5-qrcode");
                scanner = new Html5Qrcode(readerId, { verbose: false });
                scannerRef.current = scanner;
            }

            const decodedText = await scanner.scanFile(file, true);
            if (decodedText) {
                toast.success("Barcode successfully scanned from image!");
                onScan(decodedText);
            }
        } catch (fileErr) {
            console.error("File scan failed:", fileErr);
            toast.error("Could not find a valid barcode/QR code in the uploaded image. Please try another photo.");
        } finally {
            setIsProcessingFile(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        startScanner();

        return () => {
            isMountedRef.current = false;
            cleanupScanner();
        };
    }, [startScanner, cleanupScanner]);

    const handleStop = async () => {
        await cleanupScanner();
        onClose?.();
    };

    return (
        <div className="flex flex-col items-center gap-4 py-3 w-full">
            {/* Camera Viewfinder Container */}
            <div className="relative w-full max-w-[340px] aspect-square rounded-xl border-2 border-primary/20 overflow-hidden bg-black shadow-inner">
                {/* Dedicated DOM node for html5-qrcode video/canvas injection */}
                <div id={readerId} className="w-full h-full [&_video]:object-cover" />

                {/* Overlay UI during loading or error */}
                {(!isScanning || isLoading) && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-background/95 dark:bg-black/85 text-center backdrop-blur-xs">
                        {errorMsg ? (
                            <div className="space-y-3 px-2">
                                <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-1 animate-bounce" />
                                <p className="text-xs sm:text-sm font-medium text-foreground dark:text-white leading-relaxed">
                                    {errorMsg}
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center pt-2">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => startScanner()}
                                        className="h-8 text-xs font-semibold"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                        Retry Camera
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-8 text-xs font-semibold"
                                        disabled={isProcessingFile}
                                    >
                                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                                        Upload Image
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center space-y-3">
                                <div className="relative flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                                    <Camera className="w-5 h-5 text-primary absolute" />
                                </div>
                                <p className="text-xs sm:text-sm font-medium text-muted-foreground animate-pulse">
                                    Starting camera scanner...
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Hidden file input for scanning from image/gallery */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileScan}
            />

            {/* Scanner Controls / Actions */}
            <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
                {cameras.length > 1 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSwitchCamera}
                        title="Switch Camera (Front/Rear)"
                        className="h-8 text-xs"
                    >
                        <FlipHorizontal className="w-3.5 h-3.5 mr-1.5" />
                        Switch Camera
                    </Button>
                )}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFile}
                    title="Upload photo from device"
                    className="h-8 text-xs"
                >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {isProcessingFile ? "Scanning..." : "Upload Photo"}
                </Button>

                <Button variant="ghost" size="sm" onClick={handleStop} className="h-8 text-xs text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Cancel
                </Button>
            </div>

            {!isSecureContext && !isLocalhost && (
                <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-[11px] text-destructive text-center max-w-xs">
                    Camera access requires a secure connection (HTTPS) or localhost.
                </div>
            )}

            <p className="text-[11px] text-muted-foreground text-center">
                Point camera at student ID barcode or QR code to scan.
            </p>
        </div>
    );
};

export default BarcodeScanner;

