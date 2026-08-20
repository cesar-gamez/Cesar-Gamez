"use client";

export function RecenterToast({
  visible,
  onRecenter,
}: {
  visible: boolean;
  onRecenter: () => void;
}) {
  return (
    <div
      data-canvas-chrome
      className="z-canvas-chrome pointer-events-none absolute flex justify-end px-4 max-md:bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] md:bottom-[max(1rem,env(safe-area-inset-bottom))]"
      style={{ right: "max(0px, env(safe-area-inset-right))" }}
    >
      <button
        type="button"
        onClick={onRecenter}
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        className={`canvas-type-body rounded-[8px] bg-[#8e8e8e] px-3.5 py-3 text-[12px] leading-snug text-white lowercase outline-none transition duration-150 ease-out hover:opacity-90 focus-visible:opacity-90 ${
          visible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        return to center
      </button>
    </div>
  );
}
