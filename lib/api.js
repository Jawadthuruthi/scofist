import axios from "axios";

// Function to create user-friendly error messages
const formatErrorMessage = (error) => {
  // For validation errors that come from the server with a specific format
  if (error.response?.data?.message) {
    const message = error.response.data.message;

    // Check if the message contains MongoDB validation error patterns
    if (message.includes("Path `") && message.includes("` is required")) {
      // Transform MongoDB validation messages to user-friendly messages
      return message
        .split(", ")
        .map((err) => {
          const match = err.match(/Path `([^`]+)` is required/);
          if (match && match[1]) {
            // Convert camelCase or dot notation to readable field names
            const field = match[1].split(".").pop();
            const readableField = field
              .replace(/([A-Z])/g, " $1") // Insert a space before capital letters
              .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter

            return `${readableField} is required`;
          }
          return err;
        })
        .join(", ");
    }

    return message;
  }

  return "An unexpected error occurred. Please try again.";
};

// Function to handle API errors
const handleApiError = (error) => {
  // If it's an Axios error, extract the response data
  if (axios.isAxiosError(error)) {
    console.error("API Error:", error.response?.data || error.message);

    const errorMessage = formatErrorMessage(error);

    // Create a more structured error object
    const apiError = new Error(errorMessage);
    apiError.code = error.response?.data?.code;
    apiError.statusCode = error.response?.status;

    throw apiError;
  }

  // For non-Axios errors, simply pass through
  throw error;
};

// Fetch items with pagination and filtering
export const fetchItems = async (
  apiEndpoint,
  token,
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

    const response = await axios.get(
      `/api/${apiEndpoint}?${queryParams.toString()}`,
      {
        headers: {
          "api-key": token,
        },
      }
    );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Fetch a single item by ID
export const fetchItemById = async (apiEndpoint, id, token) => {
  try {
    const response = await axios.get(`/api/${apiEndpoint}/${id}`, {
      headers: {
        "api-key": token,
      },
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Add a new item
export const addItem = async (apiEndpoint, data, token) => {
  try {
    const response = await axios.post(`/api/${apiEndpoint}`, data, {
      headers: {
        "api-key": token,
      },
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update an existing item
export const updateItem = async (apiEndpoint, data, token) => {
  try {
    const response = await axios.put(`/api/${apiEndpoint}`, data, {
      headers: {
        "api-key": token,
      },
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete an item
export const deleteItem = async (apiEndpoint, ids, token) => {
  try {
    await axios.delete(`/api/${apiEndpoint}`, {
      headers: {
        "api-key": token,
      },
      data: { ids },
    });
  } catch (error) {
    throw handleApiError(error);
  }
};
