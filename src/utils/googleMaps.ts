/// <reference types="google.maps" />
import { Loader } from "@googlemaps/js-api-loader";
import type { Location, Restaurant } from "../types";

// Google Maps APIの共通Loaderインスタンス
let googleMapsLoader: Loader | null = null;

const getGoogleMapsLoader = () => {
  if (!googleMapsLoader) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("Google Maps API Keyが設定されていません");
    }

    googleMapsLoader = new Loader({
      apiKey: apiKey,
      version: "weekly",
      libraries: ["places"], // 必要なライブラリをすべて含める
    });
  }
  return googleMapsLoader;
};

export const getGoogleMapsUrl = (restaurant: Restaurant): string => {
  // 緯度経度が利用可能な場合は具体的な位置を使用
  if (restaurant.lat && restaurant.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}&query_place_id=${restaurant.place_id}`;
  }

  // フォールバック: 緯度経度が利用できない場合は名前を使用
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    restaurant.name
  )}&query_place_id=${restaurant.place_id}`;
};

export const searchNearbyRestaurants = async (
  location: Location,
  radius: number,
  minRating: number,
  openOnly: boolean = false // 営業中フィルタのパラメータを追加
): Promise<Restaurant> => {
  return new Promise((resolve, reject) => {
    const loader = getGoogleMapsLoader(); // 共通のLoaderを使用

    loader
      .load()
      .then((google) => {
        const service = new google.maps.places.PlacesService(
          document.createElement("div")
        );

        const request = {
          location: new google.maps.LatLng(location.lat, location.lng),
          radius: radius,
          type: "restaurant",
          fields: [
            "place_id",
            "name",
            "rating",
            "vicinity",
            "geometry", // 位置情報を取得するために追加
            "opening_hours",
            "photos",
          ],
        };

        service.nearbySearch(
          request,
          (
            results: google.maps.places.PlaceResult[] | null,
            status: google.maps.places.PlacesServiceStatus
          ) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              results
            ) {
              let filteredRestaurants = results.filter(
                (place: google.maps.places.PlaceResult) =>
                  place.rating && place.rating >= minRating
              );

              // 営業中フィルタが有効な場合、営業中のレストランのみを抽出
              if (openOnly) {
                filteredRestaurants = filteredRestaurants.filter(
                  (place: google.maps.places.PlaceResult) => {
                    return place.opening_hours?.open_now === true;
                  }
                );
              }

              if (filteredRestaurants.length === 0) {
                const filterMessage = openOnly
                  ? `半径${radius}m以内に評価${minRating}以上かつ営業中のレストランが見つかりませんでした`
                  : `半径${radius}m以内に評価${minRating}以上のレストランが見つかりませんでした`;
                reject(new Error(filterMessage));
                return;
              }

              const randomIndex = Math.floor(
                Math.random() * filteredRestaurants.length
              );
              const selected = filteredRestaurants[randomIndex];

              resolve({
                place_id: selected.place_id!,
                name: selected.name!,
                rating: selected.rating,
                vicinity: selected.vicinity!,
                lat: selected.geometry?.location?.lat(), // 緯度を追加
                lng: selected.geometry?.location?.lng(), // 経度を追加
                opening_hours: selected.opening_hours,
                photos: selected.photos,
              });
            } else {
              reject(new Error("レストランの検索に失敗しました"));
            }
          }
        );
      })
      .catch((error) => {
        reject(
          new Error("Google Maps APIの読み込みに失敗しました: " + error.message)
        );
      });
  });
};

export const getAddressFromCoordinates = async (
  location: Location
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const loader = getGoogleMapsLoader(); // 共通のLoaderを使用

    loader
      .load()
      .then((google) => {
        const geocoder = new google.maps.Geocoder();

        geocoder.geocode(
          {
            location: { lat: location.lat, lng: location.lng },
            language: "ja", // 日本語で住所を取得
            region: "JP", // 日本地域を指定
          },
          (results, status) => {
            console.log("Geocoding status:", status);
            console.log("Geocoding results:", results);

            if (status === "OK" && results && results[0]) {
              const result = results[0];

              // formatted_addressをそのまま使用（日本語住所）
              let address = result.formatted_address;

              // 日本の住所から不要な部分を除去
              if (address) {
                address = address
                  .replace(/〒\d{3}-\d{4}\s*/, "") // 郵便番号を除去
                  .replace(/^日本、/, "") // 先頭の"日本、"を除去
                  .replace(/Japan,?\s*/, "") // "Japan"を除去
                  .trim();
              }

              console.log("Formatted address:", address);
              resolve(address || "住所の取得に失敗しました");
            } else {
              console.error("Geocoding failed:", status);
              reject(new Error(`住所の取得に失敗しました: ${status}`));
            }
          }
        );
      })
      .catch((error) => {
        console.error("Google Maps API load error:", error);
        reject(
          new Error("Google Maps APIの読み込みに失敗しました: " + error.message)
        );
      });
  });
};

// 2点間の距離を計算する関数（ハヴァーサイン公式）
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // 地球の半径（km）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // 距離（km）
  return distance;
};

// 距離を適切な単位で表示する関数
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  } else {
    return `${distanceKm.toFixed(1)}km`;
  }
};
