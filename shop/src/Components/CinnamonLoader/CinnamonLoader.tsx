'use client'
import { Box, Image } from "@mantine/core"
import { useEffect, useRef } from "react"
import gsap from "gsap"

export default function CinnamonLoader() {
  const shimmerTrackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = shimmerTrackRef.current
    if (!el) return

    // place shimmer off-screen to the left initially
    gsap.set(el, { x: "-120%", opacity: 0.85 })

    // continuous sweep animation to simulate a glossy reflection
    const tl = gsap.timeline({ repeat: -1 })
    tl.to(el, {
      x: "220%",
      duration: 2.2,
      ease: "power2.inOut",
    }).set(el, { x: "-120%" })

    // Cleanup must return void; kill the timeline
    return () => { tl.kill(); }
  }, [])

  return (
    <Box pos="relative" w={450} h={450}>
      <Image
        src="/image_fallback.webp"
        alt="Logo"
        width={450}
        height={450}
        fit="contain"
      />

      {/* GSAP shimmer/reflection overlay */}
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}
      >
        <div
          ref={shimmerTrackRef}
          style={{
            position: "absolute",
            top: 0,
            left: "-40%",
            height: "100%",
            width: "40%",
            background:
              "linear-gradient(115deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0) 100%)",
            filter: "blur(2px)",
            transform: "skewX(-20deg)",
            mixBlendMode: "screen",
          }}
        />
      </div>
    </Box>
  )
}
