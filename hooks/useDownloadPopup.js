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

export const useDownloadPopup = (popupRef, filename = "Popup_Image.jpeg") => {
  const handleDownload = useCallback(async () => {
    if (!popupRef.current) return;
    try {
      const el = popupRef.current;

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

      const html2canvas = (await import("html2canvas")).default;

      // Use a minimum scale of 3 for crisp, 300DPI-equivalent Retina clarity
      const scale = Math.max(3, (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1) * 2);

      const canvas = await html2canvas(el, { 
        scale: scale,
        width: currentWidth,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        logging: false,
        imageTimeout: 15000,
        onclone: async (clonedDoc) => {
          // Disable all CSS animations and transitions in the cloned document so it renders in its final, stable state
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
            clonedPopup.style.maxHeight = 'none';
            clonedPopup.style.height = 'auto';
            clonedPopup.style.width = currentWidth + 'px';
            clonedPopup.style.maxWidth = currentWidth + 'px';
            clonedPopup.style.minWidth = 'unset';
            clonedPopup.style.position = 'relative';
            clonedPopup.style.transform = 'none';
            clonedPopup.style.left = 'auto';
            clonedPopup.style.top = 'auto';
            clonedPopup.style.margin = '0';
            clonedPopup.style.overflow = 'visible';
            clonedPopup.style.filter = 'none';

            // Expand any inner scrollable areas
            clonedPopup.querySelectorAll('.overflow-y-auto, .overflow-hidden, .overflow-x-auto, [class*="max-h-"]').forEach((div) => {
              div.style.maxHeight = 'none';
              div.style.height = 'auto';
              div.style.overflow = 'visible';
            });

            // Fix sticky elements moving to the top in the captured image
            clonedPopup.querySelectorAll('.sticky').forEach((div) => {
              div.style.position = 'relative';
              div.style.top = 'auto';
            });

            // Ensure images in cloned document are fully ready
            await waitForImages(clonedPopup);
          }
        }
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
    }
  }, [popupRef, filename]);

  return { handleDownload };
};

