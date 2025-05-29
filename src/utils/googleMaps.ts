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
  return `https://maps.google.com/?q=${encodeURIComponent(
    restaurant.name
  )}&place_id=${restaurant.place_id}`;
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
            "opening_hours", // opening_hoursに戻す
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
                    // opening_hoursのopen_nowを使用（元に戻す）
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
                opening_hours: selected.opening_hours, // opening_hoursに戻す
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
