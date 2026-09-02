"use client";

import Link from "next/link";
import { ChevronLeft, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { APP_SIGN_IN, MARKETING_NAV } from "@/lib/marketing/links";

export function MarketingHeader({
  loginHref = APP_SIGN_IN,
  overlay = false,
}: {
  loginHref?: string;
  overlay?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [revealedGroups, setRevealedGroups] = useState<number[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!menuOpen) return;

    const closeSequentially = () => {
      if (isClosing) return;
      if (activeGroup === null) {
        setMenuOpen(false);
        return;
      }
      setIsClosing(true);
      setActiveGroup(null);
      closeTimerRef.current = setTimeout(() => {
        setMenuOpen(false);
        setIsClosing(false);
        closeTimerRef.current = null;
      }, 500);
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeSequentially();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSequentially();
      }
    };

    window.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeGroup, isClosing, menuOpen]);

  const foreground = overlay ? "text-white" : "text-[#1a1a1a]";

  return (
    <header className={`${overlay ? "absolute inset-x-0 top-0 bg-transparent" : "relative bg-[#F5F2EB]"} z-40`}>
      <style jsx global>{`
        @keyframes autodoc-menu-unroll {
          from {
            max-height: 0;
          }
          to {
            max-height: 158px;
          }
        }
        @keyframes autodoc-menu-roll-up {
          from {
            max-height: 158px;
          }
          to {
            max-height: 0;
          }
        }
        @keyframes autodoc-submenu-unroll-left {
          from {
            max-width: 0;
          }
          to {
            max-width: 176px;
          }
        }
        @keyframes autodoc-submenu-roll-right {
          from {
            max-width: 176px;
          }
          to {
            max-width: 0;
          }
        }
      `}</style>
      <div className="mx-auto flex h-[72px] w-full max-w-[1760px] items-center justify-between px-5 md:px-8 lg:px-10">
        <Link href="/" className={`text-[40px] font-semibold leading-[44px] tracking-[-2px] ${foreground}`}>
          AutoDoc
        </Link>

        <div ref={menuRef} className="relative flex items-center gap-4">
          <a href={loginHref} className={`text-[15px] font-medium leading-5 ${foreground}`}>
            Login
          </a>
          <span aria-hidden className={`text-[15px] font-medium leading-5 opacity-60 ${foreground}`}>
            /
          </span>
          <Link
            href="/signup"
            className={`text-[15px] font-medium leading-5 ${foreground}`}
          >
            Sign up
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => {
              if (isClosing) return;
              setHasInteracted(true);
              if (!menuOpen) {
                setMenuOpen(true);
                setActiveGroup(null);
                return;
              }
              if (activeGroup === null) {
                setMenuOpen(false);
                return;
              }
              setIsClosing(true);
              setActiveGroup(null);
              closeTimerRef.current = setTimeout(() => {
                setMenuOpen(false);
                setIsClosing(false);
                closeTimerRef.current = null;
              }, 500);
            }}
            className={`flex size-10 items-center justify-center rounded-full border ${
              overlay ? "border-white/40 text-white hover:bg-white/10" : "border-black/15 text-[#1a1a1a] hover:bg-black/[0.04]"
            }`}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <nav
            aria-label="Main navigation"
            className="absolute right-0 top-[52px] w-[164px] text-[#1a1a1a]"
          >
            <div
              className={`overflow-hidden rounded-xl [will-change:max-height] ${
                menuOpen ? "" : "pointer-events-none"
              }`}
              style={{
                maxHeight: hasInteracted ? undefined : 0,
                animation: hasInteracted
                  ? `${
                      menuOpen ? "autodoc-menu-unroll" : "autodoc-menu-roll-up"
                    } ${menuOpen ? 650 : 500}ms cubic-bezier(0.22, 1, 0.36, 1) both`
                  : "none",
              }}
            >
              <div className="rounded-xl border border-black/10 bg-[#F5F2EB] py-2 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
                {MARKETING_NAV.map((group, index) => (
                  <div
                    key={group.label}
                  onMouseEnter={() => {
                    if (isClosing) return;
                    setRevealedGroups((groups) =>
                      groups.includes(index) ? groups : [...groups, index],
                    );
                    setActiveGroup(index);
                  }}
                  >
                    <button
                      type="button"
                      aria-expanded={activeGroup === index}
                    onClick={() => {
                      if (isClosing) return;
                      setRevealedGroups((groups) =>
                        groups.includes(index) ? groups : [...groups, index],
                      );
                      setActiveGroup(activeGroup === index ? null : index);
                    }}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-[15px] transition ${
                        activeGroup === index ? "bg-black/[0.06]" : "hover:bg-black/[0.04]"
                      }`}
                    >
                      <ChevronLeft className="size-3.5 opacity-60" />
                      <span>{group.label}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {MARKETING_NAV.map((group, index) => {
                const expanded = activeGroup === index;
                const hasBeenRevealed = revealedGroups.includes(index);
                return (
                  <div
                    key={`${group.label}-submenu`}
                    className={`absolute right-[calc(100%+8px)] w-[176px] overflow-hidden rounded-xl [will-change:max-width] ${
                      expanded ? "" : "pointer-events-none"
                    }`}
                    style={{
                      top: `${8 + index * 46.5}px`,
                      maxWidth: hasBeenRevealed ? undefined : 0,
                      animation: hasBeenRevealed
                        ? `${
                            expanded
                              ? "autodoc-submenu-unroll-left"
                              : "autodoc-submenu-roll-right"
                          } ${expanded ? 650 : 500}ms cubic-bezier(0.22, 1, 0.36, 1) both`
                        : "none",
                    }}
                  >
                    <div className="w-[176px] rounded-xl border border-black/10 bg-[#F5F2EB] py-2 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
                      {group.items.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => {
                            setMenuOpen(false);
                            setActiveGroup(null);
                          }}
                          className="block px-4 py-2.5 text-sm text-[#1a1a1a]/75 hover:bg-black/[0.04] hover:text-[#1a1a1a]"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
          </nav>
        </div>
      </div>
    </header>
  );
}
