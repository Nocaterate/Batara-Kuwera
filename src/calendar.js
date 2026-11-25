// Calendar export for booked expert sessions: an .ics file (Outlook, Apple Calendar, most phones)
// and a Google Calendar "create event" link. Times are written in UTC, so every calendar app
// shows them in the viewer's own time zone.
import { SESSION_MINUTES } from "./Schedule.jsx";

// 20261126T080000Z
const utcStamp = (ts) => new Date(ts).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// RFC 5545 text: escape backslashes, semicolons, commas and newlines.
const icsText = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// RFC 5545 wants lines of at most 75 octets; longer ones continue on the next line after a space.
const fold = (line) => {
  const out = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 75;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
};

// title/details are already translated by the caller.
function eventParts(booking, t) {
  const title = `${t("{type} with {name}", { type: t(booking.typeLabel), name: booking.expertName })} · Batara Kuwera`;
  const details = t("Batara Kuwera expert session ({min} min). Reference: {ref}.", { min: SESSION_MINUTES, ref: booking.reference });
  return { title, details, start: booking.startsAt, end: booking.startsAt + SESSION_MINUTES * 60000 };
}

export function buildIcs(booking, t) {
  const { title, details, start, end } = eventParts(booking, t);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Batara Kuwera//Expert sessions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.reference}@batarakuwera.web.id`,
    `DTSTAMP:${utcStamp(Date.now())}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${icsText(title)}`,
    `DESCRIPTION:${icsText(details)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(booking, t) {
  const blob = new Blob([buildIcs(booking, t)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `batara-kuwera-session-${booking.reference}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function googleCalendarUrl(booking, t) {
  const { title, details, start, end } = eventParts(booking, t);
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${utcStamp(start)}/${utcStamp(end)}`, details });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
