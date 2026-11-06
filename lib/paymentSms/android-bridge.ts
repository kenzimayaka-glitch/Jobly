export type PaymentSmsDevicePairing = {
  deviceId: string;
  deviceToken: string;
  senderIds: string[];
};

declare global {
  interface Window {
    joblyAndroid?: {
      postMessage: (message: string) => void;
    };
    __joblyAndroidPaymentSmsAutoReceive?: boolean;
  }
}

/** True only in the existing trusted Jobly Android WebView. */
export function isJoblyAndroidPaymentSmsAvailable(): boolean {
  return typeof window !== "undefined" &&
    typeof window.joblyAndroid?.postMessage === "function";
}

/** True only for the internal merchant APK; the Play Store build never reads the inbox. */
export function isJoblyAndroidPaymentSmsAutoReceiveAvailable(): boolean {
  return isJoblyAndroidPaymentSmsAvailable() &&
    window.__joblyAndroidPaymentSmsAutoReceive === true;
}

/** Pair the current Android installation; credentials are sealed by Android Keystore. */
export function pairJoblyPaymentSmsDevice(credentials: PaymentSmsDevicePairing): boolean {
  if (!isJoblyAndroidPaymentSmsAvailable()) return false;
  if (!/^[0-9a-f-]{20,64}$/i.test(credentials.deviceId) || credentials.deviceToken.length < 32) return false;
  try {
    window.joblyAndroid!.postMessage(JSON.stringify({
      type: "PAIR_PAYMENT_SMS_DEVICE",
      payload: {
        deviceId: credentials.deviceId,
        deviceToken: credentials.deviceToken,
        senderIds: credentials.senderIds.slice(0, 10),
      },
    }));
    return true;
  } catch {
    return false;
  }
}

/** Clear the locally stored merchant device credentials on the current APK. */
export function revokeJoblyPaymentSmsDeviceLocally(deviceId: string): boolean {
  if (!isJoblyAndroidPaymentSmsAvailable() || !deviceId) return false;
  try {
    window.joblyAndroid!.postMessage(JSON.stringify({
      type: "REVOKE_PAYMENT_SMS_DEVICE",
      payload: { deviceId },
    }));
    return true;
  } catch {
    return false;
  }
}

/** Ask Android to retry the RECEIVE_SMS runtime permission request. */
export function requestJoblyPaymentSmsPermission(): boolean {
  if (!isJoblyAndroidPaymentSmsAutoReceiveAvailable()) return false;
  try {
    window.joblyAndroid!.postMessage(JSON.stringify({ type: "REQUEST_PAYMENT_SMS_PERMISSION", payload: {} }));
    return true;
  } catch {
    return false;
  }
}
