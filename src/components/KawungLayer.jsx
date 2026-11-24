// A faint kawung batik layer (see .bk-kawung in index.css) that fades out towards one side.
// Put it first inside a parent with `relative isolate`; it stays behind the parent's content.
// The mask is opaque on the `from` side and fades out across the layer.
const FADE_TO = { left: "to right", right: "to left", top: "to bottom", bottom: "to top" };

export default function KawungLayer({ from = "right", className = "", opacity = 0.25 }) {
  const mask = `linear-gradient(${FADE_TO[from]}, black, transparent)`;
  return (
    <div
      aria-hidden="true"
      className={`bk-kawung pointer-events-none absolute -z-10 ${className}`}
      style={{ opacity, maskImage: mask, WebkitMaskImage: mask }}
    />
  );
}
