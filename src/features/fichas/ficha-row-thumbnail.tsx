"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { Image as ImageIcon } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useRef, useState } from "react";
import { getCloudinaryTransformedImageUrl } from "@/lib/cloudinary-images";

type FichaRowThumbnailProps = {
  alt: string;
  imageUrl?: string | null;
};

const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 90;
const ZOOM_WIDTH = 560;
const ZOOM_HEIGHT = 315;

export function FichaRowThumbnail({ alt, imageUrl }: FichaRowThumbnailProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isZoomLoaded, setIsZoomLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const thumbUrl = imageUrl ? getCloudinaryTransformedImageUrl(imageUrl, THUMB_WIDTH, THUMB_HEIGHT) : "";
  const zoomUrl = imageUrl ? getCloudinaryTransformedImageUrl(imageUrl, ZOOM_WIDTH, ZOOM_HEIGHT, "auto:good") : "";

  const closePreview = useCallback(() => {
    setIsOpen(false);
    setPosition(null);
  }, []);

  const openPreview = useCallback(() => {
    setIsOpen(true);
    setIsZoomLoaded(false);
  }, []);

  const updatePointerPosition = useCallback((event: PointerEvent<HTMLElement>) => {
    const preview = previewRef.current;
    const previewWidth = preview?.offsetWidth ?? ZOOM_WIDTH + 12;
    const previewHeight = preview?.offsetHeight ?? ZOOM_HEIGHT + 12;
    const viewportPadding = 10;
    const pointerOffset = 18;
    const maxLeft = window.innerWidth - previewWidth - viewportPadding;
    const maxTop = window.innerHeight - previewHeight - viewportPadding;

    setPosition({
      left: Math.max(viewportPadding, Math.min(event.clientX + pointerOffset, maxLeft)),
      top: Math.max(viewportPadding, Math.min(event.clientY + pointerOffset, maxTop)),
    });
  }, []);

  if (!imageUrl) {
    return (
      <div className="ficha-row__thumb" aria-label="Ficha sem imagem">
        <ImageIcon className="ficha-row__placeholder" aria-hidden="true" size={20} />
      </div>
    );
  }

  return (
    <>
      <button
        aria-label={`Ampliar imagem de ${alt}`}
        className="ficha-row__thumb ficha-row__thumb--interactive"
        onBlur={closePreview}
        onPointerEnter={(event) => {
          openPreview();
          updatePointerPosition(event);
        }}
        onPointerLeave={closePreview}
        onPointerMove={updatePointerPosition}
        type="button"
      >
        {!isLoaded ? (
          <span className="ficha-row__thumb-loading" aria-hidden="true">
            <span className="button-spinner" />
          </span>
        ) : null}
        <Image
          alt=""
          className="ficha-row__image"
          height={THUMB_HEIGHT}
          onLoad={() => setIsLoaded(true)}
          src={thumbUrl}
          unoptimized
          width={THUMB_WIDTH}
        />
      </button>

      {typeof document !== "undefined" && isOpen && zoomUrl
        ? createPortal(
            <div className="ficha-row-image-preview" ref={previewRef} role="tooltip" style={position ?? undefined}>
              {!isZoomLoaded ? (
                <span className="ficha-row-image-preview__loading" aria-hidden="true">
                  <span className="button-spinner" />
                </span>
              ) : null}
              <Image
                alt=""
                height={ZOOM_HEIGHT}
                onLoad={() => setIsZoomLoaded(true)}
                src={zoomUrl}
                unoptimized
                width={ZOOM_WIDTH}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
