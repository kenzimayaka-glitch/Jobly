export const MOBILITY_ELIGIBILITY_VERSION = "mobility-eligibility-v3";
export const DEFAULT_MOBILITY_THRESHOLD_PERCENT = 35;
export const DEFAULT_REPAYMENT_MONTHS = 3;
export const DEFAULT_MIN_USER_TENURE_MONTHS = 3;

export type MobilityEligibilityStatus = "ELIGIBLE" | "INELIGIBLE" | "NEEDS_INFO";
export type MobilityCostItem = {
  category: "TRANSPORT" | "HOUSING" | "INSTALLATION" | "LOCAL_TRANSPORT" | "COST_OF_LIVING" | "OTHER";
  amount: number; currency: string;
  source?: "SYSTEM_ESTIMATE" | "TALENT_DECLARED" | "PARTNER_QUOTE" | "VERIFIED";
  confidence?: number;
};
export type MobilityEligibilityInput = {
  approvedSalary?: number | null; salaryCurrency?: string | null; costs: MobilityCostItem[];
  companyMobilityAgreementAccepted: boolean; recruiterGuaranteeAccepted: boolean;
  repaymentMonths?: number; thresholdPercent?: number;
  userCreatedAt?: string | null; activePaidPlan?: boolean; requiredUserTenureMonths?: number;
};
export type MobilityEligibilityDecision = {
  version: string; status: MobilityEligibilityStatus; approvedSalary: number | null; salaryCurrency: string;
  totalMobilityCost: number; thresholdPercent: number; maximumEligibleCost: number | null; burdenPercent: number | null;
  companyMobilityAgreementAccepted: boolean; recruiterGuaranteeAccepted: boolean; repaymentMonths: number;
  repaymentMonthlyAmount: number | null; userTenureMonths: number | null; minimumUserTenureMonths: number;
  activePaidPlan: boolean; reason: string; missingInformation: string[]; calculatedAt: string;
};
const round=(v:number)=>Math.round(v*100)/100;
export function calculateMobilityEligibility(input: MobilityEligibilityInput): MobilityEligibilityDecision {
  const now=new Date().toISOString(), threshold=input.thresholdPercent??DEFAULT_MOBILITY_THRESHOLD_PERCENT;
  const minimumTenure=input.requiredUserTenureMonths??DEFAULT_MIN_USER_TENURE_MONTHS;
  const createdAt=input.userCreatedAt?new Date(input.userCreatedAt):null;
  const userTenureMonths=createdAt&&!Number.isNaN(createdAt.getTime())?round((Date.now()-createdAt.getTime())/(1000*60*60*24*30.4375)):null;
  const activePaidPlan=input.activePaidPlan===true, salary=input.approvedSalary??null, currency=input.salaryCurrency||"XAF";
  const repaymentMonths=input.repaymentMonths??DEFAULT_REPAYMENT_MONTHS;
  const costs=input.costs.filter(i=>Number.isFinite(i.amount)&&i.amount>=0), total=round(costs.reduce((s,i)=>s+i.amount,0));
  const missingInformation:string[]=[];
  if(!salary||salary<=0)missingInformation.push("APPROVED_SALARY");
  if(userTenureMonths===null)missingInformation.push("USER_CREATED_AT");
  if(!activePaidPlan)missingInformation.push("ACTIVE_PAID_PLAN");
  if(userTenureMonths!==null&&userTenureMonths<minimumTenure)missingInformation.push("USER_TENURE_3_MONTHS");
  if(costs.length===0)missingInformation.push("MOBILITY_COSTS");
  if(!input.companyMobilityAgreementAccepted)missingInformation.push("COMPANY_MOBILITY_AGREEMENT");
  if(!input.recruiterGuaranteeAccepted)missingInformation.push("RECRUITER_GUARANTEE");
  const base={version:MOBILITY_ELIGIBILITY_VERSION,approvedSalary:salary,salaryCurrency:currency,totalMobilityCost:total,thresholdPercent:threshold,maximumEligibleCost:salary&&salary>0?round(salary*threshold/100):null,burdenPercent:salary&&salary>0?round(total/salary*100):null,companyMobilityAgreementAccepted:input.companyMobilityAgreementAccepted,recruiterGuaranteeAccepted:input.recruiterGuaranteeAccepted,repaymentMonths,repaymentMonthlyAmount:total>0?round(total/repaymentMonths):null,userTenureMonths,minimumUserTenureMonths:minimumTenure,activePaidPlan,calculatedAt:now};
  if(missingInformation.length>0){
    const tenureFail=userTenureMonths!==null&&userTenureMonths<minimumTenure;
    const planFail=!activePaidPlan;
    return {...base,status:tenureFail||planFail?"INELIGIBLE":"NEEDS_INFO",reason:planFail?"Le Talent ne dispose pas d'un pack payant actif.":tenureFail?"Le Talent utilise Jobly depuis moins de 3 mois.":"Le calcul ne peut pas être finalisé tant que les conditions obligatoires ne sont pas disponibles.",missingInformation};
  }
  const max=round((salary as number)*threshold/100), burden=round(total/(salary as number)*100), eligible=burden<=threshold;
  return {...base,status:eligible?"ELIGIBLE":"INELIGIBLE",maximumEligibleCost:max,burdenPercent:burden,reason:eligible?`Toutes les conditions sont remplies et le coût Mobility représente ${burden}% du salaire approuvé, sous le seuil de ${threshold}%.`:`Les conditions sont remplies mais le coût Mobility représente ${burden}% du salaire approuvé, au-dessus du seuil de ${threshold}%.`,missingInformation:[]};
}