'use client'
import { Box, Image } from "@mantine/core"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { useTenant } from "@/providers/TenantProvider"

export default function CinnamonLoader() {
  const shimmerTrackRef = useRef<HTMLDivElement | null>(null)
  const { tenant } = useTenant()
  const logoSrc = tenant?.business?.favicon || tenant?.business?.business_image || ""

  useEffect(() => {
    const el = shimmerTrackRef.current
    if (!el) return

    
    gsap.set(el, { x: "-120%", opacity: 0.85 })

    
    const tl = gsap.timeline({ repeat: -1 })
    tl.to(el, {
      x: "220%",
      duration: 2.2,
      ease: "power2.inOut",
    }).set(el, { x: "-120%" })

    
    return () => { tl.kill(); }
  }, [])

  if (!logoSrc) {
    return null 
  }

  return (
    <Box pos="relative" w={450} h={450}>
      <Image
        src={logoSrc}
        alt="Logo"
        width={450}
        height={450}
        fit="contain"
      />

      {}
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
