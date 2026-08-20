"use client";

import type { RefObject } from "react";
import { MEDIA_ACCEPT, mediaKind, type CanvasMedia } from "@/lib/canvas/media";
import type { CanvasText } from "@/lib/canvas/scene";

type SaveState = "saved" | "unsaved" | "saving" | "error";
type Tool = "select" | "text";

export function EditorBar({
  tool,
  onTool,
  zoomLabelRef,
  selectedText,
  selectedMedia,
  onFontSize,
  onBold,
  onItalic,
  onOpacity,
  onTextContent,
  onMediaTitle,
  onMediaBody,
  onToggleDetail,
  onToggleMute,
  onPickMedia,
  onSetStartView,
  onSave,
  saveState,
  error,
  startZoom,
}: {
  tool: Tool;
  onTool: (tool: Tool) => void;
  zoomLabelRef: RefObject<HTMLSpanElement | null>;
  selectedText: CanvasText | null;
  selectedMedia: CanvasMedia | null;
  onFontSize: (size: number) => void;
  onBold: () => void;
  onItalic: () => void;
  onOpacity: (opacity: number) => void;
  onTextContent: (text: string) => void;
  onMediaTitle: (title: string) => void;
  onMediaBody: (body: string) => void;
  onToggleDetail: () => void;
  onToggleMute: () => void;
  onPickMedia: (files: FileList) => void;
  onSetStartView: () => void;
  onSave: () => void;
  saveState: SaveState;
  error: string | null;
  startZoom: number | null;
}) {
  return (
    <div
      className="pointer-events-auto absolute inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex max-w-full flex-wrap items-center gap-2 rounded-[8px] border border-black/50 bg-white px-2 py-2 text-[12px] text-black">
        <button
          type="button"
          onClick={() => onTool("select")}
          className={`rounded-[8px] px-3 py-1.5 ${
            tool === "select" ? "bg-black text-white" : "hover:bg-black/5"
          }`}
        >
          Move
        </button>
        <button
          type="button"
          onClick={() => onTool("text")}
          className={`rounded-[8px] px-3 py-1.5 ${
            tool === "text" ? "bg-black text-white" : "hover:bg-black/5"
          }`}
        >
          Text
        </button>
        <label className="rounded-[8px] px-3 py-1.5 hover:bg-black/5">
          Media
          <input
            type="file"
            accept={MEDIA_ACCEPT}
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) onPickMedia(event.target.files);
              event.target.value = "";
            }}
          />
        </label>

        <span className="mx-1 h-4 w-px bg-black/20" />

        <span className="tabular-nums text-black/60">
          <span ref={zoomLabelRef}>100%</span>
        </span>
        {startZoom != null ? (
          <span className="tabular-nums text-black/40">
            Start {Math.round(startZoom * 100)}%
          </span>
        ) : null}

        {selectedText ? (
          <>
            <span className="mx-1 h-4 w-px bg-black/20" />
            <label className="flex items-center gap-2">
              Size
              <input
                type="number"
                min={8}
                max={400}
                value={selectedText.fontSize}
                onChange={(event) => onFontSize(Number(event.target.value))}
                className="h-7 w-16 rounded-[8px] border border-black/20 bg-black/5 px-2 tabular-nums"
              />
            </label>
            <button
              type="button"
              aria-label="Bold"
              aria-pressed={selectedText.bold}
              onClick={onBold}
              className={`rounded-[8px] px-3 py-1.5 font-bold ${
                selectedText.bold ? "bg-black text-white" : "hover:bg-black/5"
              }`}
            >
              B
            </button>
            <button
              type="button"
              aria-label="Italic"
              aria-pressed={selectedText.italic}
              onClick={onItalic}
              className={`rounded-[8px] px-3 py-1.5 italic ${
                selectedText.italic ? "bg-black text-white" : "hover:bg-black/5"
              }`}
            >
              I
            </button>
            <label className="flex items-center gap-2">
              Opacity
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(selectedText.opacity * 100)}
                onChange={(event) =>
                  onOpacity(Number(event.target.value) / 100)
                }
                className="h-7 w-16 rounded-[8px] border border-black/20 bg-black/5 px-2 tabular-nums"
              />
            </label>
            {selectedText.role === "body" ? (
              <input
                type="text"
                value={selectedText.text}
                onChange={(event) => onTextContent(event.target.value)}
                className="h-7 w-40 rounded-[8px] border border-black/20 bg-black/5 px-2"
              />
            ) : null}
          </>
        ) : null}

        {selectedMedia ? (
          <>
            <span className="mx-1 h-4 w-px bg-black/20" />
            <input
              type="text"
              aria-label="Detail title"
              value={selectedMedia.title}
              onChange={(event) => onMediaTitle(event.target.value)}
              className="h-7 w-36 rounded-[8px] border border-black/20 bg-black/5 px-2"
            />
            <textarea
              aria-label="Detail text"
              value={selectedMedia.body}
              onChange={(event) => onMediaBody(event.target.value)}
              rows={2}
              className="h-14 w-52 resize-none rounded-[8px] border border-black/20 bg-black/5 px-2 py-1"
            />
            <button
              type="button"
              aria-pressed={selectedMedia.detailEnabled}
              onClick={onToggleDetail}
              className={`rounded-[8px] px-3 py-1.5 ${
                selectedMedia.detailEnabled
                  ? "bg-black text-white"
                  : "hover:bg-black/5"
              }`}
            >
              Detail
            </button>
            {mediaKind(selectedMedia.src) === "video" ? (
              <button
                type="button"
                aria-pressed={selectedMedia.muted}
                onClick={onToggleMute}
                className={`rounded-[8px] px-3 py-1.5 ${
                  selectedMedia.muted
                    ? "bg-black text-white"
                    : "hover:bg-black/5"
                }`}
              >
                Mute
              </button>
            ) : null}
          </>
        ) : null}

        <span className="mx-1 h-4 w-px bg-black/20" />

        <button
          type="button"
          onClick={onSetStartView}
          className="rounded-[8px] px-3 py-1.5 hover:bg-black/5"
        >
          Set start view
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saveState === "saving"}
          className="rounded-[8px] bg-black px-3 py-1.5 text-white hover:bg-black/80 disabled:opacity-50"
        >
          {saveState === "saving" ? "Saving" : "Save"}
        </button>
        <span className="px-1 text-black/40">
          {saveState === "unsaved"
            ? "Unsaved"
            : saveState === "error"
              ? error ?? "Save failed"
              : saveState === "saved"
                ? "Saved"
                : ""}
        </span>
      </div>
    </div>
  );
}
