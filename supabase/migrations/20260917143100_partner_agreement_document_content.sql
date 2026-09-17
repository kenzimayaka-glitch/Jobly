alter table public."PartnerAgreement" add column if not exists "documentContent" text;
alter table public."Partner" add constraint "Partner_agreementId_fk" foreign key ("agreementId") references public."PartnerAgreement"("id") on delete set null;
