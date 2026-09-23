export type ClassValue = string | false | null | undefined;
/** Concatène des classes en ignorant les valeurs falsy. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
