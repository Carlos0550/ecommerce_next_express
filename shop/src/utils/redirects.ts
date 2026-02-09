export type RedirectOptions = {
  allowedPrefixes?: string[];
};

const isAllowedPrefix = (pathname: string, prefixes: string[]) => {
  return prefixes.some((prefix) => {
    if (pathname === prefix) {
      return true;
    }
    if (prefix.endsWith("/")) {
      return pathname.startsWith(prefix);
    }
    return pathname.startsWith(`${prefix}/`);
  });
};

export const getSafeRedirectPath = (
  value: string | null | undefined,
  options: RedirectOptions = {},
) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  if (trimmed.includes("://")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed, "http://localhost");
  } catch {
    return null;
  }

  const pathname = url.pathname;
  if (options.allowedPrefixes?.length && !isAllowedPrefix(pathname, options.allowedPrefixes)) {
    return null;
  }

  return `${pathname}${url.search}${url.hash}`;
};
