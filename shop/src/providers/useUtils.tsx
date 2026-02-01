"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWindowSize } from "@/utils/hooks/useWindowSize";
import { capitalizeTexts, BASE_URL } from "@/utils/constants";

export function useUtils() {
  const queryClient = useQueryClient();
  const windowSize = useWindowSize();

  return useMemo(
    () => ({
      baseUrl: BASE_URL,
      capitalizeTexts,
      isMobile: windowSize.isMobile,
      windowWidth: windowSize.width,
      queryClient,
    }),
    [windowSize.isMobile, windowSize.width, queryClient]
  );
}
