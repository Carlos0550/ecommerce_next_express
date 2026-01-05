import { useState } from "react";
import { Box, Button, Group, Stack, TextInput, Textarea, Badge, Image, TagsInput, Select, Switch, Text, Modal } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { useGetAllCategories } from "../Api/CategoriesApi";

import { useSaveProduct, useUpdateProduct, useEnhanceProductContent, type Product, type ProductState } from "../Api/ProductsApi";

export type ProductFormValues = {
  title: string;
  price: string;
  tags?: string[];
  active: boolean;
  category?: string;
  description?: string;
  images: File[];
  existingImageUrls: string[];
  deletedImageUrls: string[];
  productId?: string;
  state: ProductState;
  fillWithAI?: boolean;
  publishAutomatically?: boolean;
  stock?: string;
  additionalContext?: string;
  options: { name: string; values: string[] }[];
};

type ProductFormProps = {
  onCancel?: () => void;
  onSuccess?: () => void;
};

const PRODUCT_STATE_META: Record<ProductState, { label: string; color: string }> = {
  active: { label: "Activo", color: "green" },
  inactive: { label: "Inactivo", color: "gray" },
  draft: { label: "Borrador", color: "orange" },
  out_stock: { label: "Agotado", color: "red" },
  deleted: { label: "Eliminado", color: "red" },
};

const PRODUCT_STATE_OPTIONS: { value: ProductState; label: string }[] = (
  Object.keys(PRODUCT_STATE_META) as ProductState[]
).map((value) => ({ value, label: PRODUCT_STATE_META[value].label }));

