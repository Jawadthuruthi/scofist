// components/ResultPoster.jsx
"use client";

import React, { useState, useEffect, useRef } from "react";

const calculateResponsiveFont = (
  baseSize,
  containerWidth,
  containerHeight,
  config
) => {
  let finalSize = baseSize;
  if (config.minFontSize) finalSize = Math.max(finalSize, config.minFontSize);
  if (config.maxFontSize) finalSize = Math.min(finalSize, config.maxFontSize);
  return Math.round(finalSize);
};

const calculateTextDimensions = (
  text,
  fontSize,
  fontWeight = "normal",
  maxWidth = 200
) => {
  if (typeof window === "undefined")
    return {
      width: 0,
      height: fontSize,
      suggestedFontSize: fontSize,
      requiresResize: false,
    };

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;

  if (textWidth > maxWidth && maxWidth > 0) {
    const suggestedSize = Math.floor((maxWidth / textWidth) * fontSize);
    return {
      width: textWidth,
      height: fontSize * 1.2,
      suggestedFontSize: Math.max(4, suggestedSize),
      requiresResize: true,
    };
  }

  return {
    width: textWidth,
    height: fontSize * 1.2,
    suggestedFontSize: fontSize,
    requiresResize: false,
  };
};

const truncateText = (text, maxLength) => {
  if (!maxLength || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
};

export default function ResultPoster({
  result,
  posterConfig,
  posterNumber = 1,
}) {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 300, height: 300 });

  useEffect(() => {
    // Keep it 300 to match PosterCustomizer's default for text size
    setContainerSize({ width: 300, height: 300 });
  }, []);

  if (!posterConfig) return null;

  const renderCustomElement = (key, config) => {
    if (!config?.visible) return null;

    const value = (config.text ?? "").trim() || config.label;
    const baseFontSize = calculateResponsiveFont(
      config.fontSize,
      containerSize.width,
      containerSize.height,
      config
    );
    const textDimensions = calculateTextDimensions(
      value,
      baseFontSize,
      config.fontWeight,
      containerSize.width * 0.9
    );
    const fontSize = config.autoFit
      ? textDimensions.suggestedFontSize
      : baseFontSize;

    const scaledFontSize = `${(fontSize / 300) * 100}cqw`;

    return (
      <div
        key={key}
        className="absolute pointer-events-none select-none"
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform:
            config.textAlign === "center"
              ? "translateX(-50%)"
              : config.textAlign === "right"
                ? "translateX(-100%)"
                : "translateX(0)",
          fontSize: scaledFontSize,
          fontFamily: config.fontFamily || "inherit",
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight || 1.2,
          letterSpacing: `${(config.letterSpacing || 0) / 300 * 100}cqw`,
          textShadow: config.textShadow
            ? "2px 2px 4px rgba(0,0,0,0.8)"
            : "none",
          maxWidth: "90%",
          whiteSpace: "nowrap",
          zIndex: 10,
        }}
      >
        {value}
      </div>
    );
  };

  const renderProgramInfo = (config) => {
    if (!config?.visible) return null;
    const value = result?.programName || "Program Name";
    const baseFontSize = calculateResponsiveFont(config.fontSize, containerSize.width, containerSize.height, config);
    const textDimensions = calculateTextDimensions(value, baseFontSize, config.fontWeight, containerSize.width * 0.9);
    const fontSize = config.autoFit ? textDimensions.suggestedFontSize : baseFontSize;
    const scaledFontSize = `${(fontSize / 300) * 100}cqw`;

    return (
      <div
        className="absolute pointer-events-none select-none"
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform:
            config.textAlign === "center"
              ? "translateX(-50%)"
              : config.textAlign === "right"
                ? "translateX(-100%)"
                : "translateX(0)",
          fontSize: scaledFontSize,
          fontFamily: config.fontFamily || "inherit",
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight,
          letterSpacing: `${(config.letterSpacing || 0) / 300 * 100}cqw`,
          textShadow: config.textShadow ? "2px 2px 4px rgba(0,0,0,0.8)" : "none",
          maxWidth: "90%",
          whiteSpace: "nowrap",
          zIndex: 10,
        }}
      >
        {value}
      </div>
    );
  };

  const renderDivisionInfo = (config) => {
    if (!config?.visible) return null;
    const value = result?.divisionName || "Division";
    const baseFontSize = calculateResponsiveFont(config.fontSize, containerSize.width, containerSize.height, config);
    const textDimensions = calculateTextDimensions(value, baseFontSize, config.fontWeight, containerSize.width * 0.9);
    const fontSize = config.autoFit ? textDimensions.suggestedFontSize : baseFontSize;
    const scaledFontSize = `${(fontSize / 300) * 100}cqw`;

    return (
      <div
        className="absolute pointer-events-none select-none"
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform:
            config.textAlign === "center"
              ? "translateX(-50%)"
              : config.textAlign === "right"
                ? "translateX(-100%)"
                : "translateX(0)",
          fontSize: scaledFontSize,
          fontFamily: config.fontFamily || "inherit",
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight,
          letterSpacing: `${(config.letterSpacing || 0) / 300 * 100}cqw`,
          textShadow: config.textShadow ? "2px 2px 4px rgba(0,0,0,0.8)" : "none",
          maxWidth: "90%",
          whiteSpace: "nowrap",
          zIndex: 10,
        }}
      >
        {value}
      </div>
    );
  };

  const renderResultNumber = (config) => {
    if (!config?.visible) return null;
    const value = config.prefix + (result?.resultNumber || "01");
    const baseFontSize = calculateResponsiveFont(config.fontSize, containerSize.width, containerSize.height, config);
    const textDimensions = calculateTextDimensions(value, baseFontSize, config.fontWeight, containerSize.width * 0.9);
    const fontSize = config.autoFit ? textDimensions.suggestedFontSize : baseFontSize;
    const scaledFontSize = `${(fontSize / 300) * 100}cqw`;

    return (
      <div
        className="absolute pointer-events-none select-none"
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform: "translateX(0)", 
          fontSize: scaledFontSize,
          fontFamily: config.fontFamily || "inherit",
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight,
          letterSpacing: `${(config.letterSpacing || 0) / 300 * 100}cqw`,
          textShadow: config.textShadow ? "2px 2px 4px rgba(0,0,0,0.8)" : "none",
          maxWidth: "90%",
          whiteSpace: "nowrap",
          zIndex: 10,
        }}
      >
        {value}
      </div>
    );
  };

  const renderWinnersList = (config, winners = [], elementKey) => {
    if (!config?.visible || !winners?.length) return null;
    const maxWinners = Math.min(winners.length, config.maxWinners || 1);
    const displayWinners = winners.slice(0, maxWinners);
    const baseFontSize = calculateResponsiveFont(config.fontSize, containerSize.width, containerSize.height, config);
    const scaledFontSize = `${(baseFontSize / 300) * 100}cqw`;

    return (
      <div
        className="absolute pointer-events-none select-none"
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform: "translateX(0)",
          maxWidth: "90%",
          zIndex: 10,
          padding: `${((config.containerPadding || 10) / 300) * 100}cqw`,
        }}
      >
        {displayWinners.map((winner, index) => {
          const displayName = config.maxNameLength
            ? truncateText(winner.studentName || winner.name || "Winner", config.maxNameLength)
            : winner.studentName || winner.name || "Winner";
          const teamDisplay =
            config.showTeamName && winner.teamName ? winner.teamName : "";

          return (
            <div
              key={index}
              className="block"
              style={{
                marginBottom:
                  index < displayWinners.length - 1
                    ? `${((config.nameSpacing || 4) / 300) * 100}cqw`
                    : "0",
                fontSize: scaledFontSize,
                fontFamily: config.fontFamily || "inherit",
                color: config.color,
                fontWeight: config.fontWeight,
                textAlign: config.textAlign,
                lineHeight: config.lineHeight,
                letterSpacing: `${(config.letterSpacing || 0) / 300 * 100}cqw`,
                textShadow: config.textShadow ? "2px 2px 4px rgba(0,0,0,0.8)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {config.showRank && `${elementKey === "firstPlace" ? 1 : elementKey === "secondPlace" ? 2 : elementKey === "thirdPlace" ? 3 : index + 1}. `}
              {displayName}
              {teamDisplay && (
                <div
                  style={{
                    fontSize: `${(Math.max(8, baseFontSize * 0.8) / 300) * 100}cqw`,
                    opacity: 0.8,
                    marginTop: `${((config.teamNameSpacing || 0) / 300) * 100}cqw`,
                  }}
                >
                  {teamDisplay}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const layout = posterConfig.layout;
  const firstPlaceWinners = result?.winners?.filter((w) => w.rank === 1) || [];
  const secondPlaceWinners = result?.winners?.filter((w) => w.rank === 2) || [];
  const thirdPlaceWinners = result?.winners?.filter((w) => w.rank === 3) || [];

  return (
    <div
      ref={containerRef}
      className="relative w-full mx-auto aspect-[3/4] bg-card overflow-hidden shadow-lg"
      style={{ containerType: "inline-size" }}
    >
      <div
        className="relative w-full h-full bg-gray-100 overflow-hidden"
        style={{
          backgroundImage: posterConfig?.backgroundImage?.url
            ? `url(${posterConfig.backgroundImage.url})`
            : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {Object.entries(layout || {})
          .filter(([key]) => key.startsWith("custom_"))
          .map(([key, config]) => renderCustomElement(key, config))}
        
        {renderProgramInfo(layout?.programInfo)}
        {renderDivisionInfo(layout?.divisionInfo)}
        {renderResultNumber(layout?.resultNumber)}
        
        {renderWinnersList(layout?.firstPlace, firstPlaceWinners, "firstPlace")}
        {renderWinnersList(layout?.secondPlace, secondPlaceWinners, "secondPlace")}
        {renderWinnersList(layout?.thirdPlace, thirdPlaceWinners, "thirdPlace")}
      </div>
    </div>
  );
}
