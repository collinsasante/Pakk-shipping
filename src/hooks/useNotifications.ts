"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import type { SupportTicket, Item } from "@/types";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  href: string;
}

export function playNotificationSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
    setTimeout(() => ctx.close(), 1000);
  } catch {}
}

const ITEM_STATUS_KEY = "pakk_item_statuses";

function getStoredItemStatuses(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ITEM_STATUS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function storeItemStatuses(statuses: Record<string, string>) {
  try {
    localStorage.setItem(ITEM_STATUS_KEY, JSON.stringify(statuses));
  } catch {}
}

export function useNotifications(role: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const initialized = useRef(false);
  const seenIds = useRef<Set<string>>(new Set());

  // Reset when role becomes known
  useEffect(() => {
    if (!role) return;
    initialized.current = false;
    seenIds.current = new Set();
  }, [role]);

  const poll = useCallback(async () => {
    if (!role) return;

    const newNotifs: AppNotification[] = [];

    // ── Support messages ──────────────────────────────────────────
    try {
      const res = await axios.get("/api/support");
      const tickets: SupportTicket[] = res.data.data;

      for (const ticket of tickets) {
        for (const msg of ticket.messages) {
          const relevant =
            role === "customer"
              ? msg.sender === "admin"
              : msg.sender === "customer";
          if (!relevant) continue;

          if (!seenIds.current.has(msg.id)) {
            seenIds.current.add(msg.id);

            if (initialized.current) {
              newNotifs.push({
                id: msg.id,
                title:
                  role === "customer"
                    ? "Support reply received"
                    : `New message — ${ticket.subject}`,
                body:
                  msg.content.length > 70
                    ? msg.content.slice(0, 70) + "…"
                    : msg.content,
                time: msg.timestamp,
                href:
                  role === "customer"
                    ? "/customer/support"
                    : "/admin/support",
              });
            }
          }
        }
      }
    } catch {}

    // ── Item status changes (customers only) ──────────────────────
    if (role === "customer") {
      try {
        const res = await axios.get("/api/items");
        const items: Item[] = res.data.data;
        const prev = getStoredItemStatuses();
        const next: Record<string, string> = {};

        for (const item of items) {
          next[item.id] = item.status;
          if (
            initialized.current &&
            prev[item.id] &&
            prev[item.id] !== item.status
          ) {
            const nid = `status_${item.id}_${item.status}`;
            if (!seenIds.current.has(nid)) {
              seenIds.current.add(nid);
              newNotifs.push({
                id: nid,
                title: "Package status updated",
                body: `${item.itemRef}: ${item.status}`,
                time: new Date().toISOString(),
                href: "/customer/items",
              });
            }
          }
        }
        storeItemStatuses(next);
      } catch {}
    }

    initialized.current = true;

    if (newNotifs.length > 0) {
      setNotifications((prev) =>
        [...newNotifs.reverse(), ...prev].slice(0, 25)
      );
      setUnread((prev) => prev + newNotifs.length);
    }
  }, [role]);

  useEffect(() => {
    if (!role) return;
    // Delay first poll by 30s and run every 3 minutes — the sidebar already
    // handles the support badge count every 60s, so this just detects new messages
    const delay = setTimeout(() => {
      poll();
    }, 30000);
    const interval = setInterval(poll, 180000);
    return () => {
      clearTimeout(delay);
      clearInterval(interval);
    };
  }, [poll, role]);

  const markAllRead = useCallback(() => {
    setUnread(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnread(0);
  }, []);

  return { notifications, unread, markAllRead, clearAll };
}
