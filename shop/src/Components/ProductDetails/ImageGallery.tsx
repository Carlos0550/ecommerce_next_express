"use client";
import { Image, Group, Stack, Modal, Box } from "@mantine/core"
import { useState, useRef } from "react"

type Props = {
  images?: string[]
  title: string
}

export default function ImageGallery({ images = [], title }: Props) {
  const [selected, setSelected] = useState<number>(0)
  const [opened, setOpened] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const main = images?.[selected] || images?.[0] || ""

  return (
    <Stack>
      <Image
        src={main}
        alt={title}
        radius="md"
        fit="cover"
        h={420}
        style={{ cursor: "zoom-in", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
        onClick={() => { setOpened(true); setZoom(1); setOffset({ x: 0, y: 0 }) }}
      />
      {Array.isArray(images) && images.length > 1 && (
        <Group gap="xs">
          {images.map((url, idx) => (
            <Image
              key={`${url}-${idx}`}
              src={url}
              alt={`Imagen ${idx + 1}`}
              radius="sm"
              fit="cover"
              w={84}
              h={84}
              style={{ cursor: "pointer", outline: idx === selected ? "2px solid var(--mantine-color-pink-5)" : "none" }}
              onClick={() => setSelected(idx)}
            />
          ))}
        </Group>
      )}

      <Modal opened={opened} onClose={() => setOpened(false)} size="xl" centered>
        <Box
          style={{
            width: "100%",
            height: 600,
            overflow: "hidden",
            position: "relative",
            background: "#111",
            borderRadius: "12px",
          }}
          onMouseDown={(e) => {
            if (zoom <= 1) return
            setDragging(true)
            lastPos.current = { x: e.clientX, y: e.clientY }
          }}
          onMouseUp={() => { setDragging(false); lastPos.current = null }}
          onMouseLeave={() => { setDragging(false); lastPos.current = null }}
          onMouseMove={(e) => {
            if (!dragging || zoom <= 1 || !lastPos.current) return
            const dx = e.clientX - lastPos.current.x
            const dy = e.clientY - lastPos.current.y
            lastPos.current = { x: e.clientX, y: e.clientY }
            setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={main}
            alt={title}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              maxWidth: "100%",
              maxHeight: "100%",
              cursor: zoom > 1 ? "zoom-out" : "zoom-in",
              userSelect: "none",
            }}
            onClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
            draggable={false}
          />
        </Box>
      </Modal>
    </Stack>
  )
}
