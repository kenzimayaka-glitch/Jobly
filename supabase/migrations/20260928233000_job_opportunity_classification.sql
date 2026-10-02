alter table public."Job"
  add column if not exists "opportunityType" text not null default 'EMPLOI';

alter table public."Job"
  add constraint "Job_opportunityType_check"
  check ("opportunityType" in ('EMPLOI','CONCOURS','FORMATION','RECRUTEMENT_INSUFFISANT'));

create index if not exists "Job_opportunityType_isActive_idx"
  on public."Job" ("opportunityType","isActive");

update public."Job"
set "opportunityType" = case
  when lower(coalesce("title",'') || ' ' || coalesce("description",'')) ~ '(\mconcours\M|\madmission\M|examen d.?entree|test d.?entree|recrutement sur concours|concours de recrutement)'
       and lower(coalesce("title",'')) ~ '(\mconcours\M|\madmission\M|\mexamen\M|test d.?entree|recrutement sur concours)'
    then 'CONCOURS'
  when lower(coalesce("title",'')) ~ '(\mformation\M|certification|masterclass|bootcamp|\mcours\M|bourse .*\mformation\M|programme de \mformation\M|atelier de \mformation\M|webinaire de \mformation\M)'
    then 'FORMATION'
  when lower(coalesce("title",'') || ' ' || coalesce("description",'')) ~ '(\mrecrutement\M|appel a candidature|appel aux candidatures|campagne de recrutement)'
       and lower(coalesce("title",'') || ' ' || coalesce("description",'')) !~ '(\magent\M|\massistant\M|\mcommercial\M|\mmanager\M|\mresponsable\M|\mtechnicien\M|\mchauffeur\M|\mvendeur\M|\mcomptable\M|\mingenieur\M|\mdeveloppeur\M|\mmarketing\M|\mrh\M|charge de|chef de|directeur|consultant|coordinateur|superviseur|stagiaire|stage|intern|offre d emploi|\memploi\M|\mposte\M)'
    then 'RECRUTEMENT_INSUFFISANT'
  else 'EMPLOI'
end
where "opportunityType" = 'EMPLOI';