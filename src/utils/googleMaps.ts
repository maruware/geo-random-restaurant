/// <reference types="google.maps" />
import { Loader } from "@googlemaps/js-api-loader";
import type { Location, Restaurant } from "../types";

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
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      reject(
        new Error(
          "Google Maps API Keyが設定されていません。環境変数VITE_GOOGLE_MAPS_API_KEYを設定してください。"
        )
      );
      return;
    }

    const loader = new Loader({
      apiKey: apiKey,
      version: "weekly",
      libraries: ["places"],
    });

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
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      reject(new Error("Google Maps API Keyが設定されていません"));
      return;
    }

    const loader = new Loader({
      apiKey: apiKey,
      version: "weekly",
      libraries: ["geocoding"],
    });

    loader
      .load()
      .then((google) => {
        const geocoder = new google.maps.Geocoder();

        geocoder.geocode(
          {
            location: { lat: location.lat, lng: location.lng },
          },
          (results, status) => {
            if (status === "OK" && results && results[0]) {
              // 詳細な住所から適切な部分を抽出
              const result = results[0];
              const addressComponents = result.address_components;

              // 日本の住所形式に合わせて組み立て
              const prefecture =
                addressComponents.find((comp) =>
                  comp.types.includes("administrative_area_level_1")
                )?.long_name || "";

              const city =
                addressComponents.find(
                  (comp) =>
                    comp.types.includes("locality") ||
                    comp.types.includes("administrative_area_level_2")
                )?.long_name || "";

              const ward =
                addressComponents.find((comp) =>
                  comp.types.includes("sublocality_level_1")
                )?.long_name || "";

              const district =
                addressComponents.find(
                  (comp) =>
                    comp.types.includes("sublocality_level_2") ||
                    comp.types.includes("sublocality_level_3")
                )?.long_name || "";

              // 住所を組み立て（都道府県+市区町村+町丁目）
              let address = "";
              if (prefecture) address += prefecture;
              if (city) address += city;
              if (ward) address += ward;
              if (district) address += district;

              // より詳細な住所が取得できない場合は、formatted_addressから抽出
              if (!address && result.formatted_address) {
                // 日本の住所から郵便番号を除去して、町丁目レベルまでを取得
                const formattedAddress = result.formatted_address
                  .replace(/〒\d{3}-\d{4}\s*/, "") // 郵便番号を除去
                  .replace(/日本、/, "") // "日本、"を除去
                  .trim();
                address = formattedAddress;
              }

              resolve(address || "住所の取得に失敗しました");
            } else {
              reject(new Error("住所の取得に失敗しました"));
            }
          }
        );
      })
      .catch((error) => {
        reject(
          new Error("Geocoding APIの読み込みに失敗しました: " + error.message)
        );
      });
  });
};
