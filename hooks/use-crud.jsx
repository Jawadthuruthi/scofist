import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchItems,
  fetchItemById,
  addItem,
  updateItem,
  deleteItem,
} from "@/lib/api";

const useCrud = (resource, token) => {
  const queryClient = useQueryClient();

  // Fetch items with pagination support
  const useFetchItems = (page = 0, limit = 20, filters = {}, options = {}) => {
    return useQuery({
      queryKey: [resource, page, limit, filters],
      queryFn: () => fetchItems(resource, token, page, limit, filters),
      ...options,
    });
  };

  // Fetch a single item by ID
  const useFetchItemById = (id, enabled = true) => {
    return useQuery({
      queryKey: [resource, id],
      queryFn: () => fetchItemById(resource, id, token),
      enabled: !!id && enabled, // Only fetch when ID is provided
    });
  };

  // Add an item
  const useAddItem = () => {
    return useMutation({
      mutationFn: (data) => addItem(resource, data, token),
      onSuccess: () => {
        queryClient.removeQueries([resource]);
        queryClient.invalidateQueries([resource]);
      },
    });
  };

  // Update an item
  const useUpdateItem = () => {
    return useMutation({
      mutationFn: ({ data }) => updateItem(resource, data, token),
      onSuccess: () => {
        queryClient.removeQueries([resource]);
        queryClient.invalidateQueries([resource]);
      },
    });
  };

  // Delete an item
  const useDeleteItem = () => {
    return useMutation({
      mutationFn: (ids) => deleteItem(resource, ids, token),
      onSuccess: () => {
        queryClient.removeQueries([resource]);
        queryClient.invalidateQueries([resource]);
      },
    });
  };

  return {
    useFetchItems,
    useFetchItemById,
    useAddItem,
    useUpdateItem,
    useDeleteItem,
  };
};

export default useCrud;
