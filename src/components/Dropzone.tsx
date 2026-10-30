"use client";

import { UploadCloud } from "lucide-react";
import { useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useAppearance } from "./AppearanceProvider";

interface DropzoneProps {
  /** Called with the files dropped or picked (already limited by `multiple` and `maxFiles`). */
  onFiles: (files: File[]) => void;
  /** Accepted types, as for `<input type="file">`; dropped files of another type are ignored. */
  accept?: string;
  multiple?: boolean;
  /** With `multiple`: at most this many files are passed on. */
  maxFiles?: number;
  disabled?: boolean;
  /** Small second line under the prompt, e.g. "JPG, PNG, WebP, 4 Mo". Already translated. */
  hint?: ReactNode;
  /** Names of the files currently chosen, shown under the prompt. */
  selected?: readonly string[];
  /** Replaces the default prompt. */
  children?: ReactNode;
  /** Sizing and layout, e.g. "h-28 w-28" for a tile. */
  className?: string;
  /** Accessible name of the field. */
  label?: string;
}

/** True when the dropped file matches an `accept` list such as "image/png,image/jpeg" or ".pdf" or "image/*". */
export function matchesAccept(file: Pick<File, "type" | "name">, accept: string | undefined): boolean {
  if (!accept) return true;

  return accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.startsWith(".")) return file.name.toLowerCase().endsWith(rule);
      if (rule.endsWith("/*")) return file.type.toLowerCase().startsWith(rule.slice(0, -1));
      return file.type.toLowerCase() === rule;
    });
}

/**
 * A file field as a drop area: drag files onto it, or click it (or press
 * Enter / Space) to pick them. The real `<input type="file">` stays in the
 * page for keyboard and screen-reader users.
 */
export function Dropzone({ onFiles, accept, multiple = false, maxFiles, disabled = false, hint, selected, children, className = "", label }: DropzoneProps) {
  const { tr } = useAppearance();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  // dragenter/dragleave also fire for the children: count them so the highlight does not flicker.
  const depth = useRef(0);

  function pass(list: FileList | File[] | null) {
    if (disabled || !list) return;
    let files = Array.from(list).filter((file) => matchesAccept(file, accept));
    files = multiple ? files.slice(0, maxFiles ?? files.length) : files.slice(0, 1);
    if (files.length > 0) onFiles(files);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    depth.current = 0;
    setOver(false);
    pass(event.dataTransfer.files);
  }

  return (
    <label
      htmlFor={inputId}
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        if (!disabled) setOver(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={onDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed px-4 py-6 text-center text-sm transition-colors focus-within:border-gold ${
        over ? "border-gold bg-gold-highlight text-ink" : "border-line text-ink-soft hover:border-gold"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
    >
      {children ?? (
        <>
          <UploadCloud className="h-6 w-6 text-gold" aria-hidden />
          <span className="text-ink">{over ? tr("Déposez ici") : multiple ? tr("Glissez vos fichiers ici ou cliquez pour parcourir") : tr("Glissez un fichier ici ou cliquez pour parcourir")}</span>
        </>
      )}
      {hint ? <span className="text-xs text-ink-soft">{hint}</span> : null}
      {selected && selected.length > 0 ? <span className="max-w-full truncate text-xs font-medium text-ink">{selected.join(", ")}</span> : null}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          pass(event.target.files);
          // The same file can be picked again.
          event.target.value = "";
        }}
      />
    </label>
  );
}
