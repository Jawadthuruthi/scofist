// components/ResultPoster.jsx - Update to read from resultPosters array

export default function ResultPoster({ result, poster, settings }) {
  // Get poster configuration from settings
  const posterConfig =
    settings?.festival?.resultPosters?.[poster - 1] ||
    settings?.festival?.[`resultPoster${poster}`]; // Fallback to old format

  if (!posterConfig) return null;

  const { backgroundImage, layout } = posterConfig;

  return (
    <div
      className="relative w-full aspect-square bg-cover bg-center"
      style={{
        backgroundImage: backgroundImage?.url
          ? `url(${backgroundImage.url})`
          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      {/* Program Info */}
      {layout?.programInfo?.visible && (
        <div
          style={{
            position: "absolute",
            left: `${layout.programInfo.x}%`,
            top: `${layout.programInfo.y}%`,
            transform: "translate(-50%, -50%)",
            color: `#${layout.programInfo.color}`,
            fontSize: `${layout.programInfo.fontSize}px`,
            fontWeight: layout.programInfo.fontWeight,
            textAlign: layout.programInfo.textAlign,
            width: "90%",
          }}
        >
          {result.programName}
        </div>
      )}

      {/* Division Info */}
      {layout?.divisionInfo?.visible && (
        <div
          style={{
            position: "absolute",
            left: `${layout.divisionInfo.x}%`,
            top: `${layout.divisionInfo.y}%`,
            transform: "translate(-50%, -50%)",
            color: `#${layout.divisionInfo.color}`,
            fontSize: `${layout.divisionInfo.fontSize}px`,
            fontWeight: layout.divisionInfo.fontWeight,
            textAlign: layout.divisionInfo.textAlign,
            width: "90%",
          }}
        >
          {result.divisionName}
        </div>
      )}

      {/* First Place */}
      {layout?.firstPlace?.visible && result.winners?.[0] && (
        <div
          style={{
            position: "absolute",
            left: `${layout.firstPlace.x}%`,
            top: `${layout.firstPlace.y}%`,
            transform: "translate(-50%, -50%)",
            color: `#${layout.firstPlace.color}`,
            fontSize: `${layout.firstPlace.fontSize}px`,
            fontWeight: layout.firstPlace.fontWeight,
            textAlign: layout.firstPlace.textAlign,
            width: "85%",
          }}
        >
          🥇 {result.winners[0].name}
          {layout.firstPlace.showTeamName && (
            <div className="text-sm mt-1 opacity-80">
              {result.winners[0].teamName}
            </div>
          )}
        </div>
      )}

      {/* Second Place */}
      {layout?.secondPlace?.visible && result.winners?.[1] && (
        <div
          style={{
            position: "absolute",
            left: `${layout.secondPlace.x}%`,
            top: `${layout.secondPlace.y}%`,
            transform: "translate(-50%, -50%)",
            color: `#${layout.secondPlace.color}`,
            fontSize: `${layout.secondPlace.fontSize}px`,
            fontWeight: layout.secondPlace.fontWeight,
            textAlign: layout.secondPlace.textAlign,
            width: "85%",
          }}
        >
          🥈 {result.winners[1].name}
          {layout.secondPlace.showTeamName && (
            <div className="text-sm mt-1 opacity-80">
              {result.winners[1].teamName}
            </div>
          )}
        </div>
      )}

      {/* Third Place */}
      {layout?.thirdPlace?.visible && result.winners?.[2] && (
        <div
          style={{
            position: "absolute",
            left: `${layout.thirdPlace.x}%`,
            top: `${layout.thirdPlace.y}%`,
            transform: "translate(-50%, -50%)",
            color: `#${layout.thirdPlace.color}`,
            fontSize: `${layout.thirdPlace.fontSize}px`,
            fontWeight: layout.thirdPlace.fontWeight,
            textAlign: layout.thirdPlace.textAlign,
            width: "85%",
          }}
        >
          🥉 {result.winners[2].name}
          {layout.thirdPlace.showTeamName && (
            <div className="text-sm mt-1 opacity-80">
              {result.winners[2].teamName}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
