import axios from "axios";
import { baseURL } from "./utils";

// Function to handle API errors
const handleApiError = (error, token) => {
  // Handle Mongoose ValidationError
  if (error.name === "ValidationError") {
    const errorMessages = Object.values(error.errors)
      .map((err) => err.message)
      .join(", ");
    throw new Error(errorMessages);
  }

  // Handle MongoDB Document Validation (code 121)
  if (error.code === 121) {
    throw new Error(
      "Document failed validation. Please check the required fields."
    );
  }

  if (axios.isAxiosError(error)) {
    console.error("API Error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "An unexpected error occurred."
    );
  }

  throw new Error("An unexpected error occurred.");
};

// Fetch all items
export const fetchItems = async (apiEndpoint, token) => {
  try {
    const response = await axios.get(`${baseURL}/api/${apiEndpoint}`, {
      headers: {
        "api-key": token,
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// Fetch a single item by ID
export const fetchItemById = async (apiEndpoint, id, token) => {
  try {
    const response = await axios.get(`${baseURL}/api/${apiEndpoint}/${id}`, {
      headers: {
        "api-key": token,
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// Add a new item
export const addItem = async (apiEndpoint, data, token) => {
  try {
    const response = await axios.post(`${baseURL}/api/${apiEndpoint}`, data, {
      headers: {
        "api-key": token,
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// Update an existing item
export const updateItem = async (apiEndpoint, data, token) => {
  try {
    const response = await axios.put(`${baseURL}/api/${apiEndpoint}`, data, {
      headers: {
        "api-key": token,
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// Delete an item
export const deleteItem = async (apiEndpoint, ids, token) => {
  try {
    await axios.delete(`${baseURL}/api/${apiEndpoint}`, {
      headers: {
        "api-key": token,
      },
      data: { ids },
    });
  } catch (error) {
    handleApiError(error);
  }
};
