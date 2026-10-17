// hooks/use-clipboard.js
"use client";

import { useState, useCallback } from "react";
import { copyToClipboard as copyUtil } from "@/lib/utils";

export function useClipboard() {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(async (text) => {
    try {
      const success = await copyUtil(text);
      if (success) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to copy:", error);
      return false;
    }
  }, []);

  return { isCopied, copyToClipboard };
}
