import { useAdminContext } from "@/providers/AdminContext"
import { baseUrl } from "./index"
import {
    useMutation,
    useQuery,
    useQueryClient
} from "@tanstack/react-query"
import { notifications } from "@mantine/notifications"

export const useGetAllCategories = () => {
    const {
        auth:{
            token
        }
    } = useAdminContext()
    return useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const res = await fetch(`${baseUrl}/products/categories`,{
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            })

            if (!res.ok) {
                throw new Error(`Error ${res.status}: ${res.statusText}`)
            }

            return res.json()
        },
        enabled: !!token, 
    })
}

export const useCreateCategory = () => {
    const queryClient = useQueryClient()

    const {
        auth:{
            token
        }
    } = useAdminContext()
    
    return useMutation({
        mutationKey: ["createCategory"],
        mutationFn: async (values: { title: string, images?: File, closeForm: () => void }) => {
            const formData = new FormData()
            formData.append("title", values.title)
            if (values.images) {
                formData.append("image", values.images)
            }
            const response = await fetch(`${baseUrl}/products/categories`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            })
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`)
            }
            
            const result = await response.json()
            return { ...result, closeForm: values.closeForm }
        },
        onSuccess: (data) => {
            console.log(data)
            queryClient.invalidateQueries({ queryKey: ["categories"] })
            notifications.show({
                message: "Categoría creada con éxito",
                color: "green"
            })
            data.closeForm()
        },
        onError: (error: Error) => {
            notifications.show({
                message: error?.message ?? "Error al crear la categoría",
                color: "red"
            })
        }
    })
}

export const useUpdateCategory = () => {
    const queryClient = useQueryClient()

    const {
        auth:{
            token
        }
    } = useAdminContext()
    
    return useMutation({
        mutationKey: ["updateCategory"],
        mutationFn: async (values: { categoryId: string, title: string, images?: File, closeForm: () => void }) => {
            const formData = new FormData()
            formData.append("title", values.title)
            if (values.images) {
                formData.append("image", values.images)
            }
            const response = await fetch(`${baseUrl}/products/categories/${values.categoryId}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            })
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`)
            }
            
            const result = await response.json()
            return { ...result, closeForm: values.closeForm }
        },
        onSuccess: (data) => {
            console.log(data)
            queryClient.invalidateQueries({ queryKey: ["categories"] })
            notifications.show({
                message: "Categoría actualizada con éxito",
                color: "green"
            })
            data.closeForm()
        },
        onError: (error: Error) => {
            notifications.show({
                message: error?.message ?? "Error al actualizar la categoría",
                color: "red"
            })
        }
    })
}

export const useChangeCategoryStatus = () => {
    const queryClient = useQueryClient()
    type mutationProps = {
        categoryId: string,
        status: string,
    }
    const {
        auth:{
            token
        }
    } = useAdminContext()
    return useMutation({
        mutationKey: ["changeStatusCategory"],
        mutationFn: async (props: mutationProps) => {
            const response = await fetch(`${baseUrl}/products/categories/status/${props.categoryId}/${props.status}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                }
            })
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`)
            }
            return await response.json()
        },
        onSuccess: (data) => {
            console.log(data)
            queryClient.invalidateQueries({ queryKey: ["categories"] })
            return notifications.show({
                message: data?.message ?? "Categoría actualizada con éxito",
                color: "green"
            })
        },
        onError: (error: Error) => {
            return notifications.show({
                message: error?.message ?? "Error al actualizar la categoría",
                color: "red"
            })
        }
    })
}