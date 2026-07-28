"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type PointerEvent, type WheelEvent } from "react";
import { Crop, Download, ImagePlus, RotateCcw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IMAGE_CROPPER_WATERMARK } from "./image-cropper-watermark";

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1440;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
type Point = { x: number; y: number };

export function ImageCropper() {
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ origin: Point; offset: Point } | null>(null);
  const downloadCountRef = useRef(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("imagem");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [naturalAspect, setNaturalAspect] = useState(3 / 4);

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  function resetCrop() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function selectFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Selecione um arquivo de imagem válido.");
    if (file.size > MAX_FILE_SIZE) return void toast.error("A imagem deve ter no máximo 25 MB.");
    setImageUrl(URL.createObjectURL(file));
    setFileName(file.name.replace(/\.[^.]+$/, "") || "imagem");
    downloadCountRef.current = 0;
    resetCrop();
  }

  function clearImage() {
    setImageUrl(null);
    resetCrop();
    if (inputRef.current) inputRef.current.value = "";
  }

  function clampOffset(next: Point, nextZoom = zoom): Point {
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!frame || !image?.naturalWidth || !image.naturalHeight) return next;
    const baseScale = Math.max(frame.clientWidth / image.naturalWidth, frame.clientHeight / image.naturalHeight);
    const maxX = Math.max(0, (image.naturalWidth * baseScale * nextZoom - frame.clientWidth) / 2);
    const maxY = Math.max(0, (image.naturalHeight * baseScale * nextZoom - frame.clientHeight) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { origin: { x: event.clientX, y: event.clientY }, offset };
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    setOffset(clampOffset({
      x: dragRef.current.offset.x + event.clientX - dragRef.current.origin.x,
      y: dragRef.current.offset.y + event.clientY - dragRef.current.origin.y,
    }));
  }

  function endDrag() {
    dragRef.current = null;
    setIsDragging(false);
  }

  function changeZoom(value: number) {
    const nextZoom = Math.max(1, Math.min(3, value));
    setZoom(nextZoom);
    setOffset((current) => clampOffset(current, nextZoom));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    changeZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1));
  }

  function handleImageLoad() {
    const image = imageRef.current;
    if (image?.naturalWidth && image.naturalHeight) {
      setNaturalAspect(image.naturalWidth / image.naturalHeight);
    }
    resetCrop();
  }

  function downloadCrop() {
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!frame || !image?.naturalWidth || !image.naturalHeight) return;
    const scale = Math.max(frame.clientWidth / image.naturalWidth, frame.clientHeight / image.naturalHeight) * zoom;
    const sourceWidth = frame.clientWidth / scale;
    const sourceHeight = frame.clientHeight / scale;
    const sourceX = (image.naturalWidth - sourceWidth) / 2 - offset.x / scale;
    const sourceY = (image.naturalHeight - sourceHeight) / 2 - offset.y / scale;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return void toast.error("Não foi possível processar a imagem.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    const watermark = new Image();
    watermark.onload = () => {
      const watermarkWidth = 150;
      const watermarkHeight = (watermark.height / watermark.width) * watermarkWidth;
      context.drawImage(watermark, canvas.width - watermarkWidth - 50, canvas.height - watermarkHeight - 50, watermarkWidth, watermarkHeight);
      canvas.toBlob((blob) => {
        if (!blob) return void toast.error("Não foi possível gerar o arquivo.");
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        downloadCountRef.current += 1;
        link.download = `${fileName}_instagram_${downloadCountRef.current}.png`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("Imagem recortada e baixada.");
      }, "image/png");
    };
    watermark.onerror = () => toast.error("Não foi possível aplicar a marca-d’água.");
    watermark.src = IMAGE_CROPPER_WATERMARK;
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsOver(false);
    selectFile(event.dataTransfer.files?.[0]);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
  }

  return (
    <section className="image-cropper" aria-labelledby="image-cropper-title">
      <header className="image-cropper__header">
        <p className="eyebrow">Ferramentas</p>
        <div className="image-cropper__title">
          <span className="image-cropper__title-icon" aria-hidden="true"><Crop size={22} /></span>
          <div><h1 id="image-cropper-title">Cortar imagem</h1><p>Prepare uma imagem no formato retrato 3:4 para o Instagram.</p></div>
        </div>
      </header>

      {!imageUrl ? (
        <button className={`image-cropper__upload${isOver ? " is-over" : ""}`} onClick={() => inputRef.current?.click()} onDragEnter={() => setIsOver(true)} onDragLeave={() => setIsOver(false)} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} type="button">
          <span className="image-cropper__upload-icon" aria-hidden="true"><ImagePlus size={30} /></span>
          <strong>Arraste uma imagem para cá</strong><span>ou clique para selecionar</span>
          <span className="image-cropper__upload-meta">JPG, PNG ou WebP · até 25 MB</span>
        </button>
      ) : (
        <div className="image-cropper__workspace">
          <div className="image-cropper__editor-card">
            <div className="image-cropper__format"><span>Formato retrato 3:4</span><strong>{OUTPUT_WIDTH} × {OUTPUT_HEIGHT} px</strong></div>
            <div aria-label="Área de recorte. Arraste a imagem para reposicioná-la." className={`image-cropper__frame${isDragging ? " is-dragging" : ""}`} onPointerCancel={endDrag} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={endDrag} onWheel={handleWheel} ref={frameRef} role="img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" draggable={false} onLoad={handleImageLoad} ref={imageRef} src={imageUrl} style={{ height: naturalAspect >= 3 / 4 ? "100%" : `${((3 / 4) / naturalAspect) * 100}%`, left: `calc(50% + ${offset.x}px)`, top: `calc(50% + ${offset.y}px)`, transform: `translate(-50%, -50%) scale(${zoom})`, width: naturalAspect >= 3 / 4 ? `${(naturalAspect / (3 / 4)) * 100}%` : "100%" }} />
              <div className="image-cropper__grid" aria-hidden="true" />
            </div>
            <label className="image-cropper__zoom"><span>Zoom</span><input aria-label="Zoom da imagem" max="3" min="1" onChange={(event) => changeZoom(Number(event.target.value))} step="0.01" type="range" value={zoom} /><output>{Math.round(zoom * 100)}%</output></label>
          </div>
          <aside className="image-cropper__actions">
            <div><h2>Ajuste o enquadramento</h2><p>Arraste a imagem e use o controle ou a roda do mouse para aplicar zoom. O arquivo é processado somente neste navegador.</p></div>
            <Button className="image-cropper__download" onClick={downloadCrop}><Download size={18} />Cortar e baixar</Button>
            <Button onClick={resetCrop} variant="secondary"><RotateCcw size={17} />Redefinir corte</Button>
            <Button onClick={() => inputRef.current?.click()} variant="secondary"><Upload size={17} />Trocar imagem</Button>
            <Button onClick={clearImage} variant="ghost"><X size={17} />Remover imagem</Button>
          </aside>
        </div>
      )}
      <input accept="image/jpeg,image/png,image/webp" className="image-cropper__file-input" onChange={handleFileChange} ref={inputRef} type="file" />
    </section>
  );
}
