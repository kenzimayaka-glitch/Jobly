alter table public."Job"
  add column if not exists "opportunityType" text not null default 'EMPLOI';

alter table public."Job"
  add constraint "Job_opportunityType_check"
  check ("opportunityType" in ('EMPLOI','CONCOURS','FORMATION','RECRUTEMENT_INSUFFISANT'));

create index if not exists "Job_opportunityType_isActive_idx"
  on public."Job" ("opportunityType","isActive");

update public."Job"
set "opportunityType" = case
  when lower(coalesce("title",'') || ' ' || coalesce("description",'')) ~ '\m(concours|admission|examen d.?entree|test d.?entree|entree en|recrutement sur concours|concours de recrutement)\M'
    then 'CONCOURS'
  when lower(coalesce("title",'') || ' ' || coalesce("description",'')) ~ '\m(formation|formez vous|certification|certificat|masterclass|atelier|webinaire|cours|apprentissage|bootcamp|bourse d.?etude|programme de formation)\M'
    then 'FORMATION'
  when lower(coalesce("title",'') || ' ' || coalesce("description",'')) ~ '\m(recrutement|appel a candidature|appel aux candidatures|campagne de recrutement)\M'
       and lower(coalesce("title",'') || ' ' || coalesce("description",'')) !~ '\m(agent|assistant|commercial|manager|responsable|technicien|chauffeur|vendeur|comptable|ingenieur|developpeur|marketing|rh|charge de|chef de|directeur|consultant|coordinateur|superviseur|stagiaire|stage|intern|offre d emploi|emploi|poste)\M'
    then 'RECRUTEMENT_INSUFFISANT'
  else 'EMPLOI'
end
where "opportunityType" = 'EMPLOI';