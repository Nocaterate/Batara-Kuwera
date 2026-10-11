import React from "react";

// Lets an amount like Rp160,000,000 (or Rp160.000.000) break only after a thousands separator,
// never in the middle of a digit group. Decimals ("43,3") aren't thousands groups, so they stay whole.
export default function SoftWrap({ children }) {
  const text = String(children);
  const parts = [];
  const groupBreak = /[.,](?=\d{3}(?!\d))/g;
  let last = 0;
  let m;
  while ((m = groupBreak.exec(text)) !== null) {
    parts.push(text.slice(last, m.index + 1), <wbr key={m.index} />);
    last = m.index + 1;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}
