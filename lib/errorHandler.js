export class ApiError extends Error {
  constructor(message, statusCode = 500, code = "SERVER_ERROR", details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = "ApiError";

    // Ensure error can be properly serialized
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export const handleApiError = (error) => {
  console.error("Detailed Error Log:", error);

  // Already processed ApiError
  if (error instanceof ApiError) return error;

  if (error.name === "ValidationError") {
    const validationErrors = Object.entries(error.errors).map(
      ([field, err]) => {
        // Extract only the last part of the field (e.g., guardianNumber from studentSpecificField.guardianNumber)
        const readableField = field.split(".").pop();

        return {
          field: readableField,
          message: err.message.replace(`Path \`${field}\` `, ""), // Remove "Path `field`"
        };
      }
    );

    return new ApiError(
      validationErrors.map((err) => `${err.field}: ${err.message}`).join(", "), // Combine messages
      400,
      "VALIDATION_ERROR",
      { errors: validationErrors }
    );
  }

  // MongoDB Duplicate Key Error
  if (error.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern)[0];
    return new ApiError(
      `${duplicateField} must be unique. This value already exists.`,
      409,
      "DUPLICATE_KEY_ERROR",
      { field: duplicateField }
    );
  }

  // Database Connection Errors
  if (error.name === "MongoError" || error.name === "MongooseError") {
    return new ApiError("Database operation failed.", 500, "DATABASE_ERROR", {
      originalError: error.message,
    });
  }

  // Network or Axios Related Errors
  if (error.response) {
    return new ApiError(
      error.response.data.message || "External service error",
      error.response.status,
      "EXTERNAL_SERVICE_ERROR",
      { details: error.response.data }
    );
  }

  // Catch-all for unhandled errors
  return new ApiError(
    error.message || "An unexpected error occurred",
    500,
    "UNKNOWN_ERROR",
    { originalError: error.toString() }
  );
};
