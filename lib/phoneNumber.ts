const AFRICA_CALLING_CODES: Record<string,string> = {
  DZ:"213", AO:"244", BJ:"229", BW:"267", BF:"226", BI:"257", CM:"237", CV:"238",
  CF:"236", TD:"235", KM:"269", CG:"242", CD:"243", CI:"225", DJ:"253", EG:"20",
  GQ:"240", ER:"291", SZ:"268", ET:"251", GA:"241", GM:"220", GH:"233", GN:"224",
  GW:"245", KE:"254", LS:"266", LR:"231", LY:"218", MG:"261", MW:"265", ML:"223",
  MR:"222", MU:"230", MA:"212", MZ:"258", NA:"264", NE:"227", NG:"234", RW:"250",
  ST:"239", SN:"221", SC:"248", SL:"232", SO:"252", ZA:"27", SS:"211", SD:"249",
  TZ:"255", TG:"228", TN:"216", UG:"256", ZM:"260", ZW:"263"
};

export function normalizePhoneNumber(value: unknown, countryCode?: string | null): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, "");
  if (raw.startsWith("00")) digits = digits.slice(2);
  if (!digits) return null;

  // An international number is accepted only when the user supplied an international prefix
  // or when its leading digits match a known African calling code.
  if (raw.startsWith("+") || raw.startsWith("00")) {
    return digits.length >= 8 && digits.length <= 15 ? digits : null;
  }

  const code = AFRICA_CALLING_CODES[String(countryCode || "").toUpperCase()];
  if (code) {
    if (digits.startsWith(code) && digits.length >= 8 && digits.length <= 15) return digits;
    const national = digits.replace(/^0+/, "");
    if (national.length >= 7 && national.length <= 10) {
      const combined = code + national;
      return combined.length >= 8 && combined.length <= 15 ? combined : null;
    }
  }

  // Do not guess a country for a local number.
  return null;
}
