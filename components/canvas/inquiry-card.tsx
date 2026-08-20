"use client";

import { useRef, useState } from "react";

const EMAIL = "cesar.andres.gamez2004@gmail.com";

export function InquiryCard() {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(0);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      data-canvas-chrome
      className="z-canvas-chrome pointer-events-none absolute flex justify-start px-4 max-md:bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] md:bottom-[max(1rem,env(safe-area-inset-bottom))]"
      style={{ left: "max(0px, env(safe-area-inset-left))" }}
    >
      <aside className="canvas-type-body pointer-events-auto relative w-[min(17.5rem,calc(100vw-2rem))] rounded-[8px] bg-[#8e8e8e] px-3.5 py-3 text-[12px] leading-snug text-white lowercase">
        <p className="text-pretty">
          for more serious inquiries, or if you&apos;d like a deeper view of my
          work, email me at{" "}
          <a
            href={`mailto:${EMAIL}`}
            className="underline underline-offset-2 outline-none transition duration-150 ease-out hover:opacity-70 focus-visible:opacity-70"
            onClick={(event) => {
              event.preventDefault();
              void copyEmail();
            }}
          >
            {EMAIL}
          </a>
        </p>
        <p
          role="status"
          className={`pointer-events-none absolute bottom-[calc(100%+8px)] left-0 rounded-[8px] bg-[#8e8e8e] px-3 py-1.5 text-[12px] text-white normal-case transition duration-150 ease-out ${
            copied ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={!copied}
        >
          Email copied
        </p>
      </aside>
    </div>
  );
}
