import React from "react";

// Lets an amount like Rp160.000.000 break after a thousands dot instead of overflowing or splitting mid-group.
export default function SoftWrap({ children }) {
  return String(children).split(".").map((part, i, all) => (
    <React.Fragment key={i}>
      {part}
      {i < all.length - 1 && <>.<wbr /></>}
    </React.Fragment>
  ));
}
