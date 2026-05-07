"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type RouteToastTone = "error" | "info" | "success" | "warning";

export type RouteToastMessage = {
  description?: string;
  title: string;
  tone: RouteToastTone;
};

type RouteToastProps = {
  messages: Record<string, RouteToastMessage>;
  paramName: string;
};

export function RouteToast({ messages, paramName }: RouteToastProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastHandledRef = useRef<string | null>(null);
  const value = searchParams.get(paramName);

  useEffect(() => {
    if (!value || lastHandledRef.current === value) return;

    const message = messages[value];
    if (!message) return;

    toast[message.tone](message.title, {
      description: message.description,
      id: `${paramName}-${value}`,
    });
    lastHandledRef.current = value;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete(paramName);
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [messages, paramName, pathname, router, searchParams, value]);

  return null;
}
