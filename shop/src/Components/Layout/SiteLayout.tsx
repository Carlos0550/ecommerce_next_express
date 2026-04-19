"use client";
import { useAuthStore } from "@/stores/useAuthStore";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import LoginForm from "../Auth/LoginForm";
import AuthModal from "../Modals/AuthModal/AuthModal";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useConfigStore } from "@/stores/useConfigStore";
import { usePaletteTokens } from "@/hooks/usePaletteTokens";
import { CinnamonLogo } from "../ui/CinnamonLogo";
import { Icon } from "../ui/Icon";
import { IconButton } from "../ui/IconButton";
import { Badge } from "../ui/Badge";
import { useCartStore } from "@/stores/useCartStore";

type Props = { children: React.ReactNode };

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: "home" as const },
  { href: "/orders", label: "Pedidos", icon: "box" as const },
  { href: "/account", label: "Cuenta", icon: "user" as const },
  { href: "/faq", label: "Ayuda", icon: "bell" as const },
];

export default function SiteLayout({ children }: Props) {
  const t = usePaletteTokens();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authOpened, { open: openAuth, close: closeAuth }] = useDisclosure(false);
  const { session: user, token, isAuthenticated, validateSession } = useAuthStore();
  const business = useConfigStore((s) => s.businessInfo);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const [searchValue, setSearchValue] = useState(searchParams.get("title") || "");
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems?.reduce((sum, it) => sum + (it.quantity || 0), 0) || 0;

  useEffect(() => {
    if (token && !isAuthenticated) validateSession();
  }, [token, isAuthenticated, validateSession]);

  useEffect(() => {
    if (!business) fetchConfig();
  }, [business, fetchConfig]);

  useEffect(() => {
    if (searchParams.get("auth") === "required" && !user) {
      openAuth();
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("auth");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
  }, [searchParams, user, openAuth]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchValue.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set("title", trimmed);
    router.push(`/${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const redirectParam = searchParams.get("from");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.text,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: t.bg,
          borderBottom: `1px solid ${t.border}`,
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <Link href="/" style={{ textDecoration: "none" }}>
            <CinnamonLogo size={20} />
          </Link>

          <nav
            className="cinnamon-nav-desktop"
            style={{ display: "flex", gap: 22, marginLeft: 28 }}
          >
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    color: active ? t.text : t.textDim,
                    textDecoration: "none",
                    padding: "6px 0",
                    borderBottom: active ? `2px solid ${t.accent}` : "2px solid transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <form
            onSubmit={handleSearch}
            className="cinnamon-search-desktop"
            style={{
              flex: 1,
              maxWidth: 360,
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              background: t.bgInput,
              border: `1px solid ${t.border}`,
              borderRadius: 999,
              padding: "0 14px",
              height: 40,
            }}
          >
            <Icon name="search" size={16} color={t.textDim} />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                outline: "none",
                marginLeft: 8,
                color: t.text,
                fontSize: 14,
                fontFamily: "inherit",
              }}
            />
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            <Link href="/account" style={{ display: "inline-flex" }}>
              <IconButton ariaLabel="Cuenta" size={38}>
                <Icon name="user" size={18} />
              </IconButton>
            </Link>
            <Link href="/cart" style={{ position: "relative", display: "inline-flex" }}>
              <IconButton ariaLabel="Carrito" size={38}>
                <Icon name="cart" size={18} />
              </IconButton>
              {cartCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    background: t.accent,
                    color: t.buttonText,
                    borderRadius: 999,
                    minWidth: 18,
                    height: 18,
                    fontSize: 10,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 5px",
                  }}
                >
                  {cartCount}
                </span>
              )}
            </Link>
            {!user && (
              <button
                onClick={openAuth}
                style={{
                  marginLeft: 4,
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: t.accent,
                  color: t.buttonText,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Ingresar
              </button>
            )}
          </div>
        </div>
      </header>

      <main style={{ paddingBottom: 80, maxWidth: 1280, margin: "0 auto" }}>{children}</main>

      <footer
        style={{
          borderTop: `1px solid ${t.border}`,
          padding: "28px 20px",
          textAlign: "center",
          color: t.textMuted,
          fontSize: 12,
          marginBottom: 72,
        }}
      >
        <div style={{ marginBottom: 6 }}>
          <Badge tone="accent">© {new Date().getFullYear()} {business?.name || "Cinnamon"}</Badge>
        </div>
        <div>Hecho con cuidado para vos</div>
      </footer>

      <nav
        className="cinnamon-bottom-bar"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: t.bgElev,
          borderTop: `1px solid ${t.border}`,
          display: "none",
          justifyContent: "space-around",
          padding: "8px 4px",
          zIndex: 40,
          backdropFilter: "blur(10px)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 12px",
                color: active ? t.accent : t.textDim,
                textDecoration: "none",
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              <Icon name={item.icon} size={20} color={active ? t.accent : t.textDim} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <AuthModal opened={authOpened} onClose={closeAuth}>
        <LoginForm onClose={closeAuth} redirectTo={redirectParam} />
      </AuthModal>

      <style jsx global>{`
        @media (max-width: 768px) {
          .cinnamon-nav-desktop,
          .cinnamon-search-desktop {
            display: none !important;
          }
          .cinnamon-bottom-bar {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
