import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import pMap from "p-map";
import { shuffle } from "remeda";
import type { Location, Restaurant, Building } from "../types";

setOptions({
  key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
});

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

// Place Detailsを取得するヘルパー関数
const getPlaceDetails = async (
  service: google.maps.places.PlacesService,
  placeId: string
): Promise<google.maps.places.PlaceResult | null> => {
  return promisifyPlacesCallback<google.maps.places.PlaceResult | null>(
    (resolve, reject) => {
      service.getDetails(
        {
          placeId: placeId,
          fields: ["opening_hours"],
        },
        (
          result: google.maps.places.PlaceResult | null,
          status: google.maps.places.PlacesServiceStatus
        ) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            resolve(result);
          } else {
            reject(new Error(`詳細情報の取得に失敗: ${status}`));
          }
        }
      );
    }
  );
};

export const getAddressFromCoordinates = async (
  location: Location
): Promise<string> => {
  const { Geocoder } = await importLibrary("geocoding");

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
  const [{ DirectionsService, TravelMode }, { UnitSystem }] = await Promise.all(
    [importLibrary("routes"), importLibrary("core")]
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

// 円内のランダムな点を生成する関数
const generateRandomPointInRadius = (
  center: Location,
  radiusMeters: number
): Location => {
  // 一様分布のために sqrt を使用（中心に偏らないように）
  const r = radiusMeters * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;

  // メートルを緯度経度の差分に変換（概算）
  const deltaLat = (r * Math.cos(theta)) / 111320; // 1度 ≈ 111.32km
  const deltaLng =
    (r * Math.sin(theta)) /
    (111320 * Math.cos((center.lat * Math.PI) / 180));

  return {
    lat: center.lat + deltaLat,
    lng: center.lng + deltaLng,
  };
};

// 確率調整機能付きのレストラン検索
export const searchNearbyRestaurantsWithProbability = async (
  location: Location,
  radius: number,
  minRating: number,
  openOnly: boolean = false,
  restaurantHistory: Map<string, number> = new Map()
): Promise<Restaurant> => {
  const [{ PlacesService, RankBy }, { LatLng }] = await Promise.all([
    importLibrary("places"),
    importLibrary("core"),
  ]);

  const service = new PlacesService(document.createElement("div"));

  // ランダムな検索起点を生成（元の位置からradius内のランダムな点）
  const randomSearchPoint = generateRandomPointInRadius(location, radius);

  // RankBy.DISTANCE を使用（radius は指定しない、type は必須）
  const request: google.maps.places.PlaceSearchRequest = {
    location: new LatLng(randomSearchPoint.lat, randomSearchPoint.lng),
    type: "restaurant",
    rankBy: RankBy.DISTANCE,
    openNow: openOnly,
  };

  const { results, status } = await promisifyPlacesCallback<{
    results: google.maps.places.PlaceResult[] | null;
    status: google.maps.places.PlacesServiceStatus;
  }>((resolve) => {
    service.nearbySearch(request, (results, status) => {
      resolve({ results, status });
    });
  });

  if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
    throw new Error("レストランの検索に失敗しました");
  }

  // 元の位置からradius内のレストランのみをフィルタリング
  const radiusKm = radius / 1000;
  const withinRadiusResults = results.filter((place) => {
    if (!place.geometry?.location) return false;
    const distance = calculateDistance(
      location.lat,
      location.lng,
      place.geometry.location.lat(),
      place.geometry.location.lng()
    );
    return distance <= radiusKm;
  });

  // 評価フィルタを適用
  const filteredRestaurants = withinRadiusResults.filter(
    (place: google.maps.places.PlaceResult) =>
      place.rating && place.rating >= minRating
  );

  if (filteredRestaurants.length === 0) {
    const filterMessage = openOnly
      ? `半径${radius}m以内に評価${minRating}以上かつ営業中のレストランが見つかりませんでした`
      : `半径${radius}m以内に評価${minRating}以上のレストランが見つかりませんでした`;
    throw new Error(filterMessage);
  }

  // 確率調整を適用してレストランを選択
  const selected = selectRestaurantWithProbability(
    filteredRestaurants,
    restaurantHistory
  );

  // 詳細な営業時間情報を取得
  let detailedOpeningHours = selected.opening_hours;
  if (selected.place_id) {
    try {
      const details = await getPlaceDetails(service, selected.place_id);
      if (details?.opening_hours) {
        detailedOpeningHours = details.opening_hours;
      }
    } catch (error) {
      console.warn("営業時間の詳細取得に失敗:", error);
    }
  }

  return {
    place_id: selected.place_id!,
    name: selected.name!,
    rating: selected.rating,
    vicinity: selected.vicinity!,
    lat: selected.geometry?.location?.lat(),
    lng: selected.geometry?.location?.lng(),
    opening_hours: detailedOpeningHours,
    photos: selected.photos,
  };
};

// 履歴に基づいて確率調整したレストラン選択
const selectRestaurantWithProbability = (
  restaurants: google.maps.places.PlaceResult[],
  history: Map<string, number>
): google.maps.places.PlaceResult => {
  // まず配列をシャッフルして、API返却順の偏りを排除
  const shuffledRestaurants = shuffle(restaurants);

  // 各レストランの重みを計算
  const weights = shuffledRestaurants.map(
    (restaurant: google.maps.places.PlaceResult) => {
      const placeId = restaurant.place_id!;
      const selectionCount = history.get(placeId) || 0;
      // 選択回数に応じて重みを計算（50%ずつ減少）
      const weight = Math.pow(0.5, selectionCount);
      return { restaurant, weight };
    }
  );

  // 重み付き合計を計算
  const totalWeight = weights.reduce(
    (sum: number, item: { restaurant: google.maps.places.PlaceResult; weight: number }) =>
      sum + item.weight,
    0
  );

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
  return shuffledRestaurants[Math.floor(Math.random() * shuffledRestaurants.length)];
};

// 近隣の大型施設（ビル・商業施設）を検索
export const searchNearbyBuildings = async (
  location: Location,
  radius: number
): Promise<Building[]> => {
  const [{ PlacesService }, { LatLng }] = await Promise.all([
    importLibrary("places"),
    importLibrary("core"),
  ]);

  const service = new PlacesService(document.createElement("div"));

  // 複数のタイプの施設を検索
  const types = ["shopping_mall", "department_store", "train_station"];

  const allBuildingsArrays = await pMap(
    types,
    async (type) => {
      const request = {
        location: new LatLng(location.lat, location.lng),
        radius: radius,
        type: type,
      };

      try {
        const buildings = await promisifyPlacesCallback<Building[]>(
          (resolve) => {
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
                  const mappedBuildings = results
                    .filter(
                      (place) =>
                        place.place_id && place.name && place.geometry?.location
                    )
                    .map((place) => ({
                      place_id: place.place_id!,
                      name: place.name!,
                      vicinity: place.vicinity || "",
                      lat: place.geometry!.location!.lat(),
                      lng: place.geometry!.location!.lng(),
                      types: place.types || [],
                    }));
                  resolve(mappedBuildings);
                } else {
                  resolve([]);
                }
              }
            );
          }
        );
        return buildings;
      } catch (error) {
        console.warn(`Type ${type} の検索に失敗:`, error);
        return [];
      }
    },
    { concurrency: 3 }
  );

  const allBuildings = allBuildingsArrays.flat();

  // place_idで重複を削除
  const uniqueBuildings = Array.from(
    new Map(allBuildings.map((b) => [b.place_id, b])).values()
  );

  return uniqueBuildings;
};

