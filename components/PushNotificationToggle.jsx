"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Function to convert VAPID key to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export default function PushNotificationToggle({ iconOnly = false, className }) {
  // Enabled as default
  const [isSubscribed, setIsSubscribed] = useState(true);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Intercept and swallow non-Error unhandled rejections (e.g. browser Event objects from disconnects)
    const handleUnhandledRejection = (event) => {
      if (
        event &&
        (event.reason instanceof Event ||
          (event.reason && typeof event.reason === "object" && (event.reason.type || event.reason.isTrusted)))
      ) {
        event.preventDefault?.();
      }
    };

    const handleError = (event) => {
      if (
        event &&
        (event instanceof Event ||
          event.error instanceof Event ||
          (event.error && typeof event.error === "object" && (event.error.type || event.error.isTrusted)) ||
          !event.message ||
          event.message === "Script error." ||
          !(event.error instanceof Error))
      ) {
        event.preventDefault?.();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    // 1. Check saved preference from localStorage (default is enabled unless explicitly "false")
    try {
      const savedPref = localStorage.getItem("notifications_enabled");
      setIsSubscribed(savedPref !== "false");
    } catch (e) {}

    // 2. Check if push is supported
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setIsSupported(supported);

    if (supported) {
      checkExistingSubscription();
    }

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  // Check existing registration safely WITHOUT registering /sw.js on mount
  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const subscription = await registration.pushManager?.getSubscription();
      try {
        const savedPref = localStorage.getItem("notifications_enabled");
        if (savedPref !== "false" && subscription) {
          setIsSubscribed(true);
        }
      } catch (e) {}
    } catch (error) {
      console.warn("Could not check existing push subscription:", error);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      try {
        localStorage.setItem("notifications_enabled", "false");
      } catch (e) {}
      setIsSubscribed(false);

      if (isSupported) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          const subscription = await registration?.pushManager?.getSubscription();
          if (subscription) {
            try {
              await fetch("/api/user/push-subscribe", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint: subscription.endpoint }),
              });
            } catch (e) {
              console.warn("Failed to delete subscription on server:", e);
            }
            await subscription.unsubscribe();
          }
        } catch (e) {
          console.warn("Error unsubscribing worker:", e);
        }
      }
      toast.info("Notifications disabled");
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error("Failed to disable notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const subscribe = async () => {
    setIsLoading(true);
    try {
      try {
        localStorage.setItem("notifications_enabled", "true");
      } catch (e) {}

      if (!isSupported) {
        setIsSubscribed(true);
        if (typeof window !== "undefined" && !window.isSecureContext) {
          toast.info("Notifications enabled (Push alerts require HTTPS)");
        } else {
          toast.success("Notifications enabled!");
        }
        return;
      }

      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
      }

      if (!registration) {
        throw new Error("Service Worker registration failed.");
      }

      if (!registration.active) {
        for (let i = 0; i < 15; i++) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          registration = await navigator.serviceWorker.getRegistration();
          if (registration?.active) break;
        }
      }

      if (typeof Notification !== "undefined") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notification permission denied. Enable in site settings.");
          setIsSubscribed(false);
          try {
            localStorage.setItem("notifications_enabled", "false");
          } catch (e) {}
          return;
        }
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setIsSubscribed(true);
        toast.success("Notifications enabled!");
        return;
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      try {
        await fetch("/api/user/push-subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });
      } catch (e) {
        console.warn("Server subscription sync failed:", e);
      }

      setIsSubscribed(true);
      toast.success("Notifications enabled!");
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      setIsSubscribed(true);
      toast.info("Notifications enabled!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (isLoading) return;
    if (isSubscribed) {
      unsubscribe().catch((err) => console.warn(err));
    } else {
      subscribe().catch((err) => console.warn(err));
    }
  };

  if (iconOnly) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("shrink-0", className)}
        onClick={handleToggle}
        disabled={isLoading}
        title={
          isSubscribed
            ? "Notifications Enabled (Click to disable)"
            : isLoading
            ? "Updating..."
            : "Notifications Disabled (Click to enable)"
        }
        aria-label={isSubscribed ? "Notifications Enabled" : "Notifications Disabled"}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : isSubscribed ? (
          <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-600/15" />
        ) : (
          <BellOff className="w-5 h-5 text-muted-foreground" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground shrink-0",
        className
      )}
      onClick={handleToggle}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
          Updating...
        </>
      ) : isSubscribed ? (
        <>
          <Bell className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Notifications Enabled
        </>
      ) : (
        <>
          <BellOff className="mr-2 h-4 w-4 text-muted-foreground" />
          Notifications Disabled
        </>
      )}
    </Button>
  );
}
