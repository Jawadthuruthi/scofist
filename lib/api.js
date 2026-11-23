import axios from "axios";
import Cookies from "js-cookie";

const formatErrorMessage = (error) => {
  const errData = error.response?.data;

  // Extract and format field-specific validation errors if available
  if (errData?.details?.errors) {
    const errors = errData.details.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const fieldMessages = errors
        .map((e) => {
          if (typeof e === "string") return e;
          if (e?.field && e?.message) {
            const cleanMsg = (e.message || "").replace(/^Path `[^`]+`\s*/, "").trim();
            const connector = cleanMsg.startsWith("is ") ? " " : ": ";
            return `${e.field}${connector}${cleanMsg}`;
          }
          if (e?.message) return e.message;
          return null;
        })
        .filter(Boolean);

      if (fieldMessages.length > 0) {
        return `Validation failed: ${fieldMessages.join(", ")}`;
      }
    } else if (typeof errors === "object" && errors !== null) {
      const fieldMessages = Object.entries(errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .filter(Boolean);
      if (fieldMessages.length > 0) {
        return `Validation failed: ${fieldMessages.join(", ")}`;
      }
    }
    return "Validation failed. Please check the highlighted fields.";
  } else if (errData?.message) {
    return errData.message;
  } else if (errData?.error) {
    return errData.error;
  }

  if (error.message) return error.message;
  if (error.response?.statusText) return `${error.response.status} ${error.response.statusText}`;
  if (error.response?.status) return `HTTP Error ${error.response.status}`;

  return "An unexpected error occurred.";
};

// Function to handle API errors
const handleApiError = (error) => {
  // If it's an Axios error, extract the response data
  if (axios.isAxiosError(error)) {
    const errData = error.response ? error.response.data : error.message;
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase() || "REQUEST";
    const url = error.config?.url || "unknown endpoint";

    if (!error.response) {
      console.error(`No response received from server for [${method}] ${url}. Possible Network Error or CORS issue.`);
      if (error.config) {
        console.error("Failed Request Headers:", error.config.headers);
      }
    } else if (status >= 500) {
      console.error(`API Error [${status}] on ${method} ${url}:`, errData);
      console.error("Full API Error details:", error);
    } else {
      console.warn(
        `API Request Failed [${status}] on ${method} ${url}:`,
        errData?.error || errData?.message || errData || "Validation error",
        errData?.details ? { details: errData.details } : ""
      );
    }

    const errorMessage = formatErrorMessage(error);

    // Create a more structured error object
    const apiError = new Error(errorMessage);
    apiError.code = error.response?.data?.code;
    apiError.statusCode = error.response?.status;

    // Pass through field-specific validation errors if they exist
    if (error.response?.data?.details?.errors) {
      apiError.details = {
        errors: error.response.data.details.errors,
      };
    }

    throw apiError;
  }

  // For non-Axios errors, ensure a proper Error instance is thrown
  if (error instanceof Error) {
    throw error;
  }
  const fallbackMessage = error?.message || (typeof error === 'string' ? error : "Network or server connection error");
  throw new Error(fallbackMessage);
};

// Fetch items with pagination and filtering
export const fetchItems = async (
  apiEndpoint,
  apiKey,
  page = 0,
  limit = 20,
  filters = {}
) => {
  try {
    // Construct query parameters
    const queryParams = new URLSearchParams({
      page,
      limit,
    });

    // Add any filter parameters if provided
    if (filters && Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          queryParams.append(key, value);
        }
      });
    }

    const activeYear = Cookies.get("active-year");
    if (activeYear && !queryParams.has("year") && apiEndpoint !== "syllabus" && apiEndpoint !== "books") {
      queryParams.append("year", activeYear);
    }

    const url = `/api/${apiEndpoint}?${queryParams.toString()}`;
    const response = await axios.get(
      url,
      {
        headers: {
          "api-key": apiKey,
        },
        withCredentials: true,
      }
    );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Fetch a single item by ID
export const fetchItemById = async (apiEndpoint, id, apiKey) => {
  try {
    const response = await axios.get(`/api/${apiEndpoint}/${id}`, {
      headers: {
        "api-key": apiKey,
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Add a new item
export const addItem = async (apiEndpoint, data, apiKey) => {
  try {
    const activeRole = Cookies.get("active-role");
    const activeYear = Cookies.get("active-year");
    const response = await axios.post(`/api/${apiEndpoint}`, data, {
      headers: {
        "api-key": apiKey,
        "active-role": activeRole,
        "active-year": activeYear,
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update an existing item
export const updateItem = async (apiEndpoint, data, apiKey) => {
  try {
    const activeRole = Cookies.get("active-role");
    const activeYear = Cookies.get("active-year");
    const response = await axios.put(`/api/${apiEndpoint}`, data, {
      headers: {
        "api-key": apiKey,
        "active-role": activeRole,
        "active-year": activeYear,
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete an item
export const deleteItem = async (apiEndpoint, data, apiKey) => {
  try {
    const activeRole = Cookies.get("active-role");
    const activeYear = Cookies.get("active-year");
    const response = await axios.delete(`/api/${apiEndpoint}`, {
      headers: {
        "api-key": apiKey,
        "active-role": activeRole,
        "active-year": activeYear,
      },
      data,
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
