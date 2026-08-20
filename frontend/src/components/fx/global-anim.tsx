import { useEffect } from "react";

/**
 * Global animation mounter:
 *  - Auto-attaches `data-anim-reveal` to .glass-card so they enter on scroll
 *  - IntersectionObserver toggles data-anim-reveal="in"
 *  - Magnetic attraction for elements with [data-magnetic]
 *  - Parallax-y for elements with .parallax-y (drift on scroll)
 */
export function GlobalAnim() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // ---- Entrance reveal ---------------------------------------------------
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.animReveal = "in";
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );

    const attach = (el: Element) => {
      const h = el as HTMLElement;
      if (h.dataset.animReveal) return;
      h.dataset.animReveal = "out";
      io.observe(h);
    };

    document.querySelectorAll(".glass-card, [data-reveal], [data-draw]").forEach(attach);

    // SVG path draw-on: prep stroke-dash on observed paths
    document.querySelectorAll<SVGPathElement>("[data-draw] path, path[data-draw]").forEach((p) => {
      try {
        const len = p.getTotalLength();
        p.style.strokeDasharray = String(len);
        p.style.strokeDashoffset = String(len);
        p.style.transition = "stroke-dashoffset 1400ms cubic-bezier(0.2,0.8,0.2,1)";
        const host = (p.closest("[data-draw]") as HTMLElement | null) ?? (p as unknown as HTMLElement);
        const obs = new IntersectionObserver((es) => {
          es.forEach((e) => {
            if (e.isIntersecting) {
              p.style.strokeDashoffset = "0";
              obs.disconnect();
            }
          });
        }, { threshold: 0.2 });
        obs.observe(host);
      } catch { /* non-renderable path */ }
    });

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.matches?.(".glass-card, [data-reveal]")) attach(n);
          n.querySelectorAll?.(".glass-card, [data-reveal]").forEach(attach);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // ---- Magnetic buttons --------------------------------------------------
    const onPointerMove = (ev: PointerEvent) => {
      const target = (ev.target as HTMLElement | null)?.closest?.(
        "[data-magnetic]"
      ) as HTMLElement | null;
      if (!target) return;
      const r = target.getBoundingClientRect();
      const strength = parseFloat(target.dataset.magnetic || "0.25");
      const x = (ev.clientX - (r.left + r.width / 2)) * strength;
      const y = (ev.clientY - (r.top + r.height / 2)) * strength;
      target.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      target.style.transition = "transform 120ms cubic-bezier(0.2,0.8,0.2,1)";
    };
    const onPointerLeave = (ev: PointerEvent) => {
      const target = (ev.target as HTMLElement | null)?.closest?.(
        "[data-magnetic]"
      ) as HTMLElement | null;
      if (!target) return;
      target.style.transform = "translate3d(0,0,0)";
      target.style.transition = "transform 360ms cubic-bezier(0.2,0.8,0.2,1)";
    };
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerLeave, { passive: true });

    // ---- Parallax-y --------------------------------------------------------
    let raf = 0;
    const tick = () => {
      const y = window.scrollY;
      document.querySelectorAll<HTMLElement>(".parallax-y").forEach((el) => {
        const speed = parseFloat(el.dataset.speed || "0.18");
        el.style.setProperty("--parallax-y", `${-y * speed}px`);
      });
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
