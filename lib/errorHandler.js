// lib/errorHandler.js
export class ApiError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = "ApiError";
  }
}

export const handleApiError = (error) => {
  console.error("Error details:", error);

  if (error instanceof ApiError) {
    return error; // Return as is if already an ApiError
  }

  // Mongoose Validation Error
  if (error.name === "ValidationError") {
    const errorMessages = Object.values(error.errors)
      .map((err) => err.message)
      .join(", ");
    return new ApiError(errorMessages, 400, "VALIDATION_ERROR");
  }

  // MongoDB Document Validation
  if (error.code === 121) {
    return new ApiError(
      "Document failed validation. Please check the required fields.",
      400,
      "DOCUMENT_VALIDATION_ERROR"
    );
  }

  // Duplicate key error
  if (error.code === 11000 && error.keyPattern) {
    const field = Object.keys(error.keyPattern)[0]; // Get duplicate field name
    const fieldName = field.charAt(0).toUpperCase() + field.slice(1); // Capitalize first letter
    return new ApiError(`${fieldName} already exists.`, 409, "DUPLICATE_ERROR");
  }

  // If it's already our ApiError, return it
  if (error instanceof ApiError) {
    return error;
  }

  // Default fallback
  return new ApiError("An unexpected error occurred.", 500, "SERVER_ERROR");
};
