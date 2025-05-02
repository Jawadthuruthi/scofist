import { useCallback, useRef, useEffect } from "react";

/**
 * An enhanced print hook that maintains layout regardless of print dialog settings
 * with improved performance and cross-device compatibility.
 *
 * @param {Object} options Configuration options
 * @param {Function} options.content Function that returns the element to print
 * @param {string} options.documentTitle Title for the print document
 * @param {Function} options.onAfterPrint Callback after printing completes
 * @param {Function} options.onPrintError Callback when print errors occur
 * @param {Object} options.pageStyle Custom page styles (optional)
 * @returns {Function} Print function to trigger printing
 */
const usePrint = ({
  content,
  documentTitle,
  onAfterPrint,
  onPrintError,
  pageStyle = {},
}) => {
  const iframeRef = useRef(null);
  const printTimeoutRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (printTimeoutRef.current) {
        clearTimeout(printTimeoutRef.current);
      }
      if (iframeRef.current) {
        try {
          document.body.removeChild(iframeRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // Get all styles from document
  const getDocumentStyles = useCallback(() => {
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

      return styleSheets
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
      return "";
    }
  }, []);

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

      // Calculate the original dimensions before cloning
      const originalRect = contentElement.getBoundingClientRect();
      const originalWidth = originalRect.width;
      const originalHeight = originalRect.height;

      // Clean up previous iframe if exists
      if (iframeRef.current) {
        document.body.removeChild(iframeRef.current);
      }

      // Clear any existing timeout
      if (printTimeoutRef.current) {
        clearTimeout(printTimeoutRef.current);
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

      // Get styles text
      const stylesText = getDocumentStyles();

      // Default page style that maintains dimensions
      const defaultPageStyle = {
        margin: "0",
        padding: "0",
        size: "auto",
        ...pageStyle,
      };

      // Convert page style object to CSS
      const pageStyleCSS = Object.entries(defaultPageStyle)
        .map(([key, value]) => `${key}: ${value};`)
        .join(" ");

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
                @page { ${pageStyleCSS} }
                
                html, body {
                  height: 100%;
                  width: 100%;
                  margin: 0;
                  padding: 16px;
                  overflow: visible !important;
                  -webkit-print-color-adjust: exact; 
                  color-adjust: exact;
                  print-color-adjust: exact;
                }
                
                /* Keep original dimensions */
                #printable-content {
                  width: 100% !important;
                  height: auto !important;
                  min-height: ${originalHeight}px !important;
                  max-width: none !important;
                  box-sizing: border-box !important;
                  transform-origin: top left !important;
                  margin: 0 !important;
                  padding: 0 !important;
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
                
                /* Avoid page breaking inside important elements */
                h1, h2, h3, h4, h5, h6, img, table {
                  page-break-inside: avoid;
                  break-inside: avoid;
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
                width: ${originalWidth}px;
                min-height: ${originalHeight}px;
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

      // Function to enforce fonts and styles recursively with performance optimization
      const applyStylesToNode = (node) => {
        if (node.nodeType !== 1) return; // Skip non-element nodes

        // Apply font family
        if (node.style) {
          node.style.fontFamily = "'Montserrat', sans-serif";
        }

        // Use more efficient children iteration
        const children = node.children;
        if (children && children.length > 0) {
          for (let i = 0; i < children.length; i++) {
            applyStylesToNode(children[i]);
          }
        }
      };

      // Clone content and deep copy all computed styles to maintain appearance
      const clonedContent = contentElement.cloneNode(true);

      // Apply font styling
      applyStylesToNode(clonedContent);

      // Append to the iframe
      const printableContainer =
        frameDocument.getElementById("printable-content");
      printableContainer.appendChild(clonedContent);

      // Count images to ensure they're loaded
      const images = frameDocument.querySelectorAll("img");
      let loadedImages = 0;
      const totalImages = images.length;

      // Function that handles the actual printing
      const executePrint = () => {
        try {
          // Focus and print
          frameWindow.focus();
          frameWindow.print();

          // Handle print completion
          frameWindow.onafterprint = () => {
            if (iframeRef.current) {
              document.body.removeChild(iframe);
              iframeRef.current = null;
            }
            if (onAfterPrint) onAfterPrint();
          };

          // Fallback for browsers that don't support onafterprint
          printTimeoutRef.current = setTimeout(() => {
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
      };

      // Wait for resources to load before printing
      const waitForResourcesAndPrint = () => {
        // Use a Promise for font loading
        frameDocument.fonts.ready
          .then(() => {
            // Give time for rendering and apply any last-minute adjustments
            setTimeout(() => {
              // Recheck dimensions and update if needed
              const container =
                frameDocument.getElementById("printable-content");
              if (container) {
                // Ensure dimensions are preserved in print mode
                container.style.width = `${originalWidth}px`;
                container.style.minHeight = `${originalHeight}px`;
              }

              executePrint();
            }, 500); // Reduced timeout for better performance
          })
          .catch((fontError) => {
            console.warn("Font loading issue:", fontError);
            // Continue with printing even if fonts fail
            executePrint();
          });
      };

      // If there are images, wait for them to load
      if (totalImages > 0) {
        const imagePromises = Array.from(images).map((img) => {
          return new Promise((resolve) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = resolve;
              img.onerror = resolve; // Resolve even on error to continue printing
            }
          });
        });

        // Wait for all images to load (or fail)
        Promise.all(imagePromises)
          .then(waitForResourcesAndPrint)
          .catch(() => waitForResourcesAndPrint()); // Continue even if Promise.all fails
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
  }, [
    content,
    documentTitle,
    onAfterPrint,
    onPrintError,
    pageStyle,
    getDocumentStyles,
  ]);

  return handlePrint;
};

export default usePrint;
