export type ImportedJob = {
  title: string;
  description: string;
  location: string;
  mode: string;
  contract: string;
  salary: string;
  sector: string;
  tags: string[];
  sourceUrl: string;
};

export async function scrapeJobFromUrl(url: string): Promise<ImportedJob> {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, "");
  const sourceName = host.split(".")[0] || "Source";
  const title = `Opportunité importée depuis ${sourceName}`;
  const description = `Offre importée depuis ${url}. Les informations principales ont été préparées pour être vérifiées avant publication sur Jobly.`;
  const contract = /indeed|linkedin/i.test(host) ? "CDI" : "CDI";
  return {
    title,
    description,
    location: "",
    mode: "Hybride",
    contract,
    salary: "",
    sector: "",
    tags: [sourceName, "import"],
    sourceUrl: url,
  };
}
