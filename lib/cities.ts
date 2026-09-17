export const CAMEROON_CITIES = {
  YAOUNDE: { name: "Yaoundé", lat: 3.848, lng: 11.502 },
  DOUALA: { name: "Douala", lat: 4.05, lng: 9.7 },
  BAFOUSSAM: { name: "Bafoussam", lat: 5.477, lng: 10.417 },
  BAMENDA: { name: "Bamenda", lat: 5.963, lng: 10.159 },
  GAROUA: { name: "Garoua", lat: 9.3, lng: 13.4 },
  MAROUA: { name: "Maroua", lat: 10.592, lng: 14.324 },
  BUEA: { name: "Buea", lat: 4.155, lng: 9.231 },
  BERTOUA: { name: "Bertoua", lat: 4.575, lng: 13.684 },
  EBOLOWA: { name: "Ebolowa", lat: 2.9, lng: 11.15 },
  NGAOUNDERE: { name: "Ngaoundéré", lat: 7.321, lng: 13.583 },
} as const;

export type CameroonCityKey = keyof typeof CAMEROON_CITIES;
