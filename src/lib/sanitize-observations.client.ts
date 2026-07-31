const ALLOWED_OBSERVATION_TAGS = new Set(["BR", "EM", "LI", "OL", "P", "STRONG", "U", "UL"]);
const BLOCKED_OBSERVATION_TAGS = new Set(["IFRAME", "MATH", "OBJECT", "SCRIPT", "STYLE", "SVG", "TEMPLATE"]);

export function sanitizeObservationHtmlInBrowser(value: string) {
  const documentFragment = document.createElement("template");
  documentFragment.innerHTML = value;
  sanitizeChildren(documentFragment.content);
  return documentFragment.innerHTML.trim();
}

function sanitizeChildren(parent: DocumentFragment | Element) {
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove();
      continue;
    }

    if (!(node instanceof Element)) {
      continue;
    }

    if (BLOCKED_OBSERVATION_TAGS.has(node.tagName)) {
      node.remove();
      continue;
    }

    sanitizeChildren(node);

    if (!ALLOWED_OBSERVATION_TAGS.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes));
      continue;
    }

    for (const attribute of Array.from(node.attributes)) {
      node.removeAttribute(attribute.name);
    }
  }
}
