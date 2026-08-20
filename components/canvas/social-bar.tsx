"use client";

const LINKS = [
  {
    name: "X",
    href: "https://x.com/CesarGamez04",
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/cesar-gamez-84448124a/",
  },
  {
    name: "GitHub",
    href: "https://github.com/cesar-gamez",
  },
] as const;

export function SocialBar() {
  return (
    <div
      data-canvas-chrome
      className="z-canvas-chrome pointer-events-none absolute inset-x-0 flex justify-center px-4"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <nav
        aria-label="Cesar Gamez elsewhere"
        className="pointer-events-auto"
      >
        <ul className="flex items-center rounded-full border border-black/10 bg-white/70 px-1 py-1 shadow-sm backdrop-blur-xl backdrop-saturate-150">
          {LINKS.map(({ name, href }, index) => (
            <li key={name} className="flex items-center">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="mx-0.5 h-3 w-px bg-black/10"
                />
              ) : null}
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="canvas-type-body rounded-full px-3.5 py-1.5 text-[12px] text-black outline-none transition duration-150 ease-out hover:bg-black/5 focus-visible:bg-black/5 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
