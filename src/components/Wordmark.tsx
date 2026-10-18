// PostKit wordmark: the name followed by a playhead — a vertical bar with a
// small flag, the mark every editor recognises from the Premiere timeline.
export function Wordmark() {
  return (
    <span className="wordmark" dir="ltr">
      <span className="wordmark__text">PostKit</span>
      <svg className="wordmark__head" viewBox="0 0 10 22" aria-hidden="true" focusable="false">
        <path d="M0 0h10v5l-5 4-5-4z" fill="currentColor" />
        <rect x="4.25" y="8" width="1.5" height="14" fill="currentColor" />
      </svg>
    </span>
  );
}
