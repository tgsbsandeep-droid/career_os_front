/** Approximate USD cross rates for display-only conversion. */
const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  INR: 84,
  AED: 3.67,
  SAR: 3.75,
  SGD: 1.34,
  AUD: 1.52,
  CAD: 1.36,
  NZD: 1.64,
  JPY: 149,
  CNY: 7.2,
  HKD: 7.8,
  KRW: 1380,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.6,
  DKK: 6.9,
  PLN: 3.9,
  BRL: 5.6,
  MXN: 18.5,
  ZAR: 18.2,
  NGN: 1600,
  KES: 129,
  PHP: 58,
  MYR: 4.4,
  THB: 34,
  IDR: 15800,
  PKR: 278,
  BDT: 120,
  LKR: 300,
  NPR: 134,
  QAR: 3.64,
  KWD: 0.31,
  OMR: 0.38,
  BHD: 0.38,
  TRY: 34,
  RUB: 92,
  ILS: 3.7,
  EGP: 49,
  ARS: 900,
  CZK: 23,
  HUF: 360,
  RON: 4.6,
  BGN: 1.8,
  UAH: 41,
  TWD: 32,
};

const REGION_CURRENCY: Record<string, string> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  AE: "AED",
  SA: "SAR",
  SG: "SGD",
  AU: "AUD",
  CA: "CAD",
  NZ: "NZD",
  JP: "JPY",
  CN: "CNY",
  HK: "HKD",
  KR: "KRW",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  BR: "BRL",
  MX: "MXN",
  ZA: "ZAR",
  NG: "NGN",
  KE: "KES",
  PH: "PHP",
  MY: "MYR",
  TH: "THB",
  ID: "IDR",
  PK: "PKR",
  BD: "BDT",
  LK: "LKR",
  NP: "NPR",
  QA: "QAR",
  KW: "KWD",
  OM: "OMR",
  BH: "BHD",
  TR: "TRY",
  RU: "RUB",
  IL: "ILS",
  EG: "EGP",
  AR: "ARS",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  UA: "UAH",
  TW: "TWD",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  IE: "EUR",
  PT: "EUR",
  AT: "EUR",
  BE: "EUR",
  FI: "EUR",
  GR: "EUR",
  LU: "EUR",
  SK: "EUR",
  SI: "EUR",
  EE: "EUR",
  LV: "EUR",
  LT: "EUR",
  CY: "EUR",
  MT: "EUR",
  HR: "EUR",
};

/** IANA timezone → ISO country. Location beats browser language for local currency. */
const TIMEZONE_REGION: Record<string, string> = {
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "America/Adak": "US",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "America/Halifax": "CA",
  "America/Mexico_City": "MX",
  "America/Sao_Paulo": "BR",
  "America/Argentina/Buenos_Aires": "AR",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Vienna": "AT",
  "Europe/Zurich": "CH",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI",
  "Europe/Lisbon": "PT",
  "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ",
  "Europe/Budapest": "HU",
  "Europe/Athens": "GR",
  "Europe/Bucharest": "RO",
  "Europe/Sofia": "BG",
  "Europe/Istanbul": "TR",
  "Europe/Moscow": "RU",
  "Europe/Kyiv": "UA",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Qatar": "QA",
  "Asia/Kuwait": "KW",
  "Asia/Bahrain": "BH",
  "Asia/Muscat": "OM",
  "Asia/Singapore": "SG",
  "Asia/Hong_Kong": "HK",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Taipei": "TW",
  "Asia/Bangkok": "TH",
  "Asia/Jakarta": "ID",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Manila": "PH",
  "Asia/Karachi": "PK",
  "Asia/Dhaka": "BD",
  "Asia/Colombo": "LK",
  "Asia/Kathmandu": "NP",
  "Asia/Jerusalem": "IL",
  "Africa/Cairo": "EG",
  "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE",
  "Africa/Johannesburg": "ZA",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Pacific/Auckland": "NZ",
};

const CURRENCY_HINTS: Array<{ pattern: RegExp; currency: string }> = [
  { pattern: /₹|inr\b|rs\.?|rupees?\b|lpa\b|lakhs?\b|lacs?\b/i, currency: "INR" },
  { pattern: /\$|usd\b|us\s*\$/i, currency: "USD" },
  { pattern: /€|eur\b/i, currency: "EUR" },
  { pattern: /£|gbp\b/i, currency: "GBP" },
  { pattern: /\baed\b|dhs\b|dirham/i, currency: "AED" },
  { pattern: /\bsgd\b|s\$/i, currency: "SGD" },
  { pattern: /\baud\b|a\$/i, currency: "AUD" },
  { pattern: /\bcad\b|c\$/i, currency: "CAD" },
  { pattern: /¥|jpy\b|yen\b/i, currency: "JPY" },
];

type PayPeriod = "year" | "month" | "hour";

type ParsedSalary = {
  min: number;
  max: number;
  currency: string;
  period: PayPeriod;
  lpa: boolean;
};

