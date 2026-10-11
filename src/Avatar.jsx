import React, { useState } from "react";
import { cn } from "./ui.js";

// Shows a photo when one is given and loads successfully; falls back to colored initials
// otherwise (missing photo, broken path, offline). Used for every expert avatar in the app.
export default function Avatar({ name, photo, size = 44, className, T }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").map((n) => n[0]).join("");
  const style = { width: size, height: size };

  if (photo && !failed) {
    return (
      <img
        src={photo}
        alt={name}
        width={size}
        height={size}
        style={style}
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div
      style={style}
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-red-600/15 font-display text-sm font-semibold", T.accent, className)}
    >
      {initials}
    </div>
  );
}
