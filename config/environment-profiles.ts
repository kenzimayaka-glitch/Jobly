export type EnvironmentProfileName = "FREE_TEST" | "PRODUCTION";

export type EnvironmentProfile = {
  name: EnvironmentProfileName;
  commercialUseAllowed: boolean;
  notifications: { email: boolean; push: boolean; sms: boolean; call: boolean };
  video: { provider: "noop" | "livekit"; recording: boolean; monthlyParticipantMinutes: number };
  native: { androidPush: boolean; iosPush: boolean; emergencyAlarm: boolean };
  scheduler: { provider: "supabase" | "external"; reminders: boolean };
  proctoring: { camera: boolean; onDeviceFaceDetection: boolean; uploadsVideo: boolean; offlineQueue: boolean };
};

const freeTest: EnvironmentProfile = {
  name: "FREE_TEST",
  commercialUseAllowed: false,
  notifications: { email: false, push: false, sms: false, call: false },
  video: { provider: "noop", recording: false, monthlyParticipantMinutes: 5000 },
  native: { androidPush: false, iosPush: false, emergencyAlarm: false },
  scheduler: { provider: "supabase", reminders: true },
  proctoring: { camera: true, onDeviceFaceDetection: true, uploadsVideo: false, offlineQueue: true },
};

const production: EnvironmentProfile = {
  name: "PRODUCTION",
  commercialUseAllowed: true,
  notifications: { email: true, push: true, sms: true, call: true },
  video: { provider: "livekit", recording: true, monthlyParticipantMinutes: Number.POSITIVE_INFINITY },
  native: { androidPush: true, iosPush: true, emergencyAlarm: true },
  scheduler: { provider: "external", reminders: true },
  proctoring: { camera: true, onDeviceFaceDetection: true, uploadsVideo: false, offlineQueue: true },
};

export const ENVIRONMENT_PROFILE: EnvironmentProfile =
  process.env.JOBLY_ENVIRONMENT_PROFILE === "PRODUCTION" ? production : freeTest;

export function assertCommercialProfile() {
  if (!ENVIRONMENT_PROFILE.commercialUseAllowed) throw new Error("JOBLY_FREE_TEST_COMMERCIAL_BLOCKED");
}