function asText(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function getTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

function regionFromLocaleTag(tag: string) {
  try {
    return new Intl.Locale(tag).maximize().region || "";
  } catch {
    return "";
  }
}

/** Prefer the viewer's timezone (where they are), then language region. */
export function getUserRegion() {
  const timeZone = getTimeZone();
  if (timeZone && TIMEZONE_REGION[timeZone]) return TIMEZONE_REGION[timeZone];
  if (/Kolkata|Calcutta/i.test(timeZone)) return "IN";
  const languageTag = typeof navigator === "undefined"
    ? "en-IN"
    : (navigator.languages?.[0] || navigator.language || "en-IN");
  return regionFromLocaleTag(languageTag) || "IN";
}

/** Number-format locale: browser language + location region. */
export function getUserLocale() {
  const languageTag = typeof navigator === "undefined"
    ? "en-IN"
    : (navigator.languages?.[0] || navigator.language || "en-IN");
  const region = getUserRegion();
  try {
    const lang = new Intl.Locale(languageTag).language || "en";
    return `${lang}-${region}`;
  } catch {
    return languageTag;
  }
}

export function getUserCurrency(locale = getUserLocale()) {
  try {
    const region = new Intl.Locale(locale).maximize().region;
    if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region];
  } catch {
    /* keep fallback */
  }
  return REGION_CURRENCY[getUserRegion()] ?? "INR";
}

function detectCurrency(text: string) {
  for (const hint of CURRENCY_HINTS) {
    if (hint.pattern.test(text)) return hint.currency;
  }
  return "INR";
}

function detectPeriod(text: string): PayPeriod {
  if (/\b(hour|hourly|\/\s*hr|per\s*hour)\b/i.test(text)) return "hour";
  if (/\b(month|monthly|\/\s*mo|per\s*month|stipend|pmc)\b/i.test(text)) return "month";
  return "year";
}

function parseAmountToken(rawNumber: string, suffix: string, lpa: boolean) {
  const amount = Number(rawNumber.replace(/,/g, ""));
  if (!Number.isFinite(amount)) return null;
  const tag = suffix.toLowerCase();
  if (tag === "cr" || tag === "crore" || tag === "crores") return amount * 10_000_000;
  if (tag === "l" || tag === "lakh" || tag === "lakhs" || tag === "lac" || tag === "lacs") return amount * 100_000;
  if (tag === "k") return amount * 1_000;
  if (tag === "m") return amount * 1_000_000;
  if (lpa) return amount * 100_000;
  return amount;
}

function parseSalaryRange(raw: string): ParsedSalary | null {
  const text = raw.trim();
  if (!text) return null;
  const lpa = /\b(lpa|lakhs?\s*per\s*annum|per\s*annum)\b/i.test(text);
  const currency = detectCurrency(text);
  const period = detectPeriod(text);
  const tokens = [...text.matchAll(/(\d+(?:[.,]\d+)*)\s*(k|m|cr|crores?|lakhs?|lacs?|l(?=\b))?/gi)];
  const amounts = tokens
    .map((match) => parseAmountToken(match[1], match[2] ?? "", lpa))
    .filter((value): value is number => value != null && value > 0);
  if (!amounts.length) return null;

  let min = amounts[0];
  let max = amounts.length > 1 ? amounts[1] : amounts[0];
  if (max < min) [min, max] = [max, min];

  if (!lpa && currency === "INR" && period === "year" && max <= 100 && !/[kml]/i.test(text)) {
    min *= 100_000;
    max *= 100_000;
  }

  return { min, max, currency, period, lpa: lpa || (currency === "INR" && period === "year" && max >= 100_000) };
}

function convertAmount(amount: number, from: string, to: string) {
  if (from === to) return amount;
  const fromRate = USD_RATES[from] ?? 1;
  const toRate = USD_RATES[to] ?? 1;
  return (amount / fromRate) * toRate;
}

function roundLpa(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function periodSuffix(period: PayPeriod, asLpa: boolean) {
  if (asLpa) return "";
  if (period === "month") return "/mo";
  if (period === "hour") return "/hr";
  return "/yr";
}

function formatMoney(amount: number, currency: string, locale: string) {
  const abs = Math.abs(amount);
  const compact = abs >= 100_000;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : abs >= 100 ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString(locale)}`;
  }
}

/** Convert a stored salary string into the viewer's local currency. */
export function formatSalaryRange(raw: unknown, locale = getUserLocale()) {
  const text = asText(raw).trim();
  if (!text) return "";
  const parsed = parseSalaryRange(text);
  if (!parsed) return text;

  const target = getUserCurrency(locale);
  if (target === "INR" && parsed.currency === "INR" && parsed.period === "year" && parsed.lpa) {
    const minLpa = roundLpa(parsed.min / 100_000);
    const maxLpa = roundLpa(parsed.max / 100_000);
    return minLpa === maxLpa ? `₹${minLpa} LPA` : `₹${minLpa}–${maxLpa} LPA`;
  }

  const min = convertAmount(parsed.min, parsed.currency, target);
  const max = convertAmount(parsed.max, parsed.currency, target);
  const suffix = periodSuffix(parsed.period, false);
  const minFmt = formatMoney(min, target, locale);
  const maxFmt = formatMoney(max, target, locale);
  return minFmt === maxFmt ? `${minFmt}${suffix}` : `${minFmt}–${maxFmt}${suffix}`;
}

export function salaryFilterLabel(value: string, locale = getUserLocale()) {
  if (value === "all") return "Any salary";
  if (getUserCurrency(locale) === "INR") {
    if (value === "0-5") return "Up to ₹5 LPA";
    if (value === "5-10") return "₹5–10 LPA";
    if (value === "10-20") return "₹10–20 LPA";
    if (value === "20+") return "₹20 LPA+";
  }
  const yearly = (amount: string) => formatSalaryRange(amount, locale).replace(/\/yr$/, "");
  if (value === "0-5") return `Up to ${yearly("5 LPA")}`;
  if (value === "5-10") return `${yearly("5 LPA")} – ${yearly("10 LPA")}`;
  if (value === "10-20") return `${yearly("10 LPA")} – ${yearly("20 LPA")}`;
  if (value === "20+") return `${yearly("20 LPA")}+`;
  return "Any salary";
}
