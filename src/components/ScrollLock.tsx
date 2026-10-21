"use client";
import { useEffect } from "react";

/**
 * Freezes the page while any <dialog> (sheets, viewer) is open, so swiping inside a sheet
 * never scrolls the page behind it. iPhone Safari ignores overflow:hidden on the body,
 * so the page is pinned in place and put back exactly where it was on close.
 */
export default function ScrollLock() {
  useEffect(() => {
    let locked = false;
    let y = 0;
    const body = document.body;

    const lock = () => {
      if (locked) return;
      locked = true;
      y = window.scrollY;
      body.style.position = "fixed";
      body.style.top = `-${y}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      document.documentElement.style.overflow = "hidden";
    };
    const unlock = () => {
      if (!locked) return;
      locked = false;
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      document.documentElement.style.overflow = "";
      window.scrollTo(0, y);
    };
    const sync = () => (document.querySelector("dialog[open]") ? lock() : unlock());

    const obs = new MutationObserver(sync);
    obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    sync();
    return () => {
      obs.disconnect();
      unlock();
    };
  }, []);
  return null;
}
