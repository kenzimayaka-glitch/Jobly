import { redirect } from "next/navigation";
type Props={searchParams:Promise<{ref?:string}>};
export default async function JoinPage({searchParams}:Props){const {ref}=await searchParams;redirect(ref?`/?ref=${encodeURIComponent(ref)}`:"/");}
