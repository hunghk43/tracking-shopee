"use client";

import { useEffect } from "react";

export function useFaviconBadge(count: number) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Vẽ emoji base
    ctx.font = "26px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("📦", 16, 17);

    if (count > 0) {
      const label = count > 99 ? "99+" : String(count);
      const badgeX = 24;
      const badgeY = 8;
      const radius = label.length > 1 ? 10 : 8;

      // Viền trắng để dễ nhìn trên mọi nền
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, radius + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();

      // Badge đỏ
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();

      // Số
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${label.length > 1 ? "8" : "11"}px -apple-system, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, badgeX, badgeY + 0.5);
    }

    // Cập nhật favicon
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = canvas.toDataURL("image/png");
    const capturedLink = link;

    // Cleanup: khôi phục favicon gốc khi unmount
    return () => {
      capturedLink.href = "/favicon.ico";
    };
  }, [count]);
}
