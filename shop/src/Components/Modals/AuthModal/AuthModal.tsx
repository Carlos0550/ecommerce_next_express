import { Modal } from "@mantine/core"
type Props ={
    opened: boolean;
    onClose: () => void;
    children: React.ReactNode;
}
function AuthModal({
    opened,
    onClose,
    children,
}: Props) {
  return (
    <Modal
        opened={opened}
        onClose={onClose}
    >
        {children}
    </Modal>
  )
}
export default AuthModal
