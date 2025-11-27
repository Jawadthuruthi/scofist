import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchItems,
  fetchItemById,
  addItem,
  updateItem,
  deleteItem,
} from "@/lib/api";

const useCrud = (apiEndpoint, apiKey) => {
  const queryClient = useQueryClient();

  // Fetch items with pagination support
  const useFetchItems = (page = 0, limit = 20, filters = {}, options = {}) => {
    return useQuery({
      queryKey: [apiEndpoint, page, limit, filters],
      queryFn: () => fetchItems(apiEndpoint, apiKey, page, limit, filters),
      ...options,
    });
  };

  // Fetch a single item by ID
  const useFetchItemById = (id, enabled = true) => {
    return useQuery({
      queryKey: [apiEndpoint, id],
      queryFn: () => fetchItemById(apiEndpoint, id, apiKey),
      enabled: !!id && enabled,
    });
  };

  // Add an item
  const useAddItem = () => {
    return useMutation({
      mutationFn: (data) => addItem(apiEndpoint, data, apiKey),
      onSuccess: () => {
        queryClient.removeQueries([apiEndpoint]);
        queryClient.invalidateQueries({
          queryKey: [apiEndpoint],
          exact: false,
        });
      },
    });
  };

  // Update an item
  const useUpdateItem = () => {
    return useMutation({
      mutationFn: ({ data }) => updateItem(apiEndpoint, data, apiKey),
      onSuccess: () => {
        queryClient.removeQueries([apiEndpoint]);
        queryClient.invalidateQueries({
          queryKey: [apiEndpoint],
          exact: false,
        });
      },
    });
  };

  // Delete an item
  const useDeleteItem = () => {
    return useMutation({
      mutationFn: ({ data }) =>
        deleteItem(apiEndpoint, { ids: data.ids }, apiKey),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
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
