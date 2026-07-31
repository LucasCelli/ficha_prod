import type { Metadata } from "next";
import { ImageCropper } from "@/components/tools/image-cropper";
import { requireAppSession } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Cortar imagem | Fichas Tecnicas",
};

export default async function CortarImagemPage() {
  await requireAppSession();
  return <ImageCropper />;
}
