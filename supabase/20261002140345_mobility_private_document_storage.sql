insert into storage.buckets (id, name, public)
values ('mobility-documents','mobility-documents',false)
on conflict (id) do update set public=false;
