"use client";
import { AnimatePresence, LayoutGroup, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import logo from "@/assets/sbs-logo.png";
import { nav } from "@/content/landing";
import { useEnter } from "@/lib/enter";
import { dur, ease, spring } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  const enter = useEnter();
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const last = useRef(0);

  useMotionValueEvent(scrollY, "change", (y) => {
    const dir = y > last.current ? "down" : "up";
    if (dir === "down" && y > 140 && !open) setHidden(true);
    if (dir === "up") setHidden(false);
    setScrolled(y > 24);
    last.current = y;
  });

  return (
    <motion.header
      animate={{ y: hidden ? "-110%" : "0%" }}
      transition={{ duration: dur.slow, ease: ease.drawer }}
      className={cn("fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300", scrolled || open ? "border-b border-border bg-paper/85 backdrop-blur-md" : "border-b border-transparent")}
    >
      <div className="mx-auto flex h-16 max-w-[84em] items-center justify-between gap-6 px-5 sm:px-8">
        <a href="#top" aria-label={nav.aria.home} className="shrink-0">
          <Image src={logo} alt="SBS — Sovereign Business & Strategy" priority className="h-9 w-auto" sizes="120px" />
        </a>
        <nav aria-label={nav.aria.primary} className="hidden md:block">
          <LayoutGroup id="landing-nav">
            <ul className="flex items-center gap-1" onMouseLeave={() => setHover(null)}>
              {nav.links.map((l) => (
                <li key={l.href} className="relative">
                  <a href={l.href} onMouseEnter={() => setHover(l.href)} onFocus={() => setHover(l.href)} className="relative z-10 block rounded-full px-3.5 py-2 text-base font-medium text-text-secondary transition-colors duration-150 hover:text-ink focus-visible:text-ink">
                    {l.label}
                  </a>
                  {hover === l.href && <motion.span layoutId="nav-pill" transition={spring.ui} className="absolute inset-0 rounded-full bg-ink/[0.06]" />}
                </li>
              ))}
            </ul>
          </LayoutGroup>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <Button variant="accent" onClick={() => enter("u-sophie")}>
              {nav.cta}
            </Button>
          </div>
          <button type="button" aria-label={open ? nav.aria.close : nav.aria.open} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex size-10 items-center justify-center rounded-md text-ink hover:bg-ink/5 md:hidden">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: dur.base, ease: ease.out }} className="border-t border-border bg-paper px-5 pb-5 md:hidden">
            <ul className="flex flex-col py-2">
              {nav.links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={() => setOpen(false)} className="block border-b border-border py-3 text-md font-medium text-ink">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <Button variant="accent" className="mt-3 w-full" onClick={() => enter("u-sophie")}>
              {nav.cta}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div aria-hidden style={{ scaleX: progress }} className="absolute inset-x-0 bottom-[-1px] h-px origin-left bg-accent" />
    </motion.header>
  );
}
