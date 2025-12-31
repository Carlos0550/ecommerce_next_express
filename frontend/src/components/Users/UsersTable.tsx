import { useState, useMemo } from "react";
import { useGetUsers, useDisableUser, useEnableUser, useDeleteUser } from "../Api/AuthApi";
import { Box, Table, Flex, Text, Group, Button, Badge, Card, Stack, useMantineTheme, SegmentedControl } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

type User = {
    id: string,
    name: string,
    email: string,
    role: number,
    is_active: boolean,
}

type PaginationData = {
    total: number,
    page: number,
    limit: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPrevPage: boolean,
}

const DEFAULT_LIMIT = 10;

export function UsersTable({
    search
}: { search: string }) {
    const [filterType, setFilterType] = useState<'user' | 'admin'>('user');
    const [currentPage, setCurrentPage] = useState(1);
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

    const { data } = useGetUsers(currentPage, DEFAULT_LIMIT, search, filterType);
    const { mutate: disableUser } = useDisableUser();
    const { mutate: enableUser } = useEnableUser();
    const { mutate: deleteUser } = useDeleteUser();

    // Derivar users y pagination desde data
    const users: User[] = useMemo(() => data?.users || [], [data?.users]);
    const pagination: PaginationData = useMemo(() => ({
        total: data?.pagination?.total || 0,
        page: data?.pagination?.page || currentPage,
        limit: data?.pagination?.limit || DEFAULT_LIMIT,
        totalPages: data?.pagination?.totalPages || 0,
        hasNextPage: data?.pagination?.hasNextPage || false,
        hasPrevPage: data?.pagination?.hasPrevPage || false,
    }), [data?.pagination, currentPage]);

    const capitalizeNames = (names: string) => {
        return names.split(' ').map((name) => name.charAt(0).toUpperCase() + name.slice(1)).join(' ');
    }

    const renderBadgeByRole = (role: number) => {
        if(role == 1){
            return <Badge color="green">Administrador</Badge>
        }else{
            return <Badge color="blue">Usuario</Badge>
        }
    }
  return (
    <Box>
        <Group justify="space-between" mb="md">
            <Text fw={600}>Filtrar por tipo</Text>
            <SegmentedControl
                value={filterType}
                onChange={(v) => setFilterType(v as 'user' | 'admin')}
                data={[
                    { label: 'Usuarios', value: 'user' },
                    { label: 'Administradores', value: 'admin' },
                ]}
            />
        </Group>
        {isMobile ? (
            <Stack gap="sm">
                {users.map((user) => (
                    <Card key={user.id} withBorder padding="md" radius="md">
                        <Group justify="space-between" align="flex-start">
                            <Box>
                                <Text fw={600}>{capitalizeNames(user.name)}</Text>
                                <Text size="sm" c="dimmed">{user.email}</Text>
                            </Box>
                            {renderBadgeByRole(user.role)}
                        </Group>
                        <Group mt="sm" gap="xs">
                            <Button size="xs" variant="light"
                                onClick={() => (user.is_active ? disableUser({ id: user.id, type: user.role === 1 ? 'admin' : 'user' }) : enableUser({ id: user.id, type: user.role === 1 ? 'admin' : 'user' }))}
                            >
                                {user.is_active ? 'Inhabilitar' : 'Habilitar'}
                            </Button>
                            <Button size="xs" color="red" variant="light"
                                onClick={() => deleteUser({ id: user.id, type: user.role === 1 ? 'admin' : 'user' })}
                            >
                                Eliminar
                            </Button>
                        </Group>
                    </Card>
                ))}
            </Stack>
        ) : (
            <Table
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders
                withRowBorders
                horizontalSpacing="xs"
                verticalSpacing="xs"
                stickyHeader
                stickyHeaderOffset={60}
                captionSide="bottom"
                tabularNums
            >
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Nombre</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Rol</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th>Acciones</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {users.map((user) => (
                        <Table.Tr key={user.id}>
                            <Table.Td>{capitalizeNames(user.name)}</Table.Td>
                            <Table.Td>{user.email}</Table.Td>
                            <Table.Td>{renderBadgeByRole(user.role)}</Table.Td>
                            <Table.Td>
                                {user.is_active ? <Badge color="green">Activo</Badge> : <Badge color="gray">Inhabilitado</Badge>}
                            </Table.Td>
                            <Table.Td>
                                <Group gap="xs">
                                    <Button size="xs" variant="light"
                                        onClick={() => (user.is_active ? disableUser({ id: user.id, type: user.role === 1 ? 'admin' : 'user' }) : enableUser({ id: user.id, type: user.role === 1 ? 'admin' : 'user' }))}
                                    >
                                        {user.is_active ? 'Inhabilitar' : 'Habilitar'}
                                    </Button>
                                    <Button size="xs" color="red" variant="light"
                                        onClick={() => deleteUser({ id: user.id, type: user.role === 1 ? 'admin' : 'user' })}
                                    >
                                        Eliminar
                                    </Button>
                                </Group>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        )}

        {pagination && pagination.totalPages > 1 && (
            <Flex justify="center" mt="md" gap="md">
                <Text>
                    Página {pagination.page} de {pagination.totalPages} ({pagination.total} usuarios)
                </Text>
                <Group gap="xs">
                    <Button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={!pagination.hasPrevPage}
                        size="sm"
                    >
                        Anterior
                    </Button>
                    <Button
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={!pagination.hasNextPage}
                        size="sm"
                    >
                        Siguiente
                    </Button>
                </Group>
            </Flex>
        )}
    </Box>
  )
}

