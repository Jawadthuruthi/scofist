import { NextResponse } from "next/server";
import { handleApiError, ApiError } from "./errorHandler";

export const apiResponse = {
  success: (data, message = "Operation successful", meta = {}) => {
    return NextResponse.json(
      {
        success: true,
        message,
        data,
        meta,
      },
      { status: 200 }
    );
  },

  error: (error) => {
    const processedError =
      error instanceof ApiError ? error : handleApiError(error);

    return NextResponse.json(
      {
        success: false,
        message: processedError.message,
        code: processedError.code,
        details: processedError.details,
      },
      { status: processedError.statusCode || 500 }
    );
  },
};
