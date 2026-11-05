export const EVENT_MANUAL_PAYMENT_METHODS = [
  "MTN_MOMO",
  "ORANGE_MONEY",
  "BANK_TRANSFER",
  "OTHER",
] as const;

export type EventManualPaymentMethod = typeof EVENT_MANUAL_PAYMENT_METHODS[number];

export function getEventManualPaymentInstructions(): string {
  const configured = String(process.env.JOBLY_MANUAL_PAYMENT_INSTRUCTIONS ?? "").trim();
  return configured || "Contactez Jobly depuis ses canaux officiels pour recevoir les coordonnées de paiement. N'envoyez aucun transfert vers un numéro reçu par message privé. Après transfert, joignez le reçu et la référence de transaction ; la publication ne sera activée qu'après validation par l'équipe Finance.";
}
