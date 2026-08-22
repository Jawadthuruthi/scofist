import { useCallback } from "react";
import { toast } from "sonner";

export const useDownloadPopup = (popupRef, filename = "Popup_Image.jpeg") => {
  const handleDownload = useCallback(async () => {
    if (!popupRef.current) return;
    try {
      const el = popupRef.current;
      // Capture the actual rendered width so the download matches what the user sees
      // (desktop: up to max-w-md, mobile: near full viewport width)
      const currentWidth = el.offsetWidth;
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, { 
        scale: 2,
        width: currentWidth,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const clonedPopup = clonedDoc.querySelector('[data-html2canvas-popup="true"]');
          if (clonedPopup) {
            // Remove height constraints so all rows are captured
            clonedPopup.style.maxHeight = 'none';
            clonedPopup.style.height = 'auto';
            // Preserve the same width as the visible popup (responsive)
            clonedPopup.style.width = currentWidth + 'px';
            clonedPopup.style.maxWidth = currentWidth + 'px';
            clonedPopup.style.minWidth = 'unset';
            clonedPopup.style.position = 'relative';
            clonedPopup.style.transform = 'none';
            clonedPopup.style.left = 'auto';
            clonedPopup.style.top = 'auto';
            clonedPopup.style.overflow = 'visible';

            // Expand any inner scrollable areas
            clonedPopup.querySelectorAll('.overflow-y-auto, .overflow-hidden').forEach((div) => {
              div.style.maxHeight = 'none';
              div.style.height = 'auto';
              div.style.overflow = 'visible';
            });
          }
        }
      });
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/jpeg", 1.0);
      link.click();
    } catch (error) {
      console.error("Failed to generate image", error);
      toast.error("Failed to download image");
    }
  }, [popupRef, filename]);

  return { handleDownload };
};
