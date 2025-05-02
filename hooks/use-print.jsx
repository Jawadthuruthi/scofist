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

  // Get all styles from document with error handling
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
        margin: "0.5rem",
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
                  margin: 0 !important;
                  padding: 0 !important;
                  box-sizing: border-box;
                  
                  overflow: visible !important;
                  -webkit-print-color-adjust: exact; 
                  color-adjust: exact;
                  print-color-adjust: exact;
                }
                
                /* FIX: Ensure content maintains dimensions regardless of print dialog settings */
                #printable-content {
                  width: ${originalWidth}px !important;
                  height: auto !important;
                  min-height: ${originalHeight}px !important;
                  max-width: ${originalWidth}px !important;
                  position: relative !important;
                  box-sizing: border-box !important;
                  transform-origin: top left !important;
                  overflow: hidden !important;
                  display: block !important;
                  float: none !important;
                }
                
                /* Constrain all child elements */
                #printable-content * {
                  max-width: 100% !important;
                  box-sizing: border-box !important;
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
                h1, h2, h3, h4, h5, h6, img, table, figure {
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
              
              /* Base content styling ensures consistent display */
              #printable-content {
                width: ${originalWidth}px;
                min-height: ${originalHeight}px;
                box-sizing: border-box;
                font-family: 'Montserrat', sans-serif !important;
                position: relative;
                overflow: hidden;
              }
              
              /* Lock images to prevent overflow */
              #printable-content img {
                max-width: 100% !important;
                height: auto !important;
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

      // Optimize style application with a more efficient approach
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

      // Clone content and maintain computed styles
      const clonedContent = contentElement.cloneNode(true);

      // Apply font styling
      applyStylesToNode(clonedContent);

      // Append to the iframe
      const printableContainer =
        frameDocument.getElementById("printable-content");
      printableContainer.appendChild(clonedContent);

      // Track resources for better loading strategy
      const images = frameDocument.querySelectorAll("img");
      const totalImages = images.length;

      // Function that handles the actual printing
      const executePrint = () => {
        try {
          // Make final adjustments before printing
          const printableContent =
            frameDocument.getElementById("printable-content");
          if (printableContent) {
            // FIX: Ensure dimensions are explicitly set again right before printing
            printableContent.style.width = `${originalWidth}px`;
            printableContent.style.maxWidth = `${originalWidth}px`;
            printableContent.style.minHeight = `${originalHeight}px`;

            // Set overflow to hidden to prevent content from expanding beyond its container
            printableContent.style.overflow = "hidden";

            // Add a data attribute to track dimensions
            printableContent.setAttribute("data-original-width", originalWidth);
            printableContent.setAttribute(
              "data-original-height",
              originalHeight
            );
          }

          // Focus and print
          frameWindow.focus();

          // FIX: Add event listeners before print to maintain layout during print dialog changes
          const handleBeforePrint = () => {
            const content = frameDocument.getElementById("printable-content");
            if (content) {
              // Reinforce dimensions right before printing starts
              content.style.width = `${originalWidth}px`;
              content.style.maxWidth = `${originalWidth}px`;
              content.style.minHeight = `${originalHeight}px`;
              content.style.overflow = "hidden";
            }
          };

          frameWindow.addEventListener("beforeprint", handleBeforePrint);
          frameWindow.print();

          // Handle print completion
          frameWindow.onafterprint = () => {
            frameWindow.removeEventListener("beforeprint", handleBeforePrint);
            if (iframeRef.current) {
              document.body.removeChild(iframe);
              iframeRef.current = null;
            }
            if (onAfterPrint) onAfterPrint();
          };

          // Fallback for browsers that don't support onafterprint
          printTimeoutRef.current = setTimeout(() => {
            frameWindow.removeEventListener("beforeprint", handleBeforePrint);
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

      // More efficient resource loading strategy
      const waitForResourcesAndPrint = () => {
        // Create a single promise for all resources
        Promise.all([
          // Font loading promise
          frameDocument.fonts.ready,

          // Images loading promise - only if there are images
          ...(totalImages > 0
            ? [
                Promise.all(
                  Array.from(images).map(
                    (img) =>
                      new Promise((resolve) => {
                        if (img.complete) resolve();
                        else {
                          img.onload = resolve;
                          img.onerror = resolve; // Continue even if image fails
                        }
                      })
                  )
                ),
              ]
            : []),
        ])
          .then(() => {
            // Short delay for final rendering
            setTimeout(executePrint, 250);
          })
          .catch((error) => {
            console.warn("Resource loading issue:", error);
            // Continue with printing even if resource loading fails
            setTimeout(executePrint, 250);
          });
      };

      // Start resource loading process
      waitForResourcesAndPrint();
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
