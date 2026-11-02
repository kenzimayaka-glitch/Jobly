// Read-only by default. Set ALLOW_PROD_WRITE=true only after explicit approval.
const {createClient}=await import("@supabase/supabase-js");
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const aliases={CAMEROUN:"CM",CAMEROON:"CM","COTE D IVOIRE":"CI","COTE D'IVOIRE":"CI",EGYPTE:"EG",EGYPT:"EG",CAIRO:"EG",DOUALA:"CM",YAOUNDE:"CM",BUEA:"CM",MAN:"CI"};
const {data,error}=await db.from("Job").select("id,title,location,description").eq("isActive",true).is("countryCode",null); if(error)throw error;
const rows=(data||[]).map(r=>{const loc=String(r.location||"").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");let code=aliases[loc]||null;const t=(r.title+" "+r.description).toUpperCase();if(!code&&/CAIRO|EGYPT|EGYPTE/.test(t))code="EG";if(!code&&/DOUALA|YAOUNDE|BUEA|CAMEROUN|CAMEROON/.test(t))code="CM";return {...r,inferredCountryCode:code};});
console.table(rows.map(r=>({id:r.id,title:r.title,location:r.location,inferred:r.inferredCountryCode})));
if(process.env.ALLOW_PROD_WRITE!=="true")process.exit(0);
for(const r of rows.filter(x=>x.inferredCountryCode)){const u=await db.from("Job").update({countryCode:r.inferredCountryCode,updatedAt:new Date().toISOString()}).eq("id",r.id);if(u.error)throw u.error;}