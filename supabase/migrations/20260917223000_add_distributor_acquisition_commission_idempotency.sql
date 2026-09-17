create unique index if not exists "Commission_partner_referred_acquisition_key"
on public."Commission" ("partnerId", "referredUserId")
where "sourceType" = 'ACQUISITION' and "referredUserId" is not null;
