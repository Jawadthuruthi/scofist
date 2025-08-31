"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

const ResultPoster = ({
  posterUrl,
  posterNumber = 1,
  resultNumber,
  textColors = [],
  winners = [],
  programName = "",
  divisionName = "",
  className = "",
}) => {
  const posterRef = useRef();
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Position configurations for winner names (right side dots)
  const rankPositions = {
    1: { top: "46%", left: "44%" }, // Single dot line - rank 1
    2: { top: "58%", left: "44%" }, // Double dot line - rank 2
    3: { top: "71%", left: "44%" }, // Triple dot line - rank 3
  };

  const handleDownloadPoster = async () => {
    if (!posterRef.current || !imageLoaded) {
      toast.error("Please wait for the poster to load completely");
      return;
    }

    setIsLoading(true);

    try {
      const canvas = await html2canvas(posterRef.current, {
        allowTaint: true,
        useCORS: true,
        scale: 2,
        width: posterRef.current.offsetWidth,
        height: posterRef.current.offsetHeight,
        backgroundColor: null,
        logging: false,
        // Add these critical options
        foreignObjectRendering: false,
        removeContainer: true,
        onclone: (clonedDoc) => {
          // Fix text positioning in the cloned document
          const textElements = clonedDoc.querySelectorAll("[data-winner-text]");
          textElements.forEach((element) => {
            // Reset styles that can cause shifts
            element.style.lineHeight = "1";
            element.style.margin = "0";
            element.style.padding = "0";
            element.style.boxSizing = "border-box";
            element.style.fontFamily = "Arial, sans-serif";
            // Ensure transform is properly applied
            element.style.transform = "translate(-50%, -50%)";
          });

          // Handle images
          const images = clonedDoc.querySelectorAll("img");
          return Promise.all(
            Array.from(images).map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              });
            })
          );
        },
      });

      // Convert canvas to blob with high quality
      canvas.toBlob(
        (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `result-poster-${resultNumber || posterNumber}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast.success("Poster downloaded successfully!");
        },
        "image/png",
        1.0
      );
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download poster");
    } finally {
      setIsLoading(false);
    }
  };

  if (!posterUrl) {
    return (
      <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Poster {posterNumber} not available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Poster Display */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-4">
        <div
          ref={posterRef}
          className="relative w-full aspect-square mx-auto bg-white rounded-lg shadow-lg overflow-hidden"
          style={{ maxWidth: "400px" }}
        >
          {/* Background Poster Image */}
          <img
            src={posterUrl}
            alt={`Result Poster ${posterNumber}`}
            className="w-full h-full object-cover"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageLoaded(false);
              toast.error(`Failed to load poster ${posterNumber}`);
            }}
            crossOrigin="anonymous"
          />

          {/* Result Number Overlay (Left Side) */}
          <div
            className="absolute poster-text text-white text-2xl md:text-3xl"
            style={{
              top: "47%",
              left: "19%",
              textShadow: "3px 3px 6px rgba(0,0,0,0.8)",
            }}
          >
            {resultNumber || "00"}
          </div>

          {/* Program Info */}

          <div
            className="absolute text-white poster-text font-bold text-xxs"
            style={{
              top: "30%",
              left: "50%",
              textAlign: "center",
              textShadow: "3px 3px 6px rgba(0,0,0,0.8)",
            }}
          >
            <h2>{programName}</h2>
            <h3 className="text-[9px] font-semibold">{divisionName}</h3>
          </div>

          {/* Winners Overlay (Right Side Dots) */}
          {winners.slice(0, 3).map((winner, index) => {
            const rank = winner.rank;
            const position = rankPositions[rank];
            const textColor = textColors[posterNumber - 1] || "#ffffff";

            if (!position || !winner) return null;

            return (
              <div
                key={`winner-${rank}`}
                className="absolute  font-semibold poster-text text-[9px]"
                style={{
                  ...position,
                  textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
                  lineHeight: "1.1",
                  maxWidth: "120px",
                  wordBreak: "break-word",
                  color: textColor,
                }}
              >
                <div className=" px-2 py-1 rounded-md whitespace-nowrap">
                  {winner.name || "Unknown"}
                </div>
                <div className=" px-2 rounded-md whitespace-nowrap text-[8px]">
                  {winner.team || "Unknown"}
                </div>
              </div>
            );
          })}

          {/* Loading Overlay */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200/80   flex items-center justify-center">
              <Loader className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        {/* Poster Info */}
        <div className="mt-4 text-center poster-text">
          <h4 className="font-semibold text-gray-800">Poster {posterNumber}</h4>
          <p className="text-sm text-gray-600">
            Result #{resultNumber || "N/A"}
          </p>
        </div>
      </div>

      {/* Download Button */}
      <div className="text-center">
        <Button
          onClick={handleDownloadPoster}
          disabled={isLoading || !imageLoaded}
          variant="default"
          size="sm"
          className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-semibold"
        >
          {isLoading ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download Poster {posterNumber}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ResultPoster;
