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
      // importLibrary使用時はlibrariesプロパティは不要
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

// コールバックベースのAPIをPromise化するヘルパー関数（PlacesService用）
const promisifyPlacesCallback = <T>(
  callback: (
    resolve: (value: T) => void,
    reject: (error: Error) => void
  ) => void
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    callback(resolve, reject);
  });
};

export const searchNearbyRestaurants = async (
  location: Location,
  radius: number,
  minRating: number,
  openOnly: boolean = false // 営業中フィルタのパラメータを追加
): Promise<Restaurant> => {
  const loader = getGoogleMapsLoader();
  const [{ PlacesService }, { LatLng }] = await Promise.all([
    loader.importLibrary("places"),
    loader.importLibrary("core"),
  ]);

  const service = new PlacesService(document.createElement("div"));

  const request = {
    location: new LatLng(location.lat, location.lng),
    radius: radius,
    type: "restaurant",
    openNow: openOnly, // API側で営業中フィルタを適用
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

  return promisifyPlacesCallback<Restaurant>((resolve, reject) => {
    service.nearbySearch(
      request,
      (
        results: google.maps.places.PlaceResult[] | null,
        status: google.maps.places.PlacesServiceStatus
      ) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          // 評価フィルタのみをJavaScript側で適用
          const filteredRestaurants = results.filter(
            (place: google.maps.places.PlaceResult) =>
              place.rating && place.rating >= minRating
          );

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
  });
};

export const getAddressFromCoordinates = async (
  location: Location
): Promise<string> => {
  const loader = getGoogleMapsLoader();
  const { Geocoder } = await loader.importLibrary("geocoding");

  const geocoder = new Geocoder();

  try {
    const response = await geocoder.geocode({
      location: { lat: location.lat, lng: location.lng },
      language: "ja",
      region: "JP",
    });

    console.log("Geocoding response:", response);

    if (response.results && response.results[0]) {
      const result = response.results[0];
      let address = result.formatted_address;

      if (address) {
        address = address
          .replace(/〒\d{3}-\d{4}\s*/, "")
          .replace(/^日本、/, "")
          .replace(/Japan,?\s*/, "")
          .trim();
      }

      console.log("Formatted address:", address);
      return address || "住所の取得に失敗しました";
    } else {
      throw new Error(`住所の取得に失敗しました`);
    }
  } catch (error) {
    console.error("Geocoding error:", error);
    throw new Error(`住所の取得に失敗しました: ${error}`);
  }
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

// 徒歩経路の距離と時間を計算する関数
export const calculateWalkingDistance = async (
  origin: Location,
  destination: { lat: number; lng: number }
): Promise<{ distance: string; duration: string }> => {
  const loader = getGoogleMapsLoader();
  const [{ DirectionsService, TravelMode }, { UnitSystem }] = await Promise.all(
    [loader.importLibrary("routes"), loader.importLibrary("core")]
  );

  const directionsService = new DirectionsService();

  try {
    const response = await directionsService.route({
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      travelMode: TravelMode.WALKING,
      unitSystem: UnitSystem.METRIC,
      language: "ja",
      region: "JP",
    });

    if (response.routes && response.routes[0]) {
      const route = response.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance?.text || "不明",
        duration: leg.duration?.text || "不明",
      };
    } else {
      // レスポンスが無効な場合はフォールバック
      throw new Error("経路が見つかりません");
    }
  } catch (error) {
    // 徒歩経路が見つからない場合は直線距離にフォールバック
    console.warn("徒歩経路の計算に失敗、直線距離で概算:", error);
    const directDistance = calculateDistance(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng
    );
    const formattedDistance = formatDistance(directDistance);
    const estimatedDuration = Math.round((directDistance * 1000) / 80); // 時速4.8km (80m/分) で概算

    return {
      distance: `約${formattedDistance}`,
      duration: `約${estimatedDuration}分`,
    };
  }
};

// 確率調整機能付きのレストラン検索
export const searchNearbyRestaurantsWithProbability = async (
  location: Location,
  radius: number,
  minRating: number,
  openOnly: boolean = false,
  restaurantHistory: Map<string, number> = new Map()
): Promise<Restaurant> => {
  const loader = getGoogleMapsLoader();
  const [{ PlacesService }, { LatLng }] = await Promise.all([
    loader.importLibrary("places"),
    loader.importLibrary("core"),
  ]);

  const service = new PlacesService(document.createElement("div"));

  const request = {
    location: new LatLng(location.lat, location.lng),
    radius: radius,
    type: "restaurant",
    openNow: openOnly, // API側で営業中フィルタを適用
    fields: [
      "place_id",
      "name",
      "rating",
      "vicinity",
      "geometry",
      "opening_hours",
      "photos",
    ],
  };

  return promisifyPlacesCallback<Restaurant>((resolve, reject) => {
    service.nearbySearch(
      request,
      (
        results: google.maps.places.PlaceResult[] | null,
        status: google.maps.places.PlacesServiceStatus
      ) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          // 評価フィルタのみをJavaScript側で適用
          const filteredRestaurants = results.filter(
            (place: google.maps.places.PlaceResult) =>
              place.rating && place.rating >= minRating
          );

          if (filteredRestaurants.length === 0) {
            const filterMessage = openOnly
              ? `半径${radius}m以内に評価${minRating}以上かつ営業中のレストランが見つかりませんでした`
              : `半径${radius}m以内に評価${minRating}以上のレストランが見つかりませんでした`;
            reject(new Error(filterMessage));
            return;
          }

          // 確率調整を適用してレストランを選択
          const selected = selectRestaurantWithProbability(
            filteredRestaurants,
            restaurantHistory
          );

          resolve({
            place_id: selected.place_id!,
            name: selected.name!,
            rating: selected.rating,
            vicinity: selected.vicinity!,
            lat: selected.geometry?.location?.lat(),
            lng: selected.geometry?.location?.lng(),
            opening_hours: selected.opening_hours,
            photos: selected.photos,
          });
        } else {
          reject(new Error("レストランの検索に失敗しました"));
        }
      }
    );
  });
};

// 履歴に基づいて確率調整したレストラン選択
const selectRestaurantWithProbability = (
  restaurants: google.maps.places.PlaceResult[],
  history: Map<string, number>
): google.maps.places.PlaceResult => {
  // 各レストランの重みを計算
  const weights = restaurants.map((restaurant) => {
    const placeId = restaurant.place_id!;
    const selectionCount = history.get(placeId) || 0;
    // 選択回数に応じて重みを計算（25%ずつ減少）
    const weight = Math.pow(0.25, selectionCount);
    return { restaurant, weight };
  });

  // 重み付き合計を計算
  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);

  // ランダムな値を生成
  let random = Math.random() * totalWeight;

  // 重みに基づいて選択
  for (const item of weights) {
    random -= item.weight;
    if (random <= 0) {
      return item.restaurant;
    }
  }

  // フォールバック（通常は到達しない）
  return restaurants[Math.floor(Math.random() * restaurants.length)];
};
