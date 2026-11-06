export type PublicationDateSource = "SOURCE" | "FIRST_HARVEST" | "JOB_CREATED_AT" | null;
export type PublicationFreshnessInput = { sourcePublishedAt:string|null; firstHarvestAt:string|null; createdAt:string|null; deadline:string|null; now?:string };
export type PublicationFreshnessResult = {
  effectivePublishedAt:string|null; publicationDateEstimated:boolean; publicationDateSource:PublicationDateSource;
  expiresAt:string|null; expiredByFreshness:boolean; expiredByDeadline:boolean; publishedInFuture:boolean; rejectionCode:string|null; visible:boolean;
};
const DAY_MS=24*60*60*1000;
const REAL_PUBLICATION_MAX_AGE_MONTHS=2;
const ESTIMATED_PUBLICATION_MAX_AGE_MS=30*DAY_MS;

function addUtcCalendarMonths(value:Date, months:number):Date {
  const monthIndex=value.getUTCMonth()+months;
  const year=value.getUTCFullYear()+Math.floor(monthIndex/12);
  const month=((monthIndex%12)+12)%12;
  const lastDay=new Date(Date.UTC(year,month+1,0)).getUTCDate();
  const day=Math.min(value.getUTCDate(),lastDay);
  return new Date(Date.UTC(
    year,month,day,
    value.getUTCHours(),value.getUTCMinutes(),value.getUTCSeconds(),value.getUTCMilliseconds(),
  ));
}
function validIso(value:string|null|undefined):string|null {
  if(!value)return null;
  const parsed=new Date(value);
  return Number.isFinite(parsed.getTime())?parsed.toISOString():null;
}

/**
 * Normalize a source deadline without an explicit time to the end of that
 * calendar day. Some feeds serialize a date-only deadline as midnight UTC;
 * interpreting it literally expires the offer at the start of the advertised
 * day. Explicit non-midnight times are preserved.
 */
export function normalizeDeadlineTimestamp(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
  const utcMidnight = raw.match(/^(\d{4}-\d{2}-\d{2})T00:00(?::00(?:\.0{1,3})?)?(?:Z|\+00:00)?$/i);
  const datePart = dateOnly?.[1] ?? utcMidnight?.[1];
  if (datePart) {
    const midnight = new Date(datePart + "T00:00:00.000Z");
    if (!Number.isFinite(midnight.getTime()) || midnight.toISOString().slice(0, 10) !== datePart) return null;
    return datePart + "T23:59:59.999Z";
  }

  const parsed = new Date(raw);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}
/** Priority: source date, first harvest, Job.createdAt. Source dates expire after 2 calendar months; estimates after 30 days. */
export function resolveEffectivePublicationDate(input:PublicationFreshnessInput):PublicationFreshnessResult {
  const now=new Date(input.now||new Date().toISOString());
  const nowMs=now.getTime();
  const sourceDate=validIso(input.sourcePublishedAt);
  const firstHarvestDate=sourceDate?null:validIso(input.firstHarvestAt);
  const createdDate=sourceDate||firstHarvestDate?null:validIso(input.createdAt);
  const effectivePublishedAt=sourceDate||firstHarvestDate||createdDate;
  const publicationDateEstimated=!sourceDate&&Boolean(effectivePublishedAt);
  const publicationDateSource:PublicationDateSource=sourceDate?"SOURCE":firstHarvestDate?"FIRST_HARVEST":createdDate?"JOB_CREATED_AT":null;
  const effectiveMs=effectivePublishedAt?new Date(effectivePublishedAt).getTime():NaN;
  const expiresAtDate=Number.isFinite(effectiveMs)
    ?sourceDate
      ?addUtcCalendarMonths(new Date(effectiveMs),REAL_PUBLICATION_MAX_AGE_MONTHS)
      :new Date(effectiveMs+ESTIMATED_PUBLICATION_MAX_AGE_MS)
    :null;
  const expiresAtMs=expiresAtDate?.getTime()??NaN;
  const publishedInFuture=Number.isFinite(effectiveMs)&&effectiveMs>nowMs;
  // Keep the exact expiry instant visible; it expires immediately after that instant.
  const expiredByFreshness=!Number.isFinite(effectiveMs)||(!publishedInFuture&&Number.isFinite(expiresAtMs)&&nowMs>expiresAtMs);
  const normalizedDeadline=normalizeDeadlineTimestamp(input.deadline);
  const deadlineMs=normalizedDeadline?new Date(normalizedDeadline).getTime():NaN;
  const expiredByDeadline=Number.isFinite(deadlineMs)&&deadlineMs<nowMs;
  let rejectionCode:string|null=null;
  if(!effectivePublishedAt)rejectionCode="MISSING_PUBLICATION_AND_FALLBACK_DATE";
  else if(expiredByDeadline)rejectionCode="DEADLINE_PASSED";
  else if(publishedInFuture)rejectionCode="PUBLICATION_DATE_IN_FUTURE";
  else if(expiredByFreshness)rejectionCode=sourceDate?"SOURCE_PUBLICATION_OVER_2_MONTHS":"ESTIMATED_PUBLICATION_OVER_30_DAYS";
  const expiresAt=expiresAtDate?.toISOString()??null;
  return {effectivePublishedAt,publicationDateEstimated,publicationDateSource,expiresAt,expiredByFreshness,expiredByDeadline,publishedInFuture,rejectionCode,
    visible:Boolean(effectivePublishedAt)&&!publishedInFuture&&!expiredByFreshness&&!expiredByDeadline};
}
