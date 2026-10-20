import { ViewTransition } from "react";

/** Re-mounts on every navigation: the old page fades out quickly, the new one rises in. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
