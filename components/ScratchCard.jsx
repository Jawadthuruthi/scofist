"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ScratchCard({
  letter,
  size = 200,
  brushRadius = 16,
  onRevealChange,
}) {
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const containerRef = useRef(null);

  const [isScratching, setIsScratching] = useState(false);
  const [revealPercent, setRevealPercent] = useState(0);
  const [fullyRevealed, setFullyRevealed] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState(false);

  // Refs for performance
  const revealCheckTimeoutRef = useRef();
  const lastRevealCheck = useRef(0);

  // Reset card state when letter changes (new generation)
  useEffect(() => {
    setRevealPercent(0);
    setFullyRevealed(false);
    setKeyboardMode(false);
    setIsScratching(false);

    // Force canvas reset by clearing and reinitializing
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.opacity = "1"; // Ensure overlay is visible
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    }
  }, [letter]);

  /**
   * Initialize canvases with proper scaling for device pixel ratio
   */
  const initializeCanvases = useCallback(() => {
    if (typeof window === "undefined") return;

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    if (!canvas || !maskCanvas) return;

    const dpr = window.devicePixelRatio || 1;

    // Set actual size for both canvases
    [canvas, maskCanvas].forEach((c) => {
      c.width = size * dpr;
      c.height = size * dpr;
      c.style.width = `${size}px`;
      c.style.height = `${size}px`;

      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
      }
    });

    // Initialize overlay canvas (visible scratch surface)
    const overlayCtx = canvas.getContext("2d");
    if (overlayCtx) {
      overlayCtx.fillStyle = "#94a3b8"; // bg-slate-400
      overlayCtx.fillRect(0, 0, size, size);
    }

    // Initialize mask canvas (tracking scratched areas)
    const maskCtx = maskCanvas.getContext("2d");
    if (maskCtx) {
      maskCtx.fillStyle = "#000000";
      maskCtx.fillRect(0, 0, size, size);
    }
  }, [size]);

  /**
   * Calculate reveal percentage by sampling mask canvas pixels
   * Debounced to avoid performance issues during rapid scratching
   */
  const calculateRevealPercent = useCallback(() => {
    const now = Date.now();
    if (now - lastRevealCheck.current < 50) return; // Throttle to max 20fps

    lastRevealCheck.current = now;

    if (revealCheckTimeoutRef.current) {
      clearTimeout(revealCheckTimeoutRef.current);
    }

    revealCheckTimeoutRef.current = setTimeout(() => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;

      const ctx = maskCanvas.getContext("2d");
      if (!ctx) return;

      try {
        // Sample pixels at lower resolution for performance
        const sampleSize = 4; // Sample every 4th pixel
        const imageData = ctx.getImageData(
          0,
          0,
          maskCanvas.width,
          maskCanvas.height
        );
        const data = imageData.data;

        let totalSamples = 0;
        let revealedSamples = 0;

        // Sample pixels in a grid pattern
        for (let y = 0; y < maskCanvas.height; y += sampleSize) {
          for (let x = 0; x < maskCanvas.width; x += sampleSize) {
            const index = (y * maskCanvas.width + x) * 4;
            totalSamples++;

            // Check alpha channel - if it's low, pixel is "scratched"
            if (data[index + 3] < 128) {
              revealedSamples++;
            }
          }
        }

        const percent =
          totalSamples > 0 ? (revealedSamples / totalSamples) * 100 : 0;
        setRevealPercent(Math.round(percent));
        onRevealChange && onRevealChange(percent);

        // Auto-reveal at 40% threshold
        if (percent >= 40 && !fullyRevealed) {
          setFullyRevealed(true);

          // Hide overlay canvas
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.style.opacity = "0";
          }
        }
      } catch (error) {
        console.error("Error calculating reveal percent:", error);
      }
    }, 200); // Debounce by 200ms
  }, [fullyRevealed, onRevealChange]);

  /**
   * Draw a scratch stroke on both overlay and mask canvases
   */
  const scratch = useCallback(
    (x, y) => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;

      if (!canvas || !maskCanvas || fullyRevealed) return;

      const dpr = window.devicePixelRatio || 1;

      // Draw on overlay canvas (visual feedback)
      const overlayCtx = canvas.getContext("2d");
      if (overlayCtx) {
        overlayCtx.globalCompositeOperation = "destination-out";
        overlayCtx.beginPath();
        overlayCtx.arc(x * dpr, y * dpr, brushRadius * dpr, 0, Math.PI * 2);
        overlayCtx.fill();
      }

      // Draw on mask canvas (tracking)
      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        maskCtx.globalCompositeOperation = "destination-out";
        maskCtx.beginPath();
        maskCtx.arc(x * dpr, y * dpr, brushRadius * dpr, 0, Math.PI * 2);
        maskCtx.fill();
      }

      calculateRevealPercent();
    },
    [brushRadius, fullyRevealed, calculateRevealPercent]
  );

  /**
   * Handle pointer events (mouse and touch)
   */
  const handlePointerDown = (e) => {
    if (fullyRevealed) return;

    setIsScratching(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      scratch(x, y);
    }

    // Capture pointer for smooth dragging
    e.target.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e) => {
    if (!isScratching || fullyRevealed) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      scratch(x, y);
    }
    e.preventDefault();
  };

  const handlePointerUp = (e) => {
    setIsScratching(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  /**
   * Keyboard accessibility support
   */
  const handleKeyDown = (e) => {
    if (fullyRevealed) return;

    switch (e.key) {
      case " ":
      case "Enter":
        e.preventDefault();
        setKeyboardMode(!keyboardMode);
        break;

      case "r":
      case "R":
        if (revealPercent >= 60) {
          e.preventDefault();
          setFullyRevealed(true);
          if (canvasRef.current) {
            canvasRef.current.style.opacity = "0";
          }
        }
        break;

      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
        if (keyboardMode) {
          e.preventDefault();

          // Simulate scratching in the direction of arrow key
          const centerX = size / 2;
          const centerY = size / 2;
          const stepSize = brushRadius;

          let scratchX = centerX;
          let scratchY = centerY;

          switch (e.key) {
            case "ArrowUp":
              scratchY -= stepSize;
              break;
            case "ArrowDown":
              scratchY += stepSize;
              break;
            case "ArrowLeft":
              scratchX -= stepSize;
              break;
            case "ArrowRight":
              scratchX += stepSize;
              break;
          }

          // Keep within bounds
          scratchX = Math.max(
            brushRadius,
            Math.min(size - brushRadius, scratchX)
          );
          scratchY = Math.max(
            brushRadius,
            Math.min(size - brushRadius, scratchY)
          );

          scratch(scratchX, scratchY);
        }
        break;
    }
  };

  // Initialize canvases on mount and when letter changes
  useEffect(() => {
    initializeCanvases();
  }, [initializeCanvases, letter]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (revealCheckTimeoutRef.current) {
        clearTimeout(revealCheckTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative group">
      <Card className="relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg">
        {/* Letter Display */}
        <div
          ref={containerRef}
          className="relative flex items-center justify-center bg-background"
          style={{ width: size, height: size }}
          role="button"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label={`Scratch card with letter ${letter.toUpperCase()}. ${
            fullyRevealed ? "Revealed" : `${revealPercent}% revealed`
          }. ${keyboardMode ? "Keyboard scratch mode active" : "Press space to enable keyboard scratch mode"}`}
          aria-live="polite"
        >
          <span className="text-6xl font-bold text-foreground select-none">
            {letter.toUpperCase()}
          </span>

          {/* Scratch Overlay Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 cursor-crosshair transition-opacity duration-500"
            style={{
              touchAction: "none",
              userSelect: "none",
              opacity: fullyRevealed ? 0 : 1,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />

          {/* Hidden mask canvas for calculations */}
          <canvas
            ref={maskCanvasRef}
            className="absolute inset-0 opacity-0 pointer-events-none"
            style={{ zIndex: -1 }}
          />
        </div>

        {/* Status Indicators */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {fullyRevealed && (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-800 border-green-300"
            >
              Revealed
            </Badge>
          )}

          {keyboardMode && (
            <Badge variant="outline" className="text-xs">
              KB Mode
            </Badge>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{revealPercent}% revealed</span>
            {revealPercent >= 60 && !fullyRevealed && (
              <span className="text-green-600 font-medium">
                Press R to reveal
              </span>
            )}
          </div>

          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${revealPercent}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Keyboard Instructions (shown on focus) */}
      <div className="absolute -bottom-16 left-0 right-0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 z-10">
        <div className="text-xs text-center bg-background border rounded p-2 shadow-lg">
          <p>
            Space/Enter: Toggle scratch mode • Arrow keys: Scratch • R: Reveal
            (40%+)
          </p>
        </div>
      </div>
    </div>
  );
}
