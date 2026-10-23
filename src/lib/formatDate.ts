export function formatDate(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
) {
  let date: Date;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(value);
  }

  return new Intl.DateTimeFormat("en-GB", options).format(date);
}
