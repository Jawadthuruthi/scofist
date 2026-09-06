/**
 * Utility functions for parsing video URLs from various platforms
 * Supports YouTube, Instagram, Facebook, Vimeo, and direct video links.
 */

export function parseVideoUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== "string") {
    return {
      isValid: false,
      platform: "other",
      originalUrl: "",
      embedUrl: "",
      thumbnailUrl: "",
      videoId: "",
    };
  }

  const url = inputUrl.trim();

  // 1. YOUTUBE
  // e.g. youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
  const ytMatch =
    url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      isValid: true,
      platform: "youtube",
      originalUrl: url,
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      displayName: "YouTube",
    };
  }

  // 2. INSTAGRAM
  // e.g. instagram.com/p/CODE, instagram.com/reel/CODE, instagram.com/tv/CODE
  const instaMatch = url.match(
    /instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i
  );

  if (instaMatch && instaMatch[1]) {
    const postId = instaMatch[1];
    return {
      isValid: true,
      platform: "instagram",
      originalUrl: url,
      videoId: postId,
      embedUrl: `https://www.instagram.com/p/${postId}/embed/`,
      thumbnailUrl: "", // Instagram prevents direct scraping of thumbnails; public viewer handles embed / poster
      displayName: "Instagram",
    };
  }

  // 3. FACEBOOK
  // e.g. facebook.com/watch/?v=ID, facebook.com/.../videos/ID, fb.watch/ID, facebook.com/reel/ID
  const isFacebook =
    /facebook\.com|fb\.watch|fb\.com/i.test(url);

  if (isFacebook) {
    // Extract video id if possible
    const fbVideoMatch =
      url.match(/(?:videos\/(?:\d+)|v=(\d+)|reel\/(\d+))/i);
    const videoId = fbVideoMatch ? (fbVideoMatch[1] || fbVideoMatch[2] || "") : "";

    return {
      isValid: true,
      platform: "facebook",
      originalUrl: url,
      videoId,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        url
      )}&show_text=false&autoplay=1`,
      thumbnailUrl: "",
      displayName: "Facebook",
    };
  }

  // 4. VIMEO
  // e.g. vimeo.com/123456789
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[3]) {
    const videoId = vimeoMatch[3];
    return {
      isValid: true,
      platform: "vimeo",
      originalUrl: url,
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1`,
      thumbnailUrl: "",
      displayName: "Vimeo",
    };
  }

  // 5. DIRECT VIDEO FILE (mp4, webm, ogg)
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) {
    return {
      isValid: true,
      platform: "other",
      originalUrl: url,
      videoId: "",
      embedUrl: url,
      thumbnailUrl: "",
      isDirectFile: true,
      displayName: "Direct Video",
    };
  }

  // Fallback: Other web URL
  const looksLikeUrl = /^https?:\/\//i.test(url);
  return {
    isValid: looksLikeUrl,
    platform: "other",
    originalUrl: url,
    videoId: "",
    embedUrl: url,
    thumbnailUrl: "",
    displayName: "External Video",
  };
}

export const PLATFORM_INFO = {
  youtube: {
    name: "YouTube",
    badgeBg: "bg-red-600/20",
    badgeBorder: "border-red-500/30",
    textColor: "text-red-400",
    brandColor: "#FF0000",
  },
  instagram: {
    name: "Instagram",
    badgeBg: "bg-pink-600/20",
    badgeBorder: "border-pink-500/30",
    textColor: "text-pink-400",
    brandColor: "#E1306C",
  },
  facebook: {
    name: "Facebook",
    badgeBg: "bg-blue-600/20",
    badgeBorder: "border-blue-500/30",
    textColor: "text-blue-400",
    brandColor: "#1877F2",
  },
  vimeo: {
    name: "Vimeo",
    badgeBg: "bg-cyan-600/20",
    badgeBorder: "border-cyan-500/30",
    textColor: "text-cyan-400",
    brandColor: "#1AB7EA",
  },
  other: {
    name: "Video",
    badgeBg: "bg-purple-600/20",
    badgeBorder: "border-purple-500/30",
    textColor: "text-purple-400",
    brandColor: "#A855F7",
  },
};
