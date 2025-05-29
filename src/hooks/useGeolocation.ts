import { useState, useCallback } from "react";
import type { Location } from "../types";
import { getAddressFromCoordinates } from "../utils/googleMaps";

export const useGeolocation = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(() => {
    setIsLoading(true);
    setError(null);

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
          setLocation(coordinates as Location);
          console.warn("住所の取得に失敗しました:", addressError);
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
