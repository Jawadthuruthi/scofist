"use client";
import { useState, useEffect } from "react";
import ResultPoster from "./ResultPoster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Image as ImageIcon } from "lucide-react";

const ResultPostersSection = ({ resultData = null, settings = null }) => {
  const [winners, setWinners] = useState([]);

  useEffect(() => {
    if (resultData?.participants) {
      // Get top 3 winners
      const topWinners = resultData.participants
        .filter((p) => p.rank <= 3)
        .sort((a, b) => a.rank - b.rank)
        .map((p) => ({
          rank: p.rank,
          name: p.participantDetails?.name || "Unknown",
          codeLetter: p.codeLetter,
        }));

      setWinners(topWinners);
    }
  }, [resultData]);

  // Don't show if result is not declared or no settings
  if (!settings?.festival || !resultData?.isResultDeclared) {
    return null;
  }

  // Get available posters
  const posters = [
    {
      url: settings.festival.resultPoster1?.url,
      number: 1,
    },
    {
      url: settings.festival.resultPoster2?.url,
      number: 2,
    },
    {
      url: settings.festival.resultPoster3?.url,
      number: 3,
    },
  ].filter((poster) => poster.url); // Only show posters that have URLs

  if (posters.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-12">
      <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <ImageIcon className="h-8 w-8 text-yellow-600" />
            <CardTitle className="text-3xl font-bold text-gray-800">
              Result Posters
            </CardTitle>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Badge
              variant="outline"
              className="bg-yellow-100 text-yellow-800 border-yellow-300 px-4 py-1"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Result #{resultData.resultNumber || "N/A"}
            </Badge>
            <Badge
              variant="outline"
              className="bg-blue-100 text-blue-800 border-blue-300"
            >
              {resultData.programName}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Posters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {posters.map((poster) => (
              <ResultPoster
                key={`poster-${poster.number}`}
                posterUrl={poster.url}
                posterNumber={poster.number}
                resultNumber={resultData.resultNumber}
                winners={winners}
                programName={resultData.programName}
                divisionName={resultData.divisionName}
                className="flex-1"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultPostersSection;
