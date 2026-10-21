"use client";
import dynamic from "next/dynamic";

/** Reads the saved menu draft from this device, so it renders in the browser only. */
const MenuMaker = dynamic(() => import("./MenuMaker"), {
  ssr: false,
  loading: () => <div className="skel h-[70vh] rounded-[28px]" />,
});
export default MenuMaker;
