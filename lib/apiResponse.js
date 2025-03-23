import { NextResponse } from "next/server";
import { handleApiError, ApiError } from "./errorHandler";

export const apiResponse = {
  success: (data, message = "Success") => {
    return NextResponse.json({ data, message, success: true }, { status: 200 });
  },

  error: (error) => {
    const apiError = error instanceof ApiError ? error : handleApiError(error);
    return NextResponse.json(
      {
        message: apiError.message,
        code: apiError.code,
        success: false,
      },
      { status: apiError.statusCode }
    );
  },
};
