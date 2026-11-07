import React from "react";
import { ImageCatalogue } from "@/components/ImageCatalogue";

/**
 * Regex pour extraire l'ID d'une vidéo YouTube (watch, youtu.be, embed, shorts).
 */
const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/**
 * Regex pour extraire l'ID d'une vidéo Vimeo.
 */
const VIMEO_REGEX = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/;

/**
 * Regex pour détecter un fichier vidéo direct.
 */
const DIRECT_VIDEO_REGEX = /^https?:\/\/[^\s]+\.(mp4|webm|ogg)(\?[^\s]*)?$/i;

/**
 * Regex pour détecter une image Markdown `![alt](url)`.
 */
const IMAGE_MARKDOWN_REGEX = /^!\[([^\]]*)\]\(([^)]+)\)$/;

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content || !content.trim()) {
    return null;
  }

  // Découpage en blocs par double saut de ligne
  const rawBlocks = content.split(/\n\n+/);

  return (
    <div className={`prose prose-invert max-w-none text-foreground/90 ${className}`}>
      {rawBlocks.map((block, i) => {
        const trimmed = block.trim();

        // 1. Détection Vidéo YouTube
        const ytMatch = trimmed.match(YOUTUBE_REGEX);
        if (ytMatch && (trimmed.startsWith("http") || trimmed.startsWith("www."))) {
          const videoId = ytMatch[1];
          return (
            <div
              key={i}
              className="my-6 aspect-video w-full overflow-hidden rounded-xl border border-border bg-black shadow-md"
              style={{ contentVisibility: "auto", containIntrinsicSize: "560px 315px" }}
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title="Vidéo YouTube"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          );
        }

        // 2. Détection Vidéo Vimeo
        const vimeoMatch = trimmed.match(VIMEO_REGEX);
        if (vimeoMatch && (trimmed.startsWith("http") || trimmed.startsWith("www."))) {
          const videoId = vimeoMatch[1];
          return (
            <div
              key={i}
              className="my-6 aspect-video w-full overflow-hidden rounded-xl border border-border bg-black shadow-md"
              style={{ contentVisibility: "auto", containIntrinsicSize: "560px 315px" }}
            >
              <iframe
                src={`https://player.vimeo.com/video/${videoId}`}
                title="Vidéo Vimeo"
                loading="lazy"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          );
        }

        // 3. Détection Vidéo directe (MP4, WebM)
        if (DIRECT_VIDEO_REGEX.test(trimmed)) {
          return (
            <div
              key={i}
              className="my-6 aspect-video w-full overflow-hidden rounded-xl border border-border bg-black shadow-md"
              style={{ contentVisibility: "auto", containIntrinsicSize: "560px 315px" }}
            >
              <video
                controls
                preload="metadata"
                playsInline
                className="h-full w-full object-contain"
                src={trimmed}
              >
                Votre navigateur ne supporte pas la lecture vidéo.
              </video>
            </div>
          );
        }

        // 4. Détection Image Markdown ![alt](url)
        const imgMatch = trimmed.match(IMAGE_MARKDOWN_REGEX);
        if (imgMatch) {
          const alt = imgMatch[1];
          const src = imgMatch[2];
          return (
            <figure key={i} className="my-6 space-y-2">
              <ImageCatalogue
                src={src}
                alt={alt || "Image de l'article"}
                className="max-h-[500px] w-full rounded-xl border border-border object-cover shadow-sm"
              />
              {alt && (
                <figcaption className="text-center text-xs text-muted-foreground">{alt}</figcaption>
              )}
            </figure>
          );
        }

        // 5. Titres
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={i} className="mt-8 mb-4 text-2xl font-bold tracking-tight text-foreground">
              {renderInline(trimmed.slice(2))}
            </h2>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={i} className="mt-6 mb-3 text-xl font-semibold tracking-tight text-foreground">
              {renderInline(trimmed.slice(3))}
            </h3>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={i} className="mt-5 mb-2 text-lg font-medium text-foreground">
              {renderInline(trimmed.slice(4))}
            </h4>
          );
        }

        // 6. Citations
        if (trimmed.startsWith("> ")) {
          const quoteLines = trimmed
            .split("\n")
            .map((l) => l.replace(/^>\s*/, ""))
            .join("\n");
          return (
            <blockquote
              key={i}
              className="my-5 border-s-4 border-primary bg-muted/30 p-4 ps-4 italic text-foreground/80 rounded-e-lg"
            >
              {renderInline(quoteLines)}
            </blockquote>
          );
        }

        // 7. Listes ordonnées (1. 2.)
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split(/\n/).map((l) => l.replace(/^\d+\.\s*/, ""));
          return (
            <ol
              key={i}
              className="my-4 list-decimal space-y-1.5 ps-6 text-sm md:text-base leading-relaxed"
            >
              {items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ol>
          );
        }

        // 8. Listes non ordonnées (- ou *)
        if (/^[-*]\s/.test(trimmed)) {
          const items = trimmed.split(/\n/).map((l) => l.replace(/^[-*]\s*/, ""));
          return (
            <ul
              key={i}
              className="my-4 list-disc space-y-1.5 ps-6 text-sm md:text-base leading-relaxed"
            >
              {items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ul>
          );
        }

        // 9. Paragraphe standard
        return (
          <p
            key={i}
            className="my-4 whitespace-pre-line text-sm md:text-base leading-relaxed text-foreground/90"
          >
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parseur inline gérant le gras (**texte**), l'italique (*texte*),
 * les liens ([texte](url)), et le code (`code`).
 */
function renderInline(text: string): React.ReactNode {
  // Découpage récursif / par tokens
  const tokenRegex =
    /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|`[^`]+`|(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11})/g;

  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Gras: **texte**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    // Italique: *texte*
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    // Code en ligne: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={index} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Lien Markdown: [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      const url = linkMatch[2];
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-primary font-medium underline underline-offset-4 hover:opacity-80 transition-opacity"
        >
          {label}
        </a>
      );
    }

    // Vidéo YouTube inline ou en URL simple dans un paragraphe
    const ytMatch = part.match(YOUTUBE_REGEX);
    if (ytMatch && (part.startsWith("http") || part.startsWith("www."))) {
      const videoId = ytMatch[1];
      return (
        <span
          key={index}
          className="block my-4 aspect-video w-full overflow-hidden rounded-xl border border-border bg-black shadow-md"
          style={{ contentVisibility: "auto", containIntrinsicSize: "560px 315px" }}
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title="Vidéo YouTube"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </span>
      );
    }

    return <span key={index}>{part}</span>;
  });
}
