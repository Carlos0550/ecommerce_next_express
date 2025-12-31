import { useState, useCallback, useMemo } from 'react';
import { useGetAllProducts, useDeleteProduct, useUpdateProductStock, useEnhanceProductContent, useUpdateProduct, type GetProductsParams, type Product, type ProductState } from '@/components/Api/ProductsApi';

export const useProductTable = () => {
  const [search, setSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  // Estado base para parámetros que no dependen de search/page
  const [baseParams, setBaseParams] = useState<Omit<GetProductsParams, 'page' | 'title'>>({
    limit: 10,
    state: 'active',
    sortBy: undefined,
    sortOrder: undefined,
    isActive: undefined,
    categoryId: undefined,
  });

  // Derivar searchParams desde estado base + search + currentPage
  const searchParams = useMemo<GetProductsParams>(() => {
    const params: GetProductsParams = {
      ...baseParams,
      page: currentPage,
    };
    if (search.trim()) {
      params.title = search.trim();
    }
    return params;
  }, [baseParams, currentPage, search]);

  // React Query hooks
  const { data, isLoading, isError } = useGetAllProducts(searchParams);
  const deleteProductMutation = useDeleteProduct();
  const updateStockMutation = useUpdateProductStock();
  const enhanceMutation = useEnhanceProductContent();
  const updateProductDetailsMutation = useUpdateProduct();

  // Estados de UI
  const [viewOpened, setViewOpened] = useState<boolean>(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState<boolean>(false);
  const [stockProductId, setStockProductId] = useState<string | null>(null);
  const [stockValue, setStockValue] = useState<string>("1");
  const [enhanceOpen, setEnhanceOpen] = useState<boolean>(false);
  const [enhanceTitle, setEnhanceTitle] = useState<string>("");
  const [enhanceDescription, setEnhanceDescription] = useState<string>("");
  const [additionalContext, setAdditionalContext] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Datos derivados
  const products: Product[] = useMemo(() => data?.products ?? [], [data?.products]);
  const pagination = data?.pagination;

  // Ajustar página en el setter (en lugar de useEffect)
  const safeSetCurrentPage = useCallback((pageOrUpdater: number | ((prev: number) => number)) => {
    setCurrentPage(prev => {
      const newPage = typeof pageOrUpdater === 'function' ? pageOrUpdater(prev) : pageOrUpdater;
      // Ajustar si excede el total (usando el valor más reciente de pagination)
      if (pagination?.totalPages && newPage > pagination.totalPages) {
        return pagination.totalPages;
      }
      return newPage;
    });
  }, [pagination]);

  // Handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, []);

  const handleLimitChange = useCallback((limit: number) => {
    setBaseParams(prev => ({ ...prev, limit }));
    setCurrentPage(1);
  }, []);

  const handleStateChange = useCallback((state: ProductState) => {
    setBaseParams(prev => ({ ...prev, state }));
  }, []);

  const handleSortByChange = useCallback((sortBy: string | undefined) => {
    setBaseParams(prev => ({ ...prev, sortBy }));
  }, []);

  const handleSortOrderChange = useCallback((sortOrder: "asc" | "desc") => {
    setBaseParams(prev => ({ ...prev, sortOrder }));
  }, []);

  const handleViewProduct = useCallback((product: Product) => {
    setSelected(product);
    setEditing(null);
    setViewOpened(true);
  }, []);

  const handleEditProduct = useCallback((product: Product) => {
    setSelected(product);
    setEditing(product);
    setViewOpened(true);
  }, []);

  const handleCloseView = useCallback(() => {
    setViewOpened(false);
    setEditing(null);
    setSelected(null);
  }, []);

  const handleDeleteProduct = useCallback((productId: string) => {
    setDeletingId(productId);
    deleteProductMutation.mutate(productId, {
      onSettled: () => setDeletingId(null),
    });
  }, [deleteProductMutation]);

  const handleOpenStockModal = useCallback((product: Product) => {
    setStockProductId(product.id);
    setStockValue(String(typeof product.stock === 'number' ? product.stock : 1));
    setStockModalOpen(true);
  }, []);

  const handleCloseStockModal = useCallback(() => {
    setStockModalOpen(false);
    setStockProductId(null);
    setStockValue("1");
  }, []);

  const handleUpdateStock = useCallback((quantity: number) => {
    if (!stockProductId) return;
    updateStockMutation.mutate(
      { productId: stockProductId, quantity },
      {
        onSuccess: handleCloseStockModal,
      }
    );
  }, [stockProductId, updateStockMutation, handleCloseStockModal]);

  const handleOpenEnhance = useCallback((product: Product) => {
    setSelected(product);
    setEnhanceOpen(true);
    setEnhanceTitle("");
    setEnhanceDescription("");
    setAdditionalContext("");
    
    enhanceMutation.mutate(
      {
        productId: product.id,
        imageUrls: Array.isArray(product.images) ? product.images : [],
        additionalContext: "",
      },
      {
        onSuccess: (resp) => {
          if (resp?.proposal) {
            setEnhanceTitle(resp.proposal.title || "");
            setEnhanceDescription(resp.proposal.description || "");
          }
        },
      }
    );
  }, [enhanceMutation]);

  const handleRegenerateEnhance = useCallback(() => {
    if (!selected) return;
    enhanceMutation.mutate(
      {
        productId: selected.id,
        imageUrls: Array.isArray(selected.images) ? selected.images : [],
        additionalContext,
      },
      {
        onSuccess: (resp) => {
          if (resp?.proposal) {
            setEnhanceTitle(resp.proposal.title || "");
            setEnhanceDescription(resp.proposal.description || "");
          }
        },
      }
    );
  }, [selected, additionalContext, enhanceMutation]);

  const handleApplyEnhance = useCallback(() => {
    if (!selected) return;
    updateProductDetailsMutation.mutate(
      {
        productId: selected.id,
        title: enhanceTitle || selected.title,
        description: enhanceDescription || selected.description || "",
        price: typeof selected.price === "number" ? selected.price : String(selected.price || ""),
        active: selected.active,
        category: selected.category?.id,
        images: [],
        existingImageUrls: Array.isArray(selected.images) ? selected.images : [],
        deletedImageUrls: [],
        state: selected.state,
        options: selected.options || [],
      },
      {
        onSuccess: () => {
          setEnhanceOpen(false);
          handleCloseView();
        },
      }
    );
  }, [selected, enhanceTitle, enhanceDescription, updateProductDetailsMutation, handleCloseView]);

  const handleCloseEnhance = useCallback(() => {
    setEnhanceOpen(false);
    setEnhanceTitle("");
    setEnhanceDescription("");
    setAdditionalContext("");
  }, []);

  return {
    // Estado
    search,
    currentPage,
    searchParams,
    products,
    pagination,
    isLoading,
    isError,
    
    // Estados de UI
    viewOpened,
    selected,
    editing,
    stockModalOpen,
    stockProductId,
    stockValue,
    enhanceOpen,
    enhanceTitle,
    enhanceDescription,
    additionalContext,
    deletingId,
    
    // Mutations
    deleteProductMutation,
    updateStockMutation,
    enhanceMutation,
    updateProductDetailsMutation,
    
    // Setters
    setSearch: handleSearchChange,
    setCurrentPage: safeSetCurrentPage,
    setStockValue,
    setAdditionalContext,
    setEnhanceTitle,
    setEnhanceDescription,
    
    // Handlers
    handleViewProduct,
    handleEditProduct,
    handleCloseView,
    handleDeleteProduct,
    handleOpenStockModal,
    handleCloseStockModal,
    handleUpdateStock,
    handleOpenEnhance,
    handleRegenerateEnhance,
    handleApplyEnhance,
    handleCloseEnhance,
    handleLimitChange,
    handleStateChange,
    handleSortByChange,
    handleSortOrderChange,
  };
};

