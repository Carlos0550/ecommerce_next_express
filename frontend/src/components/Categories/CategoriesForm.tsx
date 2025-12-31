import { Badge, Box, Button, Group, Image, Stack, TextInput } from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import { useCreateCategory, useUpdateCategory } from "../Api/CategoriesApi";
import { useState, useEffect } from "react";
import type { Category } from "./CategoriesTable";

type FormValues = {
    title: string,
    images: File | null
}

type CategoryFormProps = {
    closeForm: () => void;
    initialValues?: Category       
};

const getInitialFormValues = (initialValues?: Category): FormValues => ({
    title: initialValues?.title || "",
    images: null
});

function CategoriesForm({
    closeForm,
    initialValues
}: CategoryFormProps) {
    const isEditMode = !!initialValues?.id;
    
    const { mutate: createCategory, isPending: isCreating } = useCreateCategory()
    const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory()
    
    const [formValues, setFormValues] = useState<FormValues>(() => getInitialFormValues(initialValues))

    const handleSubmit = () => {
        if (!formValues.title.trim()) {
            notifications.show({
                message: "Por favor, complete el campo título",
                color: "red"
            })
            return
        }

        if (isEditMode && initialValues?.id) {
            updateCategory({ 
                categoryId: initialValues.id,
                title: formValues.title.trim(),
                images: formValues.images ?? undefined, 
                closeForm 
            })
        } else {
            createCategory({ 
                title: formValues.title.trim(),
                images: formValues.images ?? undefined, 
                closeForm 
            })
        }
    }
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormValues({ ...formValues, [e.currentTarget.name]: e.currentTarget.value })
    }

    const handleImageDrop = (files: File[]) => {
        setFormValues({ ...formValues, images: files[0] ?? null })
    }

    const handleRemoveImage = () => {
        setFormValues({ ...formValues, images: null })
    }
    
    const isPending = isCreating || isUpdating;

    useEffect(()=>{
        console.log(formValues)
    },[formValues])
    
    return (
        <Stack>
            <Group grow>
                <TextInput 
                    label="Título" 
                    name="title"
                    value={formValues.title} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="Ingrese el título de la categoría"
                />
                <Dropzone
                    onDrop={handleImageDrop}
                    accept={IMAGE_MIME_TYPE}
                    maxSize={10 * 1024 * 1024}
                >
                    <Group justify="center" gap="sm" style={{ pointerEvents: "none" }}>
                        <Badge variant="light">Arrastra y suelta imágenes aquí</Badge>
                        <TextInput disabled placeholder="o haz click para seleccionar" style={{ maxWidth: 240 }} />
                    </Group>
                </Dropzone>
            </Group>

            {isEditMode && initialValues?.image && !formValues.images && (
                <Stack>
                    <Badge variant="light" size="sm">Imagen actual:</Badge>
                    <Group gap="sm">
                        <Box>
                            <Image 
                                src={initialValues.image} 
                                alt={`Imagen de ${initialValues.title}`} 
                                w={96} 
                                h={96} 
                                radius="sm" 
                                fit="cover" 
                            />
                        </Box>
                    </Group>
                </Stack>
            )}

            {formValues.images && (
                <Stack>
                    <Badge variant="light" size="sm">
                        {isEditMode ? "Nueva imagen:" : "Imagen seleccionada:"}
                    </Badge>
                    <Group gap="sm">
                        <Box>
                            <Image 
                                src={URL.createObjectURL(formValues.images)} 
                                alt="Nueva imagen" 
                                w={96} 
                                h={96} 
                                radius="sm" 
                                fit="cover" 
                            />
                            <Button 
                                mt={6} 
                                size="xs" 
                                variant="light" 
                                color="red" 
                                onClick={handleRemoveImage}
                            >
                                Eliminar
                            </Button>
                        </Box>
                    </Group>
                </Stack>
            )}

            <Group justify="flex-end" mt="md">
                <Button 
                    variant="outline" 
                    onClick={closeForm}
                    disabled={isPending}
                >
                    Cancelar
                </Button>
                <Button 
                    onClick={handleSubmit} 
                    loading={isPending} 
                    disabled={isPending}
                >
                    {isEditMode ? "Actualizar" : "Crear"}
                </Button>
            </Group>
        </Stack>
    )
}

export default CategoriesForm

