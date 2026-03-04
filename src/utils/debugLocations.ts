import type { Location } from "../types";

// デバッグ用の位置情報プリセット
export const DEBUG_LOCATIONS: Record<string, Omit<Location, "address">> = {
  tokyo_station: {
    lat: 35.6809799,
    lng: 139.7621861,
  },
  kyobashi_station: {
    lat: 35.6764499,
    lng: 139.7685946,
  },
  shibuya_station: {
    lat: 35.6580339,
    lng: 139.6990609,
  },
  osaka_umeda_station: {
    lat: 34.7039445,
    lng: 135.497523,
  },
};

/**
 * 環境変数からデバッグ用の位置情報を取得
 */
export const getDebugLocation = (): Omit<Location, "address"> | null => {
  const debugLocationName = import.meta.env.VITE_DEBUG_LOCATION;

  if (!debugLocationName) {
    return null;
  }

  const location = DEBUG_LOCATIONS[debugLocationName];

  if (!location) {
    console.warn(
      `デバッグ位置 '${debugLocationName}' が見つかりません。利用可能な位置: ${Object.keys(
        DEBUG_LOCATIONS,
      ).join(", ")}`,
    );
    return null;
  }

  console.info(
    `🐛 デバッグモード: ${debugLocationName} (${location.lat}, ${location.lng}) を使用しています`,
  );

  return location;
};
