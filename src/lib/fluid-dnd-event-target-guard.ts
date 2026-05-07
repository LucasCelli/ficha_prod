"use client";

import { useEffect } from "react";

const NORMALIZED_FLUID_DND_EVENT = "__fichaProdFluidDndNormalized";

type NormalizedMouseEvent = MouseEvent & {
  [NORMALIZED_FLUID_DND_EVENT]?: boolean;
};

function getFallbackMouseTarget(event: MouseEvent) {
  const target = event.target;

  if (target instanceof Element) {
    return null;
  }

  if (target instanceof Node && target.parentElement) {
    return target.parentElement;
  }

  return document.elementFromPoint(event.clientX, event.clientY) ?? document.body;
}

function cloneMouseEvent(event: MouseEvent) {
  const clonedEvent = new MouseEvent(event.type, {
    bubbles: true,
    altKey: event.altKey,
    button: event.button,
    buttons: event.buttons,
    cancelable: event.cancelable,
    clientX: event.clientX,
    clientY: event.clientY,
    ctrlKey: event.ctrlKey,
    detail: event.detail,
    metaKey: event.metaKey,
    movementX: event.movementX,
    movementY: event.movementY,
    relatedTarget: event.relatedTarget,
    screenX: event.screenX,
    screenY: event.screenY,
    shiftKey: event.shiftKey,
    view: event.view,
  }) as NormalizedMouseEvent;

  Object.defineProperty(clonedEvent, NORMALIZED_FLUID_DND_EVENT, {
    value: true,
  });

  return clonedEvent;
}

function normalizeMouseTargetForFluidDnd(event: MouseEvent) {
  const normalizedEvent = event as NormalizedMouseEvent;

  if (normalizedEvent[NORMALIZED_FLUID_DND_EVENT]) {
    return;
  }

  const fallbackTarget = getFallbackMouseTarget(event);

  if (!fallbackTarget) {
    return;
  }

  event.stopImmediatePropagation();
  fallbackTarget.dispatchEvent(cloneMouseEvent(event));
}

export function useFluidDndEventTargetGuard() {
  useEffect(() => {
    const eventOptions = { capture: true };
    const eventNames = ["mousedown", "mousemove", "mouseup"] as const;

    for (const eventName of eventNames) {
      document.addEventListener(eventName, normalizeMouseTargetForFluidDnd, eventOptions);
    }

    return () => {
      for (const eventName of eventNames) {
        document.removeEventListener(eventName, normalizeMouseTargetForFluidDnd, eventOptions);
      }
    };
  }, []);
}
