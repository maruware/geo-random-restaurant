import { useState, useCallback } from "react";
import type { Location } from "../types";
import { getAddressFromCoordinates } from "../utils/googleMaps";
import { getDebugLocation } from "../utils/debugLocations";

export const useGeolocation = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(() => {
    setIsLoading(true);
    setError(null);

    // デバッグモード: 環境変数で位置が指定されている場合
    const debugLocation = getDebugLocation();
    if (debugLocation) {
      // デバッグ位置を使用
      getAddressFromCoordinates(debugLocation)
        .then((address) => {
          setLocation({
            ...debugLocation,
            address,
          } as Location);
        })
        .catch((addressError) => {
          console.error("住所の取得に失敗しました:", addressError);
          setLocation(debugLocation as Location);
        })
        .finally(() => {
          setIsLoading(false);
        });
      return;
    }

    // 通常モード: 実際の位置情報を取得
    if (!navigator.geolocation) {
      setError("この端末では位置情報がサポートされていません");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        try {
          // 住所を取得
          const address = await getAddressFromCoordinates(coordinates);
          setLocation({
            ...coordinates,
            address,
          } as Location);
        } catch (addressError) {
          // 住所取得に失敗しても、緯度経度は設定
          console.error("住所の取得に失敗しました:", addressError);
          setLocation(coordinates as Location);
        }

        setIsLoading(false);
      },
      (error) => {
        setError("位置情報の取得に失敗しました: " + error.message);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  return {
    location,
    isLoading,
    error,
    getCurrentLocation,
  };
};
