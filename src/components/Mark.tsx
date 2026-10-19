/** PostKit mark: a stack of three offset slabs — models, data, runs. */
export default function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="3" width="14" height="5" rx="1.2" fill="currentColor" />
      <rect x="5" y="10" width="14" height="5" rx="1.2" fill="var(--cobalt)" />
      <rect x="8" y="17" width="14" height="5" rx="1.2" fill="currentColor" opacity="0.45" />
    </svg>
  );
}
