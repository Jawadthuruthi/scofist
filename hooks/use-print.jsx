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

      // Create iframe for printing
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

      // Write content to iframe with direct Google Fonts import
      frameDocument.open();
      frameDocument.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${documentTitle || document.title}</title>
            <!-- Direct Google Fonts Import - More reliable than copying from main document -->
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
            <style>
              /* Base font definition */
              html, body, #printable-content, #printable-content * {
                font-family: 'Montserrat', sans-serif !important;
              }
              
              /* Print-specific styles */
              @media print {
                @page { 
                  margin: 0.5cm; 
                  size: auto;
                }
                body { 
                  -webkit-print-color-adjust: exact; 
                  print-color-adjust: exact; 
                  font-family: 'Montserrat', sans-serif !important;
                }
                .print\\:hidden, button, [role="button"] {
                  display: none !important;
                }
              }
              
              /* Application styles */
              ${styles}
            </style>
          </head>
          <body style="font-family: 'Montserrat', sans-serif !important;">
            <div id="printable-content" style="font-family: 'Montserrat', sans-serif !important;"></div>
          </body>
        </html>
      `);
      frameDocument.close();

      // Process the node tree to enforce fonts
      const applyFontsRecursively = (node) => {
        if (node.style) {
          node.style.fontFamily = "'Montserrat', sans-serif";
        }
        if (node.childNodes && node.childNodes.length > 0) {
          for (let i = 0; i < node.childNodes.length; i++) {
            if (node.childNodes[i].nodeType === 1) {
              // Element node
              applyFontsRecursively(node.childNodes[i]);
            }
          }
        }
      };

      // Clone and append content
      const clonedContent = contentElement.cloneNode(true);
      applyFontsRecursively(clonedContent);

      frameDocument
        .getElementById("printable-content")
        .appendChild(clonedContent);

      // Ensure fonts are loaded before printing
      frameDocument.fonts.ready
        .then(() => {
          setTimeout(() => {
            try {
              frameWindow.focus();
              frameWindow.print();

              // Cleanup after printing
              frameWindow.onafterprint = () => {
                document.body.removeChild(iframe);
                if (onAfterPrint) onAfterPrint();
              };
            } catch (printError) {
              console.error("Print operation error:", printError);
              if (onPrintError) onPrintError(printError);
            }
          }, 1000); // Longer timeout for font loading
        })
        .catch((err) => {
          console.warn("Font loading issue:", err);
          // Print anyway even if font loading fails
          frameWindow.focus();
          frameWindow.print();
        });
    } catch (error) {
      if (onPrintError) onPrintError(error);
      else console.error("Print Error:", error);
    }
  }, [content, documentTitle, onAfterPrint, onPrintError]);

  return handlePrint;
};

export default usePrint;