const getInitialFormValues = (product?: Product | null): ProductFormValues => ({
  title: product?.title || "",
  price: product?.price != null ? String(product.price) : "",
  active: product?.active ?? true,
  tags: [],
  category: product?.category?.id ?? "",
  description: product?.description ?? "",
  images: [],
  existingImageUrls: Array.isArray(product?.images) ? product.images : [],
  deletedImageUrls: [],
  productId: product?.id,
  state: product?.state || 'active',
  fillWithAI: false,
  publishAutomatically: false,
  stock: "1",
  additionalContext: "",
  options: product?.options || [],
});

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps & { product?: Product | null }) {
  const {data: categories = []} = useGetAllCategories();
  const saveProductMutation = useSaveProduct();
  const updateProductMutation = useUpdateProduct();
  const enhanceMutation = useEnhanceProductContent();
  const [enhanceOpen, setEnhanceOpen] = useState(false);
  const [enhanceTitle, setEnhanceTitle] = useState("");
  const [enhanceDescription, setEnhanceDescription] = useState("");
  const [formValues, setFormValues] = useState<ProductFormValues>(() => getInitialFormValues(product));

  const handleChangeValues = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormValues({
      ...formValues,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const removeImage = (index: number) => {
    setFormValues(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    const isAI = !!formValues.fillWithAI;
    const mutation = product ? updateProductMutation : saveProductMutation;
    const { stock, ...rest } = formValues;
    const submitData = {
      ...rest,
      state: isAI ? 'draft' : formValues.state,
      ...(product ? {} : { stock: stock ? Number(stock) : undefined }),
    };

    if (isAI) {
      mutation.mutate(submitData);
      notifications.show({
        title: "Generación en segundo plano",
        message: "Estamos creando el producto con IA. Te avisaremos al finalizar.",
        color: "blue",
      });
      onCancel?.();
    } else {
      mutation.mutate(submitData, {
        onSuccess: () => {
          onSuccess?.();
          onCancel?.();
        }
      });
    }
  };

  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const removeExistingImage = (index: number) => {
    setFormValues(prev => ({
      ...prev,
      existingImageUrls: prev.existingImageUrls.filter((_, i) => i !== index),
      deletedImageUrls: [...prev.deletedImageUrls, prev.existingImageUrls[index]]
    }));
  }

  const addOption = () => {
    setFormValues(prev => ({ ...prev, options: [...prev.options, { name: "", values: [] }] }));
  };

  const removeOption = (index: number) => {
    setFormValues(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const updateOptionName = (index: number, name: string) => {
    setFormValues(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = { ...newOptions[index], name };
      return { ...prev, options: newOptions };
    });
  };

  const updateOptionValues = (index: number, values: string[]) => {
    setFormValues(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = { ...newOptions[index], values };
      return { ...prev, options: newOptions };
    });
  };

  
  const fillWithAI = formValues.fillWithAI ?? false;
  const publishAutomatically = formValues.publishAutomatically ?? false;

  return (
    <Stack>
      {!product && (
        <Group justify="space-between" align="center">
          <Switch
            label="Completar con IA"
            description="La IA analizará las imágenes para generar título y descripción automáticamente"
            checked={fillWithAI}
            onChange={(event) => setFormValues(prev => ({ ...prev, fillWithAI: event.currentTarget.checked }))}
          />
        </Group>
      )}

      {fillWithAI && (
        <Textarea
          label="Contexto adicional (Opcional)"
          description="Ayuda a la IA a describir mejor tu producto. Ej: Materiales, ocasión de uso, beneficios clave."
          name="additionalContext"
          placeholder="Ej: Es un labial rojo mate de larga duración, ideal para fiestas..."
          value={formValues.additionalContext}
          onChange={handleChangeValues}
          autosize
          minRows={2}
          mb="md"
        />
      )}

      {!fillWithAI && (
        <Group grow>
          <TextInput label="Título" name="title" placeholder="Ej. Auriculares Kuromi" value={formValues.title} onChange={handleChangeValues} required />
          <Select
            label="Estado"
            name="state" 
            placeholder="Selecciona el estado"
            data={PRODUCT_STATE_OPTIONS}
            value={formValues.state}
            onChange={(value) => setFormValues(prev => ({ ...prev, state: (value as ProductState) || 'active' }))}
          />
        </Group>
      )}
      {product && (
        <Group justify="flex-end">
          <Button
            variant="outline"
            onClick={() => {
              setEnhanceOpen(true);
              setEnhanceTitle("");
              setEnhanceDescription("");
              const imgs = Array.isArray(formValues.existingImageUrls) ? formValues.existingImageUrls : [];
              enhanceMutation.mutate({ productId: product.id, additionalContext: formValues.additionalContext, imageUrls: imgs }, {
                onSuccess: (resp) => {
                  if (resp?.proposal) {
                    setEnhanceTitle(resp.proposal.title || "");
                    setEnhanceDescription(resp.proposal.description || "");
                  }
                }
              });
            }}
            loading={enhanceMutation.isPending}
          >
            ✨ Mejorar título y descripción
          </Button>
        </Group>
      )}

  <Group grow>
    <TextInput label="Precio" name="price" placeholder="Ej. 59.99" value={formValues.price} onChange={handleChangeValues} required />
    {!product && (
      <TextInput label="Stock" name="stock" placeholder="Ej. 10" value={formValues.stock} onChange={handleChangeValues} />
    )}
    <Select
      label="Categoría"
      name="category" 
      placeholder="Selecciona una categoría"
      data={Array.isArray(categories?.categories) ? categories.categories.map((cat: { id: string; title: string }) => ({ 
        value: cat.id, 
        label: capitalizeFirstLetter(cat.title)
      })) : []}
      value={formValues.category}
      onChange={(value) => setFormValues(prev => ({ ...prev, category: value || "" }))}
      required={fillWithAI}
    />
  </Group>

      {!fillWithAI && (
        <>
          <Textarea name="description" label="Descripción" placeholder="Describe el producto" autosize minRows={3} value={formValues.description} onChange={handleChangeValues} />
          
          <Group>
            <TagsInput
              name="tags"
              label="Etiquetas"
              placeholder="Añade etiquetas"
              value={formValues.tags}
              onChange={(value) => setFormValues(prev => ({ ...prev, tags: value || [] }))}
            />
          </Group>

          <Stack gap="xs" mt="md">
            <Text fw={500}>Opciones de compra</Text>
            {formValues.options.map((opt, idx) => (
              <Group key={idx} align="flex-end">
                <TextInput
                  label={idx === 0 ? "Nombre (ej: Color)" : ""}
                  placeholder="Nombre"
                  value={opt.name}
                  onChange={(e) => updateOptionName(idx, e.target.value)}
                  style={{ flex: 1 }}
                />
                <TagsInput
                  label={idx === 0 ? "Valores (ej: Rojo, Azul)" : ""}
                  placeholder="Escribe y presiona enter"
                  value={opt.values}
                  onChange={(vals) => updateOptionValues(idx, vals)}
                  style={{ flex: 2 }}
                />
                <Button color="red" variant="subtle" onClick={() => removeOption(idx)} mb={2}>
                  🗑️
                </Button>
              </Group>
            ))}
            <Button variant="outline" size="xs" onClick={addOption} w="fit-content">
              + Agregar opción
            </Button>
          </Stack>
        </>
      )}

      <Stack>
        {}
        <input
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          id="file-input"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
              setFormValues(prev => ({ ...prev, images: [...prev.images, ...files] }));
            }
          }}
        />
        
        {fillWithAI && (
          <Switch
            label="Publicar automáticamente"
            checked={publishAutomatically}
            onChange={(event) => setFormValues(prev => ({ ...prev, publishAutomatically: event.currentTarget.checked }))}
          />
        )}
        <Dropzone
          name="images"
          onDrop={(files) => setFormValues(prev => ({ ...prev, images: [...prev.images, ...files] }))}
          accept={IMAGE_MIME_TYPE}
          maxSize={10 * 1024 * 1024}
          activateOnClick={true}
          styles={{
            root: {
              cursor: 'pointer',
              minHeight: '120px',
              border: '2px dashed #ced4da',
              borderRadius: '8px',
              '&:hover': {
                backgroundColor: '#f8f9fa',
                borderColor: '#868e96'
              }
            }
          }}
          onReject={(files) => {
            console.log('Archivos rechazados:', files);
          }}
        >
          <Stack align="center" gap="sm">
            <Text size="lg">📷</Text>
            <Text size="sm" ta="center">
              Arrastra y suelta imágenes aquí o haz clic para seleccionar
            </Text>
            <Badge variant="light" size="sm">
              Máximo 10MB por imagen
            </Badge>
          </Stack>
        </Dropzone>
        
        {}
        <Button
          variant="filled"
          size="lg"
          onClick={() => document.getElementById('file-input')?.click()}
          leftSection="📱"
          styles={{
            root: {
              '@media (min-width: 768px)': {
                display: 'none'
              }
            }
          }}
        >
          Seleccionar imágenes desde galería
        </Button>
      </Stack>

      {formValues.images.length > 0 && (
        <Stack>
          <Group>
            <Badge variant="light">Imágenes: {formValues.images.length}</Badge>
          </Group>
          <Group gap="sm">
            {formValues.images.map((file, idx) => (
              <Box key={`${file.name}-${idx}`}>
                <Image src={URL.createObjectURL(file)} alt={`Imagen ${idx + 1}`} w={96} h={96} radius="sm" fit="cover" />
                <Button mt={6} size="xs" variant="light" color="red" onClick={() => removeImage(idx)}>Eliminar</Button>
              </Box>
            ))}
          </Group>
        </Stack>
       )}
       {formValues.existingImageUrls.length > 0 && (
         <Stack>
           <Group>
             <Badge variant="light">Imágenes existentes: {formValues.existingImageUrls.length}</Badge>
           </Group>
           <Group gap="sm">
             {formValues.existingImageUrls.map((url, idx) => (
               <Box key={`${url}-${idx}`}>
                 <Image src={url} alt={`Imagen ${idx + 1}`} w={96} h={96} radius="sm" fit="cover" />
                 <Button mt={6} size="xs" variant="light" color="red" onClick={() => removeExistingImage(idx)}>Eliminar</Button>
               </Box>
             ))}
           </Group>
         </Stack>
       )}
      <Group justify="flex-end" mt="md">
        <Button 
          onClick={handleSubmit} 
          loading={!fillWithAI && (product ? updateProductMutation.isPending : saveProductMutation.isPending)}
          disabled={fillWithAI && (!formValues.category || formValues.images.length === 0)}
        >
          {(product ? updateProductMutation.isPending : saveProductMutation.isPending) 
            ? "Guardando..." 
            : fillWithAI 
              ? "Generar con IA" 
              : "Guardar"
          }
        </Button>
      </Group>
      <Modal opened={enhanceOpen} onClose={() => setEnhanceOpen(false)} title="Sugerencias de IA" fullScreen >
        <TextInput label="Título sugerido" value={enhanceTitle} onChange={(e) => setEnhanceTitle(e.currentTarget.value)} />
          <Textarea
            label="Descripción sugerida"
            value={enhanceDescription}
            onChange={(e) => setEnhanceDescription(e.currentTarget.value)}
            autosize
            minRows={4}
          />
          <Group justify="flex-end">
            <Button
              variant="light"
              disabled={enhanceMutation.isPending}
              onClick={() => {
                enhanceMutation.mutate({ productId: product?.id || "", additionalContext: formValues.additionalContext });
              }}
              loading={enhanceMutation.isPending}
            >
              Re-generar
            </Button>
            
          </Group>
      </Modal>
    </Stack>
  );
}
