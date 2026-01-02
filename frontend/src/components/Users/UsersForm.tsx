import { Box, Button, Grid, Input, Select, Text } from "@mantine/core"
import { showNotification } from "@mantine/notifications"
import { useState } from "react"
import { useCreateUser } from "../Api/AuthApi"
import { FaWhatsapp } from "react-icons/fa"

type UsersFormValues = {
    name: string,
    email: string,
    role_id: "1" | "2",
    phone: string,
}

export const UsersForm = ({ onCancel }: { onCancel: () => void }) => {
    const [values, setValues] = useState<UsersFormValues>({
        name: '',
        email: '',
        role_id: "1",
        phone: '',
    })
    const [loading, setLoading] = useState<boolean>(false);
    
    const createUserMutation = useCreateUser();
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValues({
            ...values,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = async () => {
        const { name, email, role_id, phone } = values;
        setLoading(true);
        try {
            const data = await createUserMutation.mutateAsync({ name, email, role_id, phone: phone || undefined });
            if(data.ok){
                showNotification({
                    message: "Usuario creado exitosamente",
                    color: "green",
                    autoClose: 3000,
                })
                return onCancel();
                
            }

            throw new Error(data.error)
        } catch (error) {
            console.log(error);
            if (error instanceof Error && error.message === "email_already_registered") {
                showNotification({
                    message: "El email ya está registrado",
                    color: "red",
                    autoClose: 3000,
                })
            }else{
                showNotification({
                    message: "Error al crear el usuario",
                    color: "red",
                    autoClose: 3000,
                })
            }
            
        }finally{
            setLoading(false);
        }
    }
    return (
        <Box p="md">
            <Grid gutter="md" align="stretch">
                <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Input
                        name="name"
                        value={values.name}
                        onChange={handleChange}
                        placeholder="Nombre"
                        size="md"
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Input
                        name="email"
                        value={values.email}
                        onChange={handleChange}
                        placeholder="Email"
                        type="email"
                        size="md"
                    />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                        name="user_role"
                        value={values.role_id}
                        onChange={(value) => setValues({
                            ...values,
                            role_id: value as UsersFormValues["role_id"],
                        })}
                        data={[
                            { value: "1", label: "Administrador" },
                            { value: "2", label: "Usuario" },
                        ]}
                        placeholder="Rol"
                        size="md"
                        clearable={false}
                    />
                </Grid.Col>
                {values.role_id === "1" && (
                    <Grid.Col span={12}>
                        <Input
                            name="phone"
                            value={values.phone}
                            onChange={handleChange}
                            placeholder="+5491123456789"
                            size="md"
                            leftSection={<FaWhatsapp size={16} />}
                        />
                        <Text size="xs" c="dimmed" mt={4}>
                            Número de WhatsApp para carga de productos (solo admins)
                        </Text>
                    </Grid.Col>
                )}
            </Grid>
            <Button mt={10} loading={loading} disabled={loading} onClick={handleSubmit}>Guardar</Button>
        </Box>
    )
}