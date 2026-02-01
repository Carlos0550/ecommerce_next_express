import { Modal } from "@mantine/core";
import type { ReactNode } from "react";

type ModalWrapperProps = {
  opened: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: string | number;
  fullScreen?: boolean;
};

export default function ModalWrapper({ opened, onClose, title, children, size = "md", fullScreen = false }: ModalWrapperProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} size={size} fullScreen={fullScreen}>
      {children}
    </Modal>
  );
}