import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  fetchItems,
  fetchItemById,
  addItem,
  updateItem,
  deleteItem,
} from "@/lib/api";

export const useCrud = (resource, token) => {
  const queryClient = useQueryClient();

  // Fetch items with pagination support
  const useFetchItems = (page = 0, limit = 20, filters = {}) => {
    return useQuery({
      queryKey: [resource, page, limit, filters],
      queryFn: () => fetchItems(resource, token, page, limit, filters),
      staleTime: 60000, // 1 min caching
      keepPreviousData: true, // Keep previous data while fetching new data
    });
  };

  // Fetch items with infinite query (alternative approach)
  const useInfiniteItems = (limit = 20, filters = {}) => {
    return useInfiniteQuery({
      queryKey: [resource, "infinite", limit, filters],
      queryFn: ({ pageParam = 0 }) =>
        fetchItems(resource, token, pageParam, limit, filters),
      getNextPageParam: (lastPage, allPages) => {
        // Determine if there's more data to fetch
        const hasMore = (lastPage[resource] || []).length === limit;
        if (!hasMore) return undefined;
        return allPages.length; // Next page number
      },
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
    useInfiniteItems,
    useFetchItemById,
    useAddItem,
    useUpdateItem,
    useDeleteItem,
  };
};
