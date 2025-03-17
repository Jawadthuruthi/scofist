import { useCallback } from "react";

const usePrint = ({ content, documentTitle, onAfterPrint, onPrintError }) => {
  const handlePrint = useCallback(() => {
    try {
      if (!content || typeof content !== "function") {
        throw new Error("The content function is required.");
      }

      const contentElement = content();
      if (!contentElement) {
        throw new Error("Content function did not return a valid element.");
      }

      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.top = "-10000px";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const frameWindow = iframe.contentWindow;
      const frameDocument = frameWindow.document;

      // Copy styles
      const styles = Array.from(document.styleSheets)
        .filter((styleSheet) => {
          try {
            return (
              !styleSheet.href ||
              styleSheet.href.startsWith(window.location.origin)
            );
          } catch {
            return false;
          }
        })
        .map((styleSheet) => {
          try {
            return Array.from(styleSheet.cssRules)
              .map((rule) => rule.cssText)
              .join("\n");
          } catch {
            return "";
          }
        })
        .join("\n");

      // Write content to iframe
      frameDocument.open();
      frameDocument.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${documentTitle || document.title}</title>
              <style>
                @media print {
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  @page { margin: 0.5cm; }
                }
                ${styles}
              </style>
            </head>
            <body>
              <div id="printable-content"></div>
            </body>
          </html>
        `);
      frameDocument.close();

      // Append cloned content
      frameDocument
        .getElementById("printable-content")
        .appendChild(contentElement.cloneNode(true));

      // Use iframe.onload to print immediately
      iframe.onload = () => {
        frameWindow.focus();
        frameWindow.print();
      };
    } catch (error) {
      if (onPrintError) onPrintError(error);
      else console.error("Print Error:", error);
    }
  }, [content, documentTitle, onAfterPrint, onPrintError]);

  return handlePrint;
};

export default usePrint;
