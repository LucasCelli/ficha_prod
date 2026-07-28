"use client";

import { Palette, SlidersHorizontal, Sparkles } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

export type FilterMode = "none" | "skin" | "vibrant" | "custom";
export type FilterSettings = {
  brightness: number;
  contrast: number;
  hue: number;
  saturation: number;
  temperature: number;
  vibrance: number;
};

export const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  brightness: 0,
  contrast: 0,
  hue: 0,
  saturation: 0,
  temperature: 0,
  vibrance: 0,
};

export function getImageFilter(mode: FilterMode, settings: FilterSettings) {
  if (mode === "skin") return "brightness(1.03) contrast(1.02) saturate(0.88) hue-rotate(-5deg)";
  if (mode === "vibrant") return "contrast(1.04) saturate(1.22)";
  if (mode !== "custom") return "none";

  const saturation = Math.max(0, (1 + settings.saturation / 100) * (1 + settings.vibrance / 200));
  const temperatureHue = settings.temperature * -0.08;
  const warmth = Math.max(0, settings.temperature) / 500;
  return [
    `brightness(${1 + settings.brightness / 100})`,
    `contrast(${1 + settings.contrast / 100})`,
    `saturate(${saturation})`,
    `sepia(${warmth})`,
    `hue-rotate(${settings.hue + temperatureHue}deg)`,
  ].join(" ");
}

type ImageCropperFiltersProps = {
  mode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
  onSettingsChange: (settings: FilterSettings) => void;
  settings: FilterSettings;
};

const controls: Array<{ key: keyof FilterSettings; label: string; max: number; min: number }> = [
  { key: "hue", label: "Matiz", min: -180, max: 180 },
  { key: "vibrance", label: "Vibra\u00e7\u00e3o", min: -100, max: 100 },
  { key: "brightness", label: "Brilho", min: -50, max: 50 },
  { key: "saturation", label: "Satura\u00e7\u00e3o", min: -100, max: 100 },
  { key: "contrast", label: "Contraste", min: -50, max: 50 },
  { key: "temperature", label: "Temperatura", min: -100, max: 100 },
];

export function ImageCropperFilters({ mode, onModeChange, onSettingsChange, settings }: ImageCropperFiltersProps) {
  function toggleMode(next: Exclude<FilterMode, "none">) {
    onModeChange(mode === next ? "none" : next);
  }

  return (
    <section className="image-filters" aria-labelledby="image-filters-title">
      <div className="image-filters__heading">
        <div><h2 id="image-filters-title">Filtros</h2><p>Ajustes aplicados ao PNG final.</p></div>
        {mode !== "none" ? <button className="image-filters__clear" onClick={() => onModeChange("none")} type="button">Limpar</button> : null}
      </div>
      <div className="image-filters__toolbar" role="group" aria-label="Filtros da imagem">
        <Tooltip label="Tom de pele natural">
          <button aria-label="Tom de pele natural" aria-pressed={mode === "skin"} className={mode === "skin" ? "is-active" : undefined} onClick={() => toggleMode("skin")} type="button"><Palette size={19} /></button>
        </Tooltip>
        <Tooltip label="Aumentar vibracao">
          <button aria-label="Aumentar vibracao" aria-pressed={mode === "vibrant"} className={mode === "vibrant" ? "is-active" : undefined} onClick={() => toggleMode("vibrant")} type="button"><Sparkles size={19} /></button>
        </Tooltip>
        <Tooltip label="Ajuste personalizado">
          <button aria-label="Ajuste personalizado" aria-pressed={mode === "custom"} className={mode === "custom" ? "is-active" : undefined} onClick={() => toggleMode("custom")} type="button"><SlidersHorizontal size={19} /></button>
        </Tooltip>
      </div>

      {mode === "custom" ? (
        <div className="image-filters__controls">
          {controls.map((control) => (
            <label className="image-filters__control" key={control.key}>
              <span>{control.label}<output>{settings[control.key]}</output></span>
              <input max={control.max} min={control.min} onChange={(event) => onSettingsChange({ ...settings, [control.key]: Number(event.target.value) })} type="range" value={settings[control.key]} />
            </label>
          ))}
          <button className="image-filters__reset" onClick={() => onSettingsChange(DEFAULT_FILTER_SETTINGS)} type="button">Redefinir ajustes</button>
        </div>
      ) : null}
    </section>
  );
}
