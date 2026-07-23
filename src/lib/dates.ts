export const BUSINESS_TIME_ZONE = "America/Cuiaba";

type DateParts = {
  day: string;
  month: string;
  year: string;
};

export function getBusinessTodayInput(date = new Date()) {
  return formatBusinessDateInput(date);
}

export function formatBusinessDashboardDate(date = new Date()) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "long",
  }).format(date);

  return formatted.charAt(0).toLocaleUpperCase("pt-BR") + formatted.slice(1);
}

export function formatBusinessDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(date);
}

export function formatDateInput(
  value: string,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  },
) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    ...options,
  }).format(createUtcDateFromInput(value));
}

export function formatCompactDateInput(value: string, options?: Intl.DateTimeFormatOptions) {
  return formatDateInput(value, options).replace(/ de /g, " ");
}

export function formatShortDateInput(value: string) {
  return formatDateInput(value, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function formatDayMonthInput(value: string) {
  return formatDateInput(value, {
    day: "2-digit",
    month: "2-digit",
  });
}

export function getBusinessWeekRange(offsetWeeks = 0, date = new Date()) {
  const today = getBusinessTodayInput(date);
  const weekStart = addDaysToInput(startOfWeekInput(today), offsetWeeks * 7);

  return {
    end: addDaysToInput(weekStart, 6),
    start: weekStart,
  };
}

export function addDaysToInput(value: string, amount: number) {
  const date = createUtcDateFromInput(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatUtcDateInput(date);
}

export function createUtcDateFromInput(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatUtcDateInput(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateInputToLocalDate(value?: null | string) {
  if (!value) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day);
}

export function formatLocalDateInput(date?: Date) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateInputDifferenceInDays(target: string, base = getBusinessTodayInput()) {
  const targetTime = createUtcDateFromInput(target).getTime();
  const baseTime = createUtcDateFromInput(base).getTime();

  if (!Number.isFinite(targetTime) || !Number.isFinite(baseTime)) {
    return null;
  }

  return Math.ceil((targetTime - baseTime) / 86_400_000);
}

export function isDateInputWithinRange(value: string, range: { end: string; start: string }) {
  return value >= range.start && value <= range.end;
}

function formatBusinessDateInput(date: Date) {
  const { day, month, year } = getBusinessDateParts(date);
  return `${year}-${month}-${day}`;
}

export function getBusinessHour(date: Date) {
  const hour = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    hourCycle: "h23",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(date);

  return Number.parseInt(hour, 10) % 24;
}

function getBusinessDateParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);

  return {
    day: parts.find((part) => part.type === "day")?.value ?? "01",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    year: parts.find((part) => part.type === "year")?.value ?? "1970",
  };
}

function startOfWeekInput(value: string) {
  const date = createUtcDateFromInput(value);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDaysToInput(value, mondayOffset);
}
