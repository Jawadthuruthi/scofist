import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Preloads and decodes all images inside a given DOM node.
 */
const waitForImages = async (container) => {
  if (!container) return;
  const images = Array.from(container.querySelectorAll("img"));
  if (images.length === 0) return;

  await Promise.all(
    images.map(async (img) => {
      if (!img.crossOrigin && img.src && !img.src.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      if (!img.complete) {
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }
      if (img.decode) {
        try {
          await img.decode();
        } catch (_) {
          // Continue even if decode fails on unsupported image formats
        }
      }
    })
  );
};

/**
 * Converts all SVG elements inside the cloned container into static, crisp high-DPI
 * canvas elements with all colors, stroke, fill, and dimensions baked in.
 * This completely resolves html2canvas's failure to compute `stroke="currentColor"`,
 * CSS inheritance, and SVG rendering bugs in rasterization.
 */
const fixSvgElements = async (clonedContainer, originalContainer) => {
  if (!clonedContainer) return;
  const clonedSvgs = Array.from(clonedContainer.querySelectorAll("svg"));
  if (clonedSvgs.length === 0) return;

  await Promise.all(
    clonedSvgs.map(async (clonedSvg) => {
      try {
        const idx = clonedSvg.getAttribute("data-icon-idx");
        const origSvg =
          (idx !== null && originalContainer
            ? originalContainer.querySelector(`[data-icon-idx="${idx}"]`)
            : null) || clonedSvg;

        const win = origSvg.ownerDocument?.defaultView || window;
        const computedStyle = win.getComputedStyle(origSvg);
        const clonedWin = clonedSvg.ownerDocument?.defaultView || win;
        const clonedStyle = clonedWin.getComputedStyle(clonedSvg);

        // If either the original or cloned element is explicitly hidden, skip rendering
        if (clonedStyle.display === "none") {
          return;
        }

        const rect = origSvg.getBoundingClientRect ? origSvg.getBoundingClientRect() : { width: 0, height: 0 };
        const width = Math.max(
          1,
          Math.round(rect.width || origSvg.clientWidth || parseFloat(clonedStyle.width) || parseFloat(computedStyle.width) || 16)
        );
        const height = Math.max(
          1,
          Math.round(rect.height || origSvg.clientHeight || parseFloat(clonedStyle.height) || parseFloat(computedStyle.height) || 16)
        );

        // Resolve text color and stroke
        const color = clonedStyle.color || computedStyle.color || "#000000";
        const rawStroke = clonedStyle.stroke || computedStyle.stroke;
        const stroke =
          rawStroke && rawStroke !== "none" && rawStroke !== "transparent"
            ? rawStroke === "currentColor"
              ? color
              : rawStroke
            : color;

        const rawFill = clonedStyle.fill || computedStyle.fill;
        const fill =
          rawFill && rawFill !== "none" && rawFill !== "transparent"
            ? rawFill === "currentColor"
              ? color
              : rawFill
            : "none";

        const strokeWidth =
          clonedStyle.strokeWidth || computedStyle.strokeWidth || clonedSvg.getAttribute("stroke-width") || "2";
        const strokeLinecap =
          clonedStyle.strokeLinecap || computedStyle.strokeLinecap || clonedSvg.getAttribute("stroke-linecap") || "round";
        const strokeLinejoin =
          clonedStyle.strokeLinejoin || computedStyle.strokeLinejoin || clonedSvg.getAttribute("stroke-linejoin") || "round";

        // Build a standalone SVG clone with all inline attributes explicitly defined
        const standaloneSvg = clonedSvg.cloneNode(true);
        standaloneSvg.removeAttribute("data-icon-idx");
        standaloneSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        standaloneSvg.setAttribute("width", width.toString());
        standaloneSvg.setAttribute("height", height.toString());
        if (!standaloneSvg.getAttribute("viewBox")) {
          standaloneSvg.setAttribute("viewBox", `0 0 24 24`);
        }

        standaloneSvg.setAttribute("stroke", stroke);
        standaloneSvg.setAttribute("fill", fill);
        standaloneSvg.setAttribute("stroke-width", strokeWidth);
        standaloneSvg.setAttribute("stroke-linecap", strokeLinecap);
        standaloneSvg.setAttribute("stroke-linejoin", strokeLinejoin);
        standaloneSvg.style.color = color;
        standaloneSvg.style.stroke = stroke;
        standaloneSvg.style.fill = fill;

        // Ensure every child path, circle, rect, line, etc. has explicit stroke/fill
        standaloneSvg.querySelectorAll("path, circle, line, polyline, polygon, rect").forEach((shape) => {
          const s = shape.getAttribute("stroke");
          if (!s || s === "currentColor") {
            shape.setAttribute("stroke", stroke);
          }
          const f = shape.getAttribute("fill");
          if (f === "currentColor") {
            shape.setAttribute("fill", fill !== "none" ? fill : color);
          } else if (!f && fill !== "none") {
            shape.setAttribute("fill", fill);
          }
          shape.setAttribute("stroke-width", strokeWidth);
          shape.setAttribute("stroke-linecap", strokeLinecap);
          shape.setAttribute("stroke-linejoin", strokeLinejoin);
        });

        // Convert standalone SVG to data URL
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(standaloneSvg);
        const svgDataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

        // Rasterize to high-DPI canvas
        const img = new Image();
        img.crossOrigin = "anonymous";

        const loaded = await new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = svgDataUrl;
        });

        if (loaded) {
          const canvas = clonedSvg.ownerDocument.createElement("canvas");
          const pixelRatio = 3; // 300DPI equivalent Retina crispness
          canvas.width = width * pixelRatio;
          canvas.height = height * pixelRatio;
          canvas.style.width = width + "px";
          canvas.style.height = height + "px";
          canvas.style.display =
            clonedStyle.display === "inline" ? "inline-block" : clonedStyle.display || "inline-block";
          canvas.style.verticalAlign = clonedStyle.verticalAlign || "middle";
          canvas.style.margin = clonedStyle.margin || "0";
          canvas.style.flexShrink = "0";
          canvas.className = clonedSvg.getAttribute("class") || "";

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            clonedSvg.parentNode?.replaceChild(canvas, clonedSvg);
            return;
          }
        }

        // Fallback: apply explicit attributes directly onto clonedSvg
        clonedSvg.setAttribute("width", width.toString());
        clonedSvg.setAttribute("height", height.toString());
        clonedSvg.setAttribute("stroke", stroke);
        clonedSvg.setAttribute("fill", fill);
        clonedSvg.setAttribute("stroke-width", strokeWidth);
        clonedSvg.setAttribute("stroke-linecap", strokeLinecap);
        clonedSvg.setAttribute("stroke-linejoin", strokeLinejoin);
        clonedSvg.style.color = color;
        clonedSvg.style.stroke = stroke;
        clonedSvg.style.fill = fill;
        clonedSvg.style.width = width + "px";
        clonedSvg.style.height = height + "px";
        clonedSvg.querySelectorAll("path, circle, line, polyline, polygon, rect").forEach((s) => {
          if (!s.getAttribute("stroke") || s.getAttribute("stroke") === "currentColor") {
            s.setAttribute("stroke", stroke);
          }
        });
      } catch (err) {
        console.warn("Could not convert SVG for download:", err);
      }
    })
  );
};

