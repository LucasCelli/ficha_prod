import type { Metadata } from "next";
import { ImageCropper } from "@/components/tools/image-cropper";

export const metadata: Metadata = {
  title: "Cortar imagem | Fichas Tecnicas",
};

export default function CortarImagemPage() {
  return <ImageCropper />;
}
