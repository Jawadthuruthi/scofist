"use client";

import React, { useEffect, useRef, useState, useId, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import {
    X,
    RefreshCw,
    AlertCircle,
    Upload,
    KeyRound,
    ShieldAlert,
    SwitchCamera,
    Flashlight,
    FlashlightOff,
    Camera,
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

// Status states: "starting" | "scanning" | "file-scanned" | "error"
const BarcodeScanner = ({ onScan, onClose, onError }) => {
    const [scannerStatus, setScannerStatus] = useState("starting");
    const [errorMsg, setErrorMsg] = useState("");
    const [isPermissionDenied, setIsPermissionDenied] = useState(false);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [scannedResult, setScannedResult] = useState("");
    const [cameras, setCameras] = useState([]);
    const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
    const [currentFacingMode, setCurrentFacingMode] = useState("environment");
    const [hasTorch, setHasTorch] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);

    const rawId = useId();
    const viewportId = useRef("barcode-scanner-viewport-" + rawId.replace(/[^a-zA-Z0-9_-]/g, "")).current;

    const scannerRef = useRef(null);
    const onScanRef = useRef(onScan);
    const onCloseRef = useRef(onClose);
    const onErrorRef = useRef(onError);
    const fileInputRef = useRef(null);
    const isStartingRef = useRef(false);
    const isMountedRef = useRef(true);
    const lastScanRef = useRef({ text: "", timestamp: 0 });

    useEffect(() => {
        onScanRef.current = onScan;
        onCloseRef.current = onClose;
        onErrorRef.current = onError;
    });

    const stopAndClearScanner = useCallback(async () => {
        const scanner = scannerRef.current;
        if (scanner) {
            try {
                const state = scanner.getState();
                // State 2 = SCANNING, 3 = PAUSED
                if (state === 2 || state === 3) {
                    await scanner.stop();
                }
            } catch (_) { }
            try {
                await scanner.clear();
            } catch (_) { }
            scannerRef.current = null;
        }
        setIsTorchOn(false);
        setHasTorch(false);
        // Brief pause to allow mobile browser camera hardware to release hardware lock
        await new Promise((r) => setTimeout(r, 100));
    }, []);

    const startScanner = useCallback(async (targetConstraint) => {
        if (!isMountedRef.current || isStartingRef.current) return;
        isStartingRef.current = true;
        setScannerStatus("starting");
        setErrorMsg("");
        setIsPermissionDenied(false);

        // 1. Guard against non-secure context (plain HTTP on mobile devices blocks mediaDevices)
        if (
            typeof window !== "undefined" &&
            !window.isSecureContext &&
            window.location.hostname !== "localhost" &&
            window.location.hostname !== "127.0.0.1"
        ) {
            setErrorMsg(
                "Camera access requires HTTPS. Mobile browsers block camera access on plain HTTP (e.g. http://" +
                window.location.hostname +
                "). Please connect via HTTPS or use the Upload Photo option below."
            );
            setScannerStatus("error");
            isStartingRef.current = false;
            return;
        }

        // 2. Guard against missing mediaDevices
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
            setErrorMsg("Camera is not supported on this browser or device. Please use the Upload Photo option.");
            setScannerStatus("error");
            isStartingRef.current = false;
            return;
        }

        // Responsive qrbox sizing bounded strictly by minEdge to prevent crashes
        const config = {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                const boxSize = Math.min(minEdge, Math.max(60, Math.floor(minEdge * 0.72)));
                return { width: boxSize, height: boxSize };
            },
        };

        const handleSuccess = (decodedText) => {
            const now = Date.now();
            // Throttle duplicate scans: ignore same code within 2 seconds
            if (
                lastScanRef.current.text === decodedText &&
                now - lastScanRef.current.timestamp < 2000
            ) {
                return;
            }

            lastScanRef.current = { text: decodedText, timestamp: now };
            try {
                onScanRef.current?.(decodedText);
            } catch (err) {
                console.error("onScan error:", err);
            }
        };

        const handleError = () => {
            // Non-match frames are expected in live video scanning
        };

        try {
            // Ensure element is ready and measured
            const el = document.getElementById(viewportId);
            if (el && el.clientWidth === 0) {
                await new Promise((r) => setTimeout(r, 150));
            }

            let started = false;
            let lastError = null;

            // Strategy: For barcode/QR scanning, environment (back) camera is primary.
            // If environment fails (e.g. laptop with only webcam), fall back to user camera.
            const attempts = [];
            if (targetConstraint) {
                attempts.push(targetConstraint);
            } else {
                attempts.push({ facingMode: "environment" });
                attempts.push({ facingMode: "user" });
            }

            for (const constraint of attempts) {
                if (!isMountedRef.current) break;
                try {
                    await stopAndClearScanner();
                    if (!isMountedRef.current) break;

                    const scanner = new Html5Qrcode(viewportId, {
                        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                        verbose: false,
                    });
                    scannerRef.current = scanner;

                    await scanner.start(constraint, config, handleSuccess, handleError);

                    // Check if component unmounted while awaiting scanner.start
                    if (!isMountedRef.current) {
                        try { await scanner.stop(); } catch (_) { }
                        try { await scanner.clear(); } catch (_) { }
                        scannerRef.current = null;
                        return;
                    }

                    started = true;
                    if (constraint.facingMode) {
                        setCurrentFacingMode(constraint.facingMode);
                    }
                    break;
                } catch (err) {
                    lastError = err;
                    console.warn("Camera attempt with constraint failed:", constraint, err);
                    const errStr = String(err?.name || err?.message || err);
                    if (
                        errStr.includes("NotAllowedError") ||
                        errStr.includes("PermissionDeniedError") ||
                        errStr.includes("permission")
                    ) {
                        break;
                    }
                }
            }

            // Fallback: If facingMode attempts failed without permission denial, try device enumeration
            if (!started && isMountedRef.current) {
                const errStr = String(lastError?.name || lastError?.message || lastError);
                const isPermissionIssue =
                    errStr.includes("NotAllowedError") ||
                    errStr.includes("PermissionDeniedError") ||
                    errStr.includes("permission");

                if (!isPermissionIssue) {
                    try {
                        const availableCams = await Html5Qrcode.getCameras();
                        if (availableCams && availableCams.length > 0) {
                            await stopAndClearScanner();
                            if (isMountedRef.current) {
                                const scanner = new Html5Qrcode(viewportId, {
                                    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                                    verbose: false,
                                });
                                scannerRef.current = scanner;

                                const bestCam =
                                    availableCams.find((c) => /back|rear|environment/i.test(c.label || "")) ||
                                    availableCams[0];

                                await scanner.start(bestCam.id, config, handleSuccess, handleError);

                                if (!isMountedRef.current) {
                                    try { await scanner.stop(); } catch (_) { }
                                    try { await scanner.clear(); } catch (_) { }
                                    scannerRef.current = null;
                                    return;
                                }

                                started = true;
                            }
                        }
                    } catch (enumErr) {
                        console.warn("Fallback camera enumeration error:", enumErr);
                        lastError = enumErr || lastError;
                    }
                }
            }

            if (started && isMountedRef.current) {
                setScannerStatus("scanning");
                setErrorMsg("");

                // Asynchronously query available cameras and capabilities for switch/torch controls
                try {
                    const cams = await Html5Qrcode.getCameras();
                    if (isMountedRef.current && cams && cams.length > 0) {
                        setCameras(cams);
                    }
                } catch (_) { }

                try {
                    const torch = scannerRef.current?.getRunningTrackCameraCapabilities?.()?.torchFeature?.();
                    if (isMountedRef.current && torch?.isSupported?.()) {
                        setHasTorch(true);
                    } else {
                        setHasTorch(false);
                    }
                } catch (_) {
                    setHasTorch(false);
                }
            } else if (!started && isMountedRef.current) {
                throw lastError || new Error("Could not start camera with any available configuration.");
            }
        } catch (err) {
            if (!isMountedRef.current) return;
            setScannerStatus("error");

            const errStr = String(err?.name || err?.message || err);
            const isDenied =
                errStr.includes("NotAllowedError") ||
                errStr.includes("PermissionDeniedError") ||
                errStr.includes("permission") ||
                errStr.includes("denied");

            setIsPermissionDenied(isDenied);

            let friendly = "Could not access camera.";
            if (isDenied) {
                friendly = "Camera access was denied or blocked. Please allow camera permissions in your browser.";
            } else if (errStr.includes("NotFoundError") || errStr.includes("DevicesNotFoundError")) {
                friendly = "No camera found on this device.";
            } else if (errStr.includes("NotReadableError") || errStr.includes("TrackStartError") || errStr.includes("AbortError")) {
                friendly = "Camera is currently busy or in use by another app/tab. Please close other camera apps and retry.";
            } else if (
                typeof window !== "undefined" &&
                !window.isSecureContext &&
                window.location.hostname !== "localhost" &&
                window.location.hostname !== "127.0.0.1"
            ) {
                friendly = "Camera access requires HTTPS or localhost.";
            }

            setErrorMsg(friendly);
            onErrorRef.current?.(err);
        } finally {
            isStartingRef.current = false;
        }
    }, [viewportId, stopAndClearScanner]);

    const handlePromptPermission = async () => {
        setErrorMsg("");
        setIsPermissionDenied(false);
        try {
            // Explicit user gesture: request generic video to trigger the browser's native permission prompt
            if (navigator?.mediaDevices?.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach((track) => {
                    try { track.stop(); } catch (_) { }
                });
                await new Promise((r) => setTimeout(r, 150));
            }
        } catch (e) {
            console.warn("Direct permission prompt attempt:", e);
        }
        await startScanner();
    };

    const handleSwitchCamera = async () => {
        if (scannerStatus !== "scanning" || isStartingRef.current) return;

        let nextConstraint;
        if (cameras.length > 1) {
            const nextIdx = (currentCameraIndex + 1) % cameras.length;
            setCurrentCameraIndex(nextIdx);
            nextConstraint = cameras[nextIdx].id;
        } else {
            const nextMode = currentFacingMode === "environment" ? "user" : "environment";
            setCurrentFacingMode(nextMode);
            nextConstraint = { facingMode: nextMode };
        }

        await startScanner(nextConstraint);
    };

    const handleToggleTorch = async () => {
        const scanner = scannerRef.current;
        if (!scanner) return;
        try {
            const torch = scanner.getRunningTrackCameraCapabilities?.()?.torchFeature?.();
            if (torch?.isSupported?.()) {
                const newState = !isTorchOn;
                await torch.apply(newState);
                setIsTorchOn(newState);
            }
        } catch (err) {
            console.warn("Torch toggle failed:", err);
            toast.error("Could not toggle flashlight on this device.");
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
    }, [startScanner, stopAndClearScanner]);

    const handleStop = async () => {
        await stopAndClearScanner();
        onCloseRef.current?.();
    };

    const handleFileScan = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingFile(true);
        try {
            // Must stop active camera before file scanning
            await stopAndClearScanner();

            const scanner = new Html5Qrcode(viewportId, { verbose: false });
            scannerRef.current = scanner;

            const decodedText = await scanner.scanFile(file, true);
            if (decodedText) {
                setScannedResult(decodedText);
                setScannerStatus("file-scanned");
                toast.success("Barcode successfully scanned from image!");
                onScanRef.current?.(decodedText);
            }
        } catch (fileErr) {
            console.error("File scan failed:", fileErr);
            toast.error("Could not find a valid barcode/QR code in the image.");
            // Restart camera scan after failed file attempt
            await startScanner();
        } finally {
            setIsProcessingFile(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 py-3 w-full">
            {/* Viewfinder Frame */}
            <div className="relative w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-primary/30 shadow-lg">
                {/* 1. Dedicated DOM node for html5-qrcode video insertion */}
                <div
                    id={viewportId}
                    className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
                    style={{ minHeight: "260px", width: "100%" }}
                />

                {/* Live Scanning UI Overlays */}
                {scannerStatus === "scanning" && (
                    <>
                        {/* Viewfinder Corners */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                            <div className="relative w-full h-full max-w-[200px] max-h-[200px]">
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl" />
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr" />
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl" />
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br" />
                                {/* Laser line */}
                                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/70 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
                            </div>
                        </div>

                        {/* Top floating controls */}
                        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
                            {hasTorch && (
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    onClick={handleToggleTorch}
                                    title={isTorchOn ? "Turn off flashlight" : "Turn on flashlight"}
                                    className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-sm"
                                >
                                    {isTorchOn ? <Flashlight className="w-4 h-4 text-yellow-400" /> : <FlashlightOff className="w-4 h-4" />}
                                </Button>
                            )}

                            {(cameras.length > 1 || typeof navigator !== "undefined") && (
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    onClick={handleSwitchCamera}
                                    title="Switch Camera (Front/Back)"
                                    className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-sm"
                                >
                                    <SwitchCamera className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </>
                )}

                {/* File Scan Success Overlay */}
                {scannerStatus === "file-scanned" && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-background/95 dark:bg-black/90 text-center space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        <div>
                            <p className="text-xs font-semibold text-foreground">Barcode Detected</p>
                            <p className="text-xs text-muted-foreground font-mono mt-1 px-2 py-1 bg-muted rounded max-w-[240px] truncate">
                                {scannedResult}
                            </p>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => startScanner()}
                                className="h-8 text-xs font-medium"
                            >
                                <Camera className="w-3.5 h-3.5 mr-1.5" />
                                Resume Camera
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-8 text-xs font-medium"
                            >
                                <Upload className="w-3.5 h-3.5 mr-1.5" />
                                Upload Another
                            </Button>
                        </div>
                    </div>
                )}

                {/* Error or Permission Needed Overlay */}
                {scannerStatus === "error" && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-background/95 dark:bg-black/90 text-center overflow-y-auto">
                        <div className="space-y-3 flex flex-col items-center w-full">
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

                                    <div className="text-[11px] text-muted-foreground text-left bg-muted/60 dark:bg-muted/20 p-2.5 rounded-lg space-y-1.5 w-full border border-border/50">
                                        <p className="font-semibold text-foreground text-[11px]">If the prompt does not appear:</p>
                                        <p>1. On mobile: Tap the <strong>lock / site settings</strong> icon in the address bar &rarr; set <strong>Camera = Allow</strong>.</p>
                                        <p>2. On iOS: Go to <em>Settings &gt; Safari &gt; Camera &gt; Allow</em>.</p>
                                        <p>3. On desktop: In the address bar, click the <strong>tune/sliders icon 🎛️</strong> &rarr; set <strong>Camera = Allow</strong>.</p>
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
                                        <Button variant="default" size="sm" onClick={() => startScanner()} className="h-8 text-xs">
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
                    </div>
                )}

                {/* Starting / Loading Overlay */}
                {scannerStatus === "starting" && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-background/95 dark:bg-black/90 text-center overflow-y-auto">
                        <div className="flex flex-col items-center space-y-2.5">
                            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-xs sm:text-sm font-medium">Opening camera...</p>
                            <p className="text-[11px] text-muted-foreground">Please allow camera permissions if prompted</p>
                        </div>
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

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center justify-center gap-2">
                {scannerStatus === "scanning" && (cameras.length > 1 || typeof navigator !== "undefined") && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSwitchCamera}
                        className="h-8 text-xs"
                    >
                        <SwitchCamera className="w-3.5 h-3.5 mr-1.5" />
                        Switch Camera
                    </Button>
                )}

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

            <p className="text-[11px] text-muted-foreground text-center max-w-[280px]">
                Point camera at student ID card or barcode to scan automatically.
            </p>
        </div>
    );
};

export default BarcodeScanner;
