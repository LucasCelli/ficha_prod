import sanitizeHtml from "sanitize-html";

const OBSERVATION_TAGS = ["p", "br", "strong", "em", "u", "ul", "ol", "li"] as const;

export function sanitizeObservationHtml(value: string) {
  return sanitizeHtml(value, {
    allowedAttributes: {},
    allowedSchemes: [],
    allowedTags: [...OBSERVATION_TAGS],
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
  }).trim();
}
