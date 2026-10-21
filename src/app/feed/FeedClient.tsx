"use client";
import dynamic from "next/dynamic";

/** The feed preview reads this device's saved arrangement, so it renders in the browser only. */
const FeedPreview = dynamic(() => import("./FeedPreview"), {
  ssr: false,
  loading: () => <div className="skel mx-auto w-full max-w-[430px] h-[640px] rounded-[40px]" />,
});

export default FeedPreview;
