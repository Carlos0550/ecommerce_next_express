import { Box, Flex, Loader, Text, Pagination, Modal } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { theme } from '@/theme';
import { useProductTable } from './hooks/useProductTable';
import { ProductTableFilters } from './components/ProductTableFilters';
import { ProductTableMobile } from './components/ProductTableMobile';
import { ProductTableDesktop } from './components/ProductTableDesktop';
import { ProductViewModal } from './components/ProductViewModal';
import { EnhanceProductModal } from './components/EnhanceProductModal';
import { StockModal } from './components/StockModal';
import ModalWrapper from '@/components/Common/ModalWrapper';
import ProductForm from './ProductForm';


interface ProductTableProps {
  setAddOpened: (opened: boolean) => void;
}

function ProductTable({ setAddOpened }: ProductTableProps) {
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints?.sm || '768px'})`);
  
  const {
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
    setSearch,
    setCurrentPage,
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
  } = useProductTable();

  const handleUpdateStockWithValue = () => {
    const qty = parseInt(stockValue, 10);
    if (Number.isFinite(qty) && qty >= 0) {
      handleUpdateStock(qty);
    }
  };
  return (
    <Box>
      <ProductTableFilters
        search={search}
        limit={searchParams.limit || 10}
        state={searchParams.state || 'active'}
        sortBy={searchParams.sortBy}
        sortOrder={searchParams.sortOrder || 'desc'}
        onSearchChange={setSearch}
        onLimitChange={handleLimitChange}
        onStateChange={handleStateChange}
        onSortByChange={handleSortByChange}
        onSortOrderChange={handleSortOrderChange}
        onAddProduct={() => setAddOpened(true)}
      />

      {isLoading ? (
        <Flex justify="center" align="center" h={200}>
          <Loader />
        </Flex>
      ) : isError ? (
        <Text color="red" ta="center">Error al cargar los productos</Text>
      ) : products.length === 0 ? (
        <Text ta="center">No se encontraron productos</Text>
      ) : isMobile ? (
        <ProductTableMobile
          products={products}
          state={searchParams.state || 'active'}
          deletingId={deletingId}
          isDeleting={deleteProductMutation.isPending}
          isUpdatingStock={updateStockMutation.isPending}
          isEnhancing={enhanceMutation.isPending}
          onView={handleViewProduct}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onUpdateStock={handleOpenStockModal}
          onEnhance={handleOpenEnhance}
        />
      ) : (
        <ProductTableDesktop
          products={products}
          state={searchParams.state || 'active'}
          deletingId={deletingId}
          isDeleting={deleteProductMutation.isPending}
          isUpdatingStock={updateStockMutation.isPending}
          isEnhancing={enhanceMutation.isPending}
          onView={handleViewProduct}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onUpdateStock={handleOpenStockModal}
          onEnhance={handleOpenEnhance}
        />
      )}

      {pagination && (
        <Flex justify="center" mt="md" gap="md" align="center">
          <Text>
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} productos)
          </Text>
          <Pagination
            total={pagination.totalPages || 1}
            value={pagination.page || 1}
            onChange={setCurrentPage}
            disabled={isLoading}
            withEdges
          />
        </Flex>
      )}

      <Modal
        opened={stockModalOpen}
        onClose={handleCloseStockModal}
        title="Reponer stock"
        centered
      >
        <StockModal
          stockValue={stockValue}
          isUpdating={updateStockMutation.isPending}
          onStockValueChange={setStockValue}
          onSave={handleUpdateStockWithValue}
          onCancel={handleCloseStockModal}
        />
      </Modal>

      <ModalWrapper
        opened={viewOpened}
        onClose={handleCloseView}
        title={selected ? selected.title : 'Ver producto'}
        size="md"
      >
        {selected && !editing && <ProductViewModal product={selected} />}
        {editing && (
          <ProductForm
            product={editing}
            onSuccess={handleCloseView}
          />
        )}
      </ModalWrapper>

      <Modal
        opened={enhanceOpen}
        onClose={handleCloseEnhance}
        title="Mejorar título y descripción"
        centered
      >
        <EnhanceProductModal
          product={selected}
          enhanceTitle={enhanceTitle}
          enhanceDescription={enhanceDescription}
          additionalContext={additionalContext}
          isRegenerating={enhanceMutation.isPending}
          isApplying={updateProductDetailsMutation.isPending}
          onTitleChange={setEnhanceTitle}
          onDescriptionChange={setEnhanceDescription}
          onContextChange={setAdditionalContext}
          onRegenerate={handleRegenerateEnhance}
          onApply={handleApplyEnhance}
          onClose={handleCloseEnhance}
        />
      </Modal>
    </Box>
  );
}

export default ProductTable;
