import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchItems,
  fetchItemById,
  addItem,
  updateItem,
  deleteItem,
} from "@/lib/api";

export const useCrud = (resource, token) => {
  const queryClient = useQueryClient();

  // Fetch all items
  const useFetchItems = () => {
    return useQuery({
      queryKey: [resource],
      queryFn: () => fetchItems(resource, token),
      staleTime: 60000, // 1 min caching
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
        queryClient.invalidateQueries([resource]); // Refresh list after adding
      },
    });
  };

  // Update an item
  const useUpdateItem = () => {
    return useMutation({
      mutationFn: ({ data }) => updateItem(resource, data, token),
      onSuccess: () => {
        queryClient.invalidateQueries([resource]); // Refresh list after updating
      },
    });
  };

  // Delete an item
  const useDeleteItem = () => {
    return useMutation({
      mutationFn: (ids) => deleteItem(resource, ids, token),
      onSuccess: () => {
        queryClient.invalidateQueries([resource]); // Refresh list after deletion
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
