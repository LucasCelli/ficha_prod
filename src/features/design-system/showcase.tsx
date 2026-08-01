"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import styles from "./design-system.module.css";

/** Bloco de exemplo: preview ao vivo + snippet + regras de uso. */
export function Specimen({
  children,
  code,
  dont,
  name,
  responsive,
  usage,
}: {
  children: ReactNode;
  code: string;
  dont?: string;
  name: string;
  responsive?: string;
  usage?: string;
}) {
  const [showCode, setShowCode] = useState(false);
  const codeId = useId();

  return (
    <article className={styles.specimen}>
      <header className={styles.specimenHeader}>
        <h4>{name}</h4>
        <button
          aria-controls={codeId}
          aria-expanded={showCode}
          className="ui-button ui-button--ghost"
          onClick={() => setShowCode((current) => !current)}
          type="button"
        >
          {showCode ? "Ocultar código" : "Ver código"}
        </button>
      </header>
      <div className={styles.preview}>{children}</div>
      {showCode ? (
        <pre className={styles.code} id={codeId}>
          <code>{code}</code>
        </pre>
      ) : null}
      {usage || dont || responsive ? (
        <dl className={styles.rules}>
          {usage ? (
            <>
              <dt>Quando usar</dt>
              <dd>{usage}</dd>
            </>
          ) : null}
          {dont ? (
            <>
              <dt>Quando não usar</dt>
              <dd>{dont}</dd>
            </>
          ) : null}
          {responsive ? (
            <>
              <dt>Responsivo</dt>
              <dd>{responsive}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </article>
  );
}

/** Amostra de cor que resolve o valor real do tema ativo. */
export function ColorSwatch({ token }: { token: string }) {
  const value = useResolvedToken(token);

  return (
    <li className={styles.swatch}>
      <span className={styles.swatchChip} style={{ background: `var(${token})` }} />
      <code>{token}</code>
      <small>{value || "—"}</small>
    </li>
  );
}

export function TokenRow({ preview, token }: { preview?: "space" | "radius" | "shadow" | "size"; token: string }) {
  const value = useResolvedToken(token);

  return (
    <li className={styles.tokenRow}>
      <code>{token}</code>
      <small>{value || "—"}</small>
      {preview === "space" ? <span className={styles.spaceBar} style={{ width: `var(${token})` }} /> : null}
      {preview === "radius" ? <span className={styles.radiusBox} style={{ borderRadius: `var(${token})` }} /> : null}
      {preview === "shadow" ? <span className={styles.shadowBox} style={{ boxShadow: `var(${token})` }} /> : null}
      {preview === "size" ? (
        <span className={styles.sizeBox} style={{ height: `var(${token})`, width: `var(${token})` }} />
      ) : null}
    </li>
  );
}

/**
 * Le o valor computado do token. Roda so no cliente para nao gerar
 * divergencia de hidratacao entre tema claro e escuro.
 */
function useResolvedToken(token: string) {
  const [value, setValue] = useState("");

  useEffect(() => {
    function read() {
      setValue(getComputedStyle(document.documentElement).getPropertyValue(token).trim());
    }

    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [token]);

  return value;
}
