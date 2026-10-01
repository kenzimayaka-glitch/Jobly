export type NativePlatform = "android" | "ios" | "web";

type CapacitorLike = {
 isNativePlatform?:()=>boolean;
 getPlatform?:()=>string;
 Plugins?:Record<string,any>;
};

function cap():CapacitorLike|null {
 if(typeof window==="undefined")return null;
 return (window as any).Capacitor||null;
}

export function getNativePlatform():NativePlatform{
 const c=cap();if(!c?.isNativePlatform?.())return "web";
 return c.getPlatform?.()==="ios"?"ios":"android";
}

export async function requestNativeNotifications(){
 const plugins=cap()?.Plugins;
 try{
  if(plugins?.PushNotifications?.requestPermissions)await plugins.PushNotifications.requestPermissions();
  if(plugins?.LocalNotifications?.requestPermissions)await plugins.LocalNotifications.requestPermissions();
 }catch{}
}

export async function triggerCriticalInterviewAlert(payload:{title:string;body:string;interviewId:string}){
 const plugins=cap()?.Plugins;
 if(!plugins)return {native:false};
 try{
  if(plugins.LocalNotifications?.schedule){
   await plugins.LocalNotifications.schedule({notifications:[{id:Date.now()%2147483647,title:payload.title,body:payload.body,extra:{interviewId:payload.interviewId},schedule:{at:new Date()}}]});
   return {native:true,channel:"local-notification"};
  }
  window.dispatchEvent(new CustomEvent("jobly:critical-interview-alert",{detail:payload}));
  return {native:true,channel:"bridge-event"};
 }catch{
  window.dispatchEvent(new CustomEvent("jobly:critical-interview-alert",{detail:payload}));
  return {native:true,channel:"bridge-event"};
 }
}

export function openNativeCallAlert(payload:{interviewId:string;displayName:string}){
 const plugins=cap()?.Plugins;
 if(plugins?.JoblyCallAlert?.showIncoming)void plugins.JoblyCallAlert.showIncoming(payload);
 else window.dispatchEvent(new CustomEvent("jobly:native-incoming-call",{detail:payload}));
}
