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
  minRating: number
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
              const filteredRestaurants = results.filter(
                (place: google.maps.places.PlaceResult) =>
                  place.rating && place.rating >= minRating
              );

              if (filteredRestaurants.length === 0) {
                reject(
                  new Error(
                    `半径${radius}m以内に評価${minRating}以上のレストランが見つかりませんでした`
                  )
                );
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
