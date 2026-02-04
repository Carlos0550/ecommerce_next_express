"use client";
import { useState, useEffect, useRef } from "react";
import { BREAKPOINTS } from "../constants";
type WindowSize = {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};
const getInitialSize = (): WindowSize => {
  if (typeof window === "undefined") {
    return {
      width: 1024,
      height: 768,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    width,
    height,
    isMobile: width <= BREAKPOINTS.mobile,
    isTablet: width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet,
    isDesktop: width > BREAKPOINTS.tablet,
  };
};
export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>(getInitialSize);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    const handleResize = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const newSize = {
          width,
          height,
          isMobile: width <= BREAKPOINTS.mobile,
          isTablet: width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet,
          isDesktop: width > BREAKPOINTS.tablet,
        };
        setWindowSize((prev) => {
          if (
            prev.width === newSize.width &&
            prev.height === newSize.height &&
            prev.isMobile === newSize.isMobile
          ) {
            return prev;
          }
          return newSize;
        });
      }, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  return windowSize;
}
