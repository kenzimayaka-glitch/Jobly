import { ENVIRONMENT_PROFILE } from "@/config/environment-profiles";

export type VideoProviderName = "JITSI" | "LIVEKIT" | "EXTERNAL";

export type VideoRoom = {
  provider: VideoProviderName;
  roomName: string;
  joinUrl: string;
  domain?: string;
};

function configuredProvider(): VideoProviderName {
  const requested = String(process.env.JOBLY_VIDEO_PROVIDER || "").toUpperCase();
  if (requested === "LIVEKIT" && process.env.LIVEKIT_URL) return "LIVEKIT";
  if (requested === "EXTERNAL") return "EXTERNAL";
  return "JITSI";
}

export function createVideoRoom(roomName: string): VideoRoom {
  const provider = configuredProvider();
  if (provider === "JITSI") {
    const domain = process.env.JOBLY_JITSI_DOMAIN || (ENVIRONMENT_PROFILE.name === "FREE_TEST" ? "meet.jit.si" : "");
    if (!domain) throw new Error("JITSI_DOMAIN_REQUIRED");
    return { provider, roomName, domain, joinUrl: "https://" + domain + "/" + encodeURIComponent(roomName) };
  }
  if (provider === "LIVEKIT") {
    if (!process.env.LIVEKIT_URL) throw new Error("LIVEKIT_URL_REQUIRED");
    return { provider, roomName, joinUrl: process.env.LIVEKIT_URL };
  }
  const url = process.env.JOBLY_EXTERNAL_VIDEO_URL;
  if (!url) throw new Error("EXTERNAL_VIDEO_URL_REQUIRED");
  return { provider, roomName, joinUrl: url };
}

export function recordingIsAllowed(provider: VideoProviderName) {
  if (ENVIRONMENT_PROFILE.name === "FREE_TEST") return false;
  return provider === "LIVEKIT" || provider === "JITSI";
}


export function createLiveKitToken(roomName:string,userId:string,canPublish=true){
  const apiKey=process.env.LIVEKIT_API_KEY;
  const secret=process.env.LIVEKIT_API_SECRET;
  if(!apiKey||!secret)throw new Error("LIVEKIT_CREDENTIALS_REQUIRED");
  const crypto=require("node:crypto") as typeof import("node:crypto");
  const now=Math.floor(Date.now()/1000);
  const identity=crypto.createHash("sha256").update(userId+"|"+roomName).digest("hex").slice(0,32);
  const header=Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url");
  const payload=Buffer.from(JSON.stringify({iss:apiKey,sub:identity,nbf:now-10,exp:now+3600,video:{room:roomName,roomJoin:true,canPublish,canSubscribe:true,canPublishData:true}})).toString("base64url");
  const unsigned=header+"."+payload;
  const signature=crypto.createHmac("sha256",secret).update(unsigned).digest("base64url");
  return {token:unsigned+"."+signature,identity};
}
