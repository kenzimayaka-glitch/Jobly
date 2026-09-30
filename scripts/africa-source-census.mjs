import fs from "node:fs/promises";

const BASE = "https://www.jobrank.org/";
const SEEDS = [
  BASE + "Africa/",
  "https://" + "jobsitedir.com/region/africa",
  "https://" + "jantegze.com/job-search-sites/africa/",
  "https://" + "africarrieres.com/",
  "https://" + "jobaa.org/countries",
];

const countries = [
  ["DZ","dz"],["EG","eg"],["LY","ly"],["MA","ma"],["MR","mr"],["TN","tn"],
  ["BJ","bj"],["BF","bf"],["CV","cv"],["CI","ci"],["GM","gm"],["GH","gh"],["GN","gn"],["GW","gw"],["LR","lr"],["ML","ml"],["NE","ne"],["NG","ng"],["SN","sn"],["SL","sl"],["TG","tg"],
  ["CM","cm"],["CF","cf"],["TD","td"],["CG","cg"],["CD","cd"],["GQ","gq"],["GA","ga"],["ST","st"],["BI","bi"],["AO","ao"],
  ["KE","ke"],["UG","ug"],["TZ","tz"],["RW","rw"],["ET","et"],["DJ","dj"],["ER","er"],["SO","so"],["SS","ss"],["SD","sd"],["KM","km"],["MG","mg"],["MU","mu"],["SC","sc"],
  ["ZA","za"],["ZM","zm"],["ZW","zw"],["MW","mw"],["MZ","mz"],["NA","na"],["BW","bw"],["SZ","sz"],["LS","ls"]
];

function links(html, base) {
  const out = [];
  const re = /<a\\b[^>]*href=["']([^"'#]+)["'][^>]*>([\\s\\S]*?)<\\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const url = new URL(m[1], base);
      if (!/^https?:$/.test(url.protocol)) continue;
      out.push({url:url.toString(), text:m[2].replace(/<[^>]+>/g," ").replace(/\\s+/g," ").trim()});
    } catch {}
  }
  return out;
}

async function get(url) {
  const response = await fetch(url, {headers: {"user-agent":"JoblyAfricaSourceCensus/1.0"}, signal: AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error(url + " HTTP " + response.status);
  return response.text();
}

const report = {
  generatedAt: new Date().toISOString(),
  countries: Object.fromEntries(countries.map(([code]) => [code, {jobRank: null, candidates: []}])),
  seeds: []
};

for (const [code, slug] of countries) {
  const url = BASE + slug + "/";
  try {
    const html = await get(url);
    const found = links(html, url)
      .filter(x => x.url.startsWith(BASE) === false)
      .filter(x => !/facebook|twitter|linkedin|jobrank\\.org/i.test(x.url))
      .map(x => x.url.split("/").slice(0,3).join("/"))
      .filter(Boolean);
    report.countries[code].jobRank = {url, candidateDomains:[...new Set(found)]};
  } catch (error) {
    report.countries[code].jobRank = {url, error:String(error)};
  }
}

for (const url of SEEDS) {
  try {
    const html = await get(url);
    const found = links(html, url)
      .filter(x => !/facebook|twitter|linkedin/i.test(x.url))
      .map(x => x.url.split("/").slice(0,3).join("/"))
      .filter(Boolean);
    report.seeds.push({url, candidateDomains:[...new Set(found)]});
  } catch (error) {
    report.seeds.push({url, error:String(error)});
  }
}

await fs.mkdir("artifacts", {recursive:true});
await fs.writeFile("artifacts/africa-source-census.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  generatedAt: report.generatedAt,
  countries: countries.length,
  successfulCountryPages: Object.values(report.countries).filter(x => x.jobRank && !x.jobRank.error).length,
  seedPages: report.seeds.length
}, null, 2));