// 選択した施設内のレストランを検索
export const searchRestaurantsInBuildings = async (
  buildings: Building[],
  minRating: number,
  openOnly: boolean = false,
  restaurantHistory: Map<string, number> = new Map()
): Promise<Restaurant> => {
  const [{ PlacesService }, { LatLng }] = await Promise.all([
    importLibrary("places"),
    importLibrary("core"),
  ]);

  const service = new PlacesService(document.createElement("div"));

  const allRestaurantsArrays = await pMap(
    buildings,
    async (building) => {
      // テキスト検索を使用して施設名を含めた検索
      const request = {
        query: `${building.name} レストラン`,
        location: new LatLng(building.lat, building.lng),
        radius: 100, // 施設周辺100m以内
        type: "restaurant",
        openNow: openOnly,
      };

      try {
        const restaurants = await promisifyPlacesCallback<
          google.maps.places.PlaceResult[]
        >((resolve) => {
          service.textSearch(
            request,
            (
              results: google.maps.places.PlaceResult[] | null,
              status: google.maps.places.PlacesServiceStatus
            ) => {
              if (
                status === google.maps.places.PlacesServiceStatus.OK &&
                results
              ) {
                // 評価フィルタと住所フィルタを適用
                const filteredResults = results.filter((place) => {
                  // 評価チェック
                  if (!place.rating || place.rating < minRating) {
                    return false;
                  }

                  // 住所に施設名が含まれているかチェック（より厳密に施設内に絞る）
                  if (place.formatted_address) {
                    const addressLower = place.formatted_address.toLowerCase();
                    const buildingNameLower = building.name.toLowerCase();
                    // 施設名が住所に含まれているか、または非常に近い場合のみ
                    if (
                      addressLower.includes(buildingNameLower) ||
                      place.vicinity?.toLowerCase().includes(buildingNameLower)
                    ) {
                      return true;
                    }
                  }

                  // 距離が非常に近い場合も許可（20m以内）
                  if (place.geometry?.location) {
                    const distance = calculateDistance(
                      building.lat,
                      building.lng,
                      place.geometry.location.lat(),
                      place.geometry.location.lng()
                    );
                    return distance < 0.02; // 20m以内
                  }

                  return false;
                });
                resolve(filteredResults);
              } else if (
                status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
              ) {
                // 結果が0件の場合は空配列を返す
                resolve([]);
              } else {
                resolve([]);
              }
            }
          );
        });

        return restaurants;
      } catch (error) {
        console.warn(`施設 ${building.name} のレストラン検索に失敗:`, error);
        return [];
      }
    },
    { concurrency: 2 }
  );

  const allRestaurants = allRestaurantsArrays.flat();

  // place_idで重複を削除
  const uniqueRestaurants = Array.from(
    new Map(allRestaurants.map((r) => [r.place_id, r])).values()
  );

  if (uniqueRestaurants.length === 0) {
    throw new Error(
      "選択した施設内に条件に合うレストランが見つかりませんでした"
    );
  }

  // 確率調整を適用してレストランを選択
  const selected = selectRestaurantWithProbability(
    uniqueRestaurants,
    restaurantHistory
  );

  // 詳細な営業時間情報を取得
  let detailedOpeningHours = selected.opening_hours;
  if (selected.place_id) {
    try {
      const details = await getPlaceDetails(service, selected.place_id);
      if (details?.opening_hours) {
        detailedOpeningHours = details.opening_hours;
      }
    } catch (error) {
      console.warn("営業時間の詳細取得に失敗:", error);
    }
  }

  return {
    place_id: selected.place_id!,
    name: selected.name!,
    rating: selected.rating,
    vicinity: selected.vicinity || selected.formatted_address || "",
    lat: selected.geometry?.location?.lat(),
    lng: selected.geometry?.location?.lng(),
    opening_hours: detailedOpeningHours,
    photos: selected.photos,
  };
};
