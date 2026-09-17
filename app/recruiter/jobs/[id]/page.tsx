"use client";
import { useParams } from "next/navigation";
import { RecruiterJobForm } from "../../../../components/recruiter/RecruiterJobForm";

export default function RecruiterJobEditRoute() {
  const params = useParams<{ id: string }>();
  return <RecruiterJobForm jobId={params.id} />;
}
