import type { Metadata } from "next";
import { UniformListParserDemo } from "@/components/ai/uniform-list-parser-demo";
import { getDefaultAiModelOption } from "@/lib/ai/model-options";
import { getAiProvider } from "@/lib/ai/providers";

export const metadata: Metadata = {
  title: "Organizar nomes com IA | Fichas Tecnicas",
};

export default function OrganizarNomesIaPage() {
  return <UniformListParserDemo defaultModelValue={getDefaultAiModelOption(getAiProvider()).value} />;
}
