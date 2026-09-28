"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ApplicationForm from "@/components/ApplicationForm";

// ONLY this small piece is client-side - much better for SEO!
export default function AuthButtons() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];

    setIsAuthenticated(!!token);
  }, []);

  return (
    <nav
      className="flex flex-col sm:flex-row w-40 mx-auto sm:w-auto gap-4 justify-center"
      aria-label="Primary navigation"
    >
      <Link
        href={isAuthenticated ? "/dashboard" : "/login"}
        aria-label="Login to student portal"
      >
        <Button
          size="lg"
          className="w-full py-6 sm:w-40 bg-emerald-700 hover:bg-white text-white hover:text-emerald-700 border-2 border-emerald-700 rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          {isAuthenticated ? "Dashboard" : "Login"}
        </Button>
      </Link>
      <ApplicationForm
        trigger={
          <Button
            size="lg"
            variant="outline"
            className="w-full py-6 sm:w-40 bg-emerald-700 hover:bg-white text-white hover:text-emerald-700 border-2 border-emerald-700 rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            Apply Now
          </Button>
        }
      />
    </nav>
  );
}