export const useDownloadPopup = (popupRef, filename = "Popup_Image.jpeg") => {
  const handleDownload = useCallback(async () => {
    if (!popupRef.current) return;
    const el = popupRef.current;
    const originalSvgs = Array.from(el.querySelectorAll("svg"));

    try {
      // 0. Mark original SVGs with indexing attribute so clonedDoc SVGs can map 1-to-1 to computed styles
      originalSvgs.forEach((svg, idx) => {
        svg.setAttribute("data-icon-idx", String(idx));
      });

      // 1. Wait for web fonts to be completely ready before rasterizing
      if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (_) {}
      }

      // 2. Wait for all images inside the popup element to be loaded and decoded
      await waitForImages(el);

      // 3. Allow any active modal entry animations / layout shifts to settle
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // 4. Capture accurate integer width
      const rect = el.getBoundingClientRect();
      const currentWidth = Math.ceil(rect.width) || el.offsetWidth || 600;

      // 5. Determine background color based on active theme
      const isDarkMode = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
      const computedBg = typeof window !== "undefined" ? window.getComputedStyle(el).backgroundColor : "";
      const defaultBg = isDarkMode ? "#0f172a" : "#ffffff";
      const resolvedBg =
        computedBg && computedBg !== "rgba(0, 0, 0, 0)" && computedBg !== "transparent" ? computedBg : defaultBg;

      const html2canvas = (await import("html2canvas")).default;

      // Use a minimum scale of 3 for crisp, 300DPI-equivalent clarity
      const scale = Math.max(3, (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1) * 2);

      const canvas = await html2canvas(el, {
        scale: scale,
        width: currentWidth,
        useCORS: true,
        allowTaint: false,
        backgroundColor: resolvedBg,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        imageTimeout: 15000,
        onclone: async (clonedDoc) => {
          // Sync dark mode class if applicable
          if (isDarkMode) {
            clonedDoc.documentElement.classList.add("dark");
          } else {
            clonedDoc.documentElement.classList.remove("dark");
          }

          // Disable all CSS animations and transitions in the cloned document
          const style = clonedDoc.createElement("style");
          style.innerHTML = `
            *, *::before, *::after {
              animation: none !important;
              animation-duration: 0s !important;
              transition: none !important;
              transition-duration: 0s !important;
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
            }
          `;
          clonedDoc.head.appendChild(style);

          const clonedPopup = clonedDoc.querySelector('[data-html2canvas-popup="true"]');
          if (clonedPopup) {
            // Remove height constraints so all rows and sections are captured cleanly
            clonedPopup.style.maxHeight = "none";
            clonedPopup.style.height = "auto";
            clonedPopup.style.width = currentWidth + "px";
            clonedPopup.style.maxWidth = currentWidth + "px";
            clonedPopup.style.minWidth = "unset";
            clonedPopup.style.position = "relative";
            clonedPopup.style.transform = "none";
            clonedPopup.style.left = "auto";
            clonedPopup.style.top = "auto";
            clonedPopup.style.margin = "0";
            clonedPopup.style.overflow = "visible";
            clonedPopup.style.filter = "none";

            // Expand any inner scrollable areas
            clonedPopup
              .querySelectorAll('.overflow-y-auto, .overflow-hidden, .overflow-x-auto, [class*="max-h-"]')
              .forEach((div) => {
                div.style.maxHeight = "none";
                div.style.height = "auto";
                div.style.overflow = "visible";
              });

            // Fix sticky elements moving to the top in the captured image
            clonedPopup.querySelectorAll(".sticky").forEach((div) => {
              div.style.position = "relative";
              div.style.top = "auto";
            });

            // Convert and bake all SVG elements (including Lucide icons) into crisp canvas elements
            await fixSvgElements(clonedPopup, el);

            // Ensure images in cloned document are fully ready
            await waitForImages(clonedPopup);
          }
        },
      });

      const isPng = filename.toLowerCase().endsWith(".png");
      const mimeType = isPng ? "image/png" : "image/jpeg";
      const quality = isPng ? undefined : 1.0;

      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL(mimeType, quality);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to generate image", error);
      toast.error("Failed to download image");
    } finally {
      // Clean up temporary data-icon-idx attributes from original DOM
      originalSvgs.forEach((svg) => {
        svg.removeAttribute("data-icon-idx");
      });
    }
  }, [popupRef, filename]);

  return { handleDownload };
};
