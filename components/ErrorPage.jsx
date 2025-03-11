"use client";
import React from "react";
import { X, AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ErrorPage = ({
  statusCode = 500,
  title = "Something went wrong",
  description = "We encountered an unexpected error. Our team has been notified and is working to resolve the issue.",
  showRefreshButton = true,
}) => {
  const getErrorMessage = (code) => {
    switch (code) {
      case 404:
        return "The page you're looking for doesn't exist or has been moved.";
      case 403:
        return "You don't have permission to access this resource.";
      case 500:
        return "We encountered an unexpected error. Our team has been notified and is working to resolve the issue.";
      case 503:
        return "The service is temporarily unavailable due to maintenance or capacity issues.";
      default:
        return "An error occurred while processing your request.";
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            {statusCode === 404 ? (
              <X className="h-6 w-6 text-red-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            {title || `Error ${statusCode}`}
          </CardTitle>
          <CardDescription className="text-center text-gray-600 mt-2">
            {description || getErrorMessage(statusCode)}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTitle className="text-amber-800 font-medium">
              Error Details
            </AlertTitle>
            <AlertDescription className="text-amber-700">
              Status Code: {statusCode}
              <br />
              {statusCode === 404
                ? "The requested URL was not found on this server."
                : "Our technical team has been notified of this issue."}
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex justify-center gap-4 pt-4">
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="w-full bg-white hover:bg-gray-100"
          >
            Go Back
          </Button>

          {showRefreshButton && (
            <Button
              variant="default"
              onClick={handleRefresh}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default ErrorPage;
