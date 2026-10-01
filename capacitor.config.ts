type CapacitorConfig={
 appId:string;
 appName:string;
 webDir:string;
 server?:{cleartext?:boolean};
 plugins?:Record<string,unknown>;
};

const config:CapacitorConfig={
 appId:"com.jobly.app",
 appName:"Jobly",
 webDir:".next",
 server:{cleartext:false},
 plugins:{
  PushNotifications:{presentationOptions:["badge","sound","alert"]},
  LocalNotifications:{smallIcon:"ic_stat_jobly",sound:"default"}
 }
};
export default config;
