import "./vitrine.css";
import JoblyVitrine from "../../components/JoblyVitrine";

export const metadata = {
  title: "Jobly — Les opportunités n'ont pas de frontières",
  description: "L'écosystème panafricain qui rapproche les talents, les recruteurs et les opportunités professionnelles.",
};

export default function JoblyVitrinePage() {
  return <JoblyVitrine />;
}
