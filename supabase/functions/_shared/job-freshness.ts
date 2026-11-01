export type PublicationDateSource = "SOURCE" | "FIRST_HARVEST" | "JOB_CREATED_AT" | null;
export type PublicationFreshnessInput = { sourcePublishedAt:string|null; firstHarvestAt:string|null; createdAt:string|null; deadline:string|null; now?:string };
export type PublicationFreshnessResult = {
  effectivePublishedAt:string|null; publicationDateEstimated:boolean; publicationDateSource:PublicationDateSource;
  expiresAt:string|null; expiredByFreshness:boolean; expiredByDeadline:boolean; rejectionCode:string|null; visible:boolean;
};
const DAY_MS=24*60*60*1000;
const REAL_PUBLICATION_MAX_AGE_MS=62*DAY_MS;
const ESTIMATED_PUBLICATION_MAX_AGE_MS=30*DAY_MS;
function validIso(value:string|null|undefined):string|null {
  if(!value)return null;
  const parsed=new Date(value);
  return Number.isFinite(parsed.getTime())?parsed.toISOString():null;
}
/** Priority: source date, first harvest, Job.createdAt. Real dates: 62d; estimated: 30d. */
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
  const maxAgeMs=sourceDate?REAL_PUBLICATION_MAX_AGE_MS:ESTIMATED_PUBLICATION_MAX_AGE_MS;
  const expiredByFreshness=!Number.isFinite(effectiveMs)||effectiveMs<nowMs-maxAgeMs;
  const deadlineMs=input.deadline?new Date(input.deadline).getTime():NaN;
  const expiredByDeadline=Number.isFinite(deadlineMs)&&deadlineMs<nowMs;
  const expiresAt=Number.isFinite(effectiveMs)?new Date(effectiveMs+maxAgeMs).toISOString():null;
  let rejectionCode:string|null=null;
  if(!effectivePublishedAt)rejectionCode="MISSING_PUBLICATION_AND_FALLBACK_DATE";
  else if(expiredByDeadline)rejectionCode="DEADLINE_PASSED";
  else if(expiredByFreshness)rejectionCode=sourceDate?"SOURCE_PUBLICATION_OVER_62_DAYS":"ESTIMATED_PUBLICATION_OVER_30_DAYS";
  return {effectivePublishedAt,publicationDateEstimated,publicationDateSource,expiresAt,expiredByFreshness,expiredByDeadline,rejectionCode,
    visible:Boolean(effectivePublishedAt)&&!expiredByFreshness&&!expiredByDeadline};
}
