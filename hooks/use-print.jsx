import { useCallback, useRef } from "react";

/**
 * An enhanced print hook that combines the reliability of the original implementation
 * with additional cross-device compatibility improvements.
 *
 * @param {Object} options Configuration options
 * @param {Function} options.content Function that returns the element to print
 * @param {string} options.documentTitle Title for the print document
 * @param {Function} options.onAfterPrint Callback after printing completes
 * @param {Function} options.onPrintError Callback when print errors occur
 * @returns {Function} Print function to trigger printing
 */
const usePrint = ({ content, documentTitle, onAfterPrint, onPrintError }) => {
  const iframeRef = useRef(null);

  const handlePrint = useCallback(() => {
    try {
      // Validate content
      if (!content || typeof content !== "function") {
        throw new Error("The content function is required.");
      }

      const contentElement = content();
      if (!contentElement) {
        throw new Error("Content function did not return a valid element.");
      }

      // Clean up previous iframe if exists
      if (iframeRef.current) {
        document.body.removeChild(iframeRef.current);
      }

      // Create iframe for printing
      const iframe = document.createElement("iframe");
      iframeRef.current = iframe;

      // Set iframe properties for all devices
      iframe.style.position = "absolute";
      iframe.style.top = "-10000px";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.setAttribute("title", "Print Frame");
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      const frameWindow = iframe.contentWindow;
      const frameDocument = frameWindow.document;

      // Collect all stylesheet information
      let stylesText = "";

      try {
        // Get styles from the main document
        const styleSheets = Array.from(document.styleSheets).filter(
          (styleSheet) => {
            try {
              return (
                !styleSheet.href ||
                styleSheet.href.startsWith(window.location.origin)
              );
            } catch {
              return false;
            }
          }
        );

        stylesText = styleSheets
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
      } catch (styleError) {
        console.warn("Error processing styles:", styleError);
      }

      // Write content to iframe with better device compatibility
      frameDocument.open();
      frameDocument.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${documentTitle || document.title}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            
            <!-- Font imports -->
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
            
            <style>
              /* Base font definition */
              html, body, #printable-content, #printable-content * {
                font-family: 'Montserrat', sans-serif !important;
              }
              
              /* Improved print styles for all devices */
              @media print {
                @page { 
                  margin: 0.5cm; 
                  size: auto;
                }
                
                html, body {
                  height: 100%;
                  width: 100%;
                  margin: 0;
                  padding: 0;
                  overflow: visible !important;
                  -webkit-print-color-adjust: exact; 
                  color-adjust: exact;
                  print-color-adjust: exact;
                }
                
                /* Better handling of page breaks */
                .page-break-after {
                  page-break-after: always;
                  break-after: page;
                }
                
                .page-break-before {
                  page-break-before: always;
                  break-before: page;
                }
                
                /* Hide elements not meant for printing */
                .print\\:hidden, 
                button, 
                [role="button"],
                .no-print {
                  display: none !important;
                }
              }
              
              #printable-content {
                width: 100%;
                min-height: 100%;
                box-sizing: border-box;
                font-family: 'Montserrat', sans-serif !important;
              }
              
              /* Application styles */
              ${stylesText}
            </style>
          </head>
          <body style="font-family: 'Montserrat', sans-serif !important; margin: 0; padding: 0;">
            <div id="printable-content" style="font-family: 'Montserrat', sans-serif !important;"></div>
          </body>
        </html>
      `);
      frameDocument.close();

      // Function to enforce fonts recursively
      const applyFontsRecursively = (node) => {
        if (node.style) {
          node.style.fontFamily = "'Montserrat', sans-serif";
        }
        if (node.childNodes && node.childNodes.length > 0) {
          for (let i = 0; i < node.childNodes.length; i++) {
            if (node.childNodes[i].nodeType === 1) {
              applyFontsRecursively(node.childNodes[i]);
            }
          }
        }
      };

      // Clone content and process it
      const clonedContent = contentElement.cloneNode(true);
      applyFontsRecursively(clonedContent);

      // Append to the iframe
      const printableContainer =
        frameDocument.getElementById("printable-content");
      printableContainer.appendChild(clonedContent);

      // Count images to ensure they're loaded
      const images = frameDocument.querySelectorAll("img");
      let loadedImages = 0;
      const totalImages = images.length;

      const waitForResourcesAndPrint = () => {
        // Ensure fonts are loaded before printing
        frameDocument.fonts.ready
          .then(() => {
            // Give additional time for rendering
            setTimeout(() => {
              try {
                // Focus and print
                frameWindow.focus();
                frameWindow.print();

                // Handle print completion
                frameWindow.onafterprint = () => {
                  document.body.removeChild(iframe);
                  iframeRef.current = null;
                  if (onAfterPrint) onAfterPrint();
                };

                // Fallback for browsers that don't support onafterprint
                setTimeout(() => {
                  if (iframeRef.current) {
                    document.body.removeChild(iframe);
                    iframeRef.current = null;
                    if (onAfterPrint) onAfterPrint();
                  }
                }, 2000);
              } catch (printError) {
                console.error("Print operation error:", printError);
                if (onPrintError) onPrintError(printError);

                // Clean up on error
                if (iframeRef.current) {
                  document.body.removeChild(iframe);
                  iframeRef.current = null;
                }
              }
            }, 1000);
          })
          .catch((fontError) => {
            console.warn("Font loading issue:", fontError);
            // Continue with printing even if fonts fail
            frameWindow.focus();
            frameWindow.print();
          });
      };

      // If there are images, wait for them to load
      if (totalImages > 0) {
        images.forEach((img) => {
          if (img.complete) {
            loadedImages++;
            if (loadedImages === totalImages) {
              waitForResourcesAndPrint();
            }
          } else {
            img.onload = () => {
              loadedImages++;
              if (loadedImages === totalImages) {
                waitForResourcesAndPrint();
              }
            };
            img.onerror = () => {
              loadedImages++;
              if (loadedImages === totalImages) {
                waitForResourcesAndPrint();
              }
            };
          }
        });
      } else {
        // No images, proceed directly
        waitForResourcesAndPrint();
      }
    } catch (error) {
      console.error("Print Error:", error);
      if (onPrintError) onPrintError(error);

      // Clean up on error
      if (iframeRef.current) {
        document.body.removeChild(iframeRef.current);
        iframeRef.current = null;
      }
    }
  }, [content, documentTitle, onAfterPrint, onPrintError]);

  return handlePrint;
};

export default usePrint;
