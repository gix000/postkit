"use client";
import dynamic from "next/dynamic";

/** Remembers the business name on this device, so it renders in the browser only. */
const CaptionWriter = dynamic(() => import("@/components/CaptionWriter"), { ssr: false, loading: () => <div className="skel h-[60vh] rounded-[28px]" /> });
export default CaptionWriter;
