/// <reference types="google.maps" />
import { useState, useCallback } from "react";
import "./App.css";
import type { Restaurant } from "./types";
import { useGeolocation } from "./hooks/useGeolocation";
import {
  searchNearbyRestaurants,
  calculateWalkingDistance,
} from "./utils/googleMaps";
import { SearchSettingsComponent } from "./components/SearchSettings";
import { LocationSection } from "./components/LocationSection";
import { RestaurantResult } from "./components/RestaurantResult";

function App() {
  const {
    location,
    isLoading: locationLoading,
    error: locationError,
    getCurrentLocation,
  } = useGeolocation();
  const [searchRadius, setSearchRadius] = useState(1000);
  const [minRating, setMinRating] = useState(3.5);
  const [openOnly, setOpenOnly] = useState(false); // 営業中フィルタの状態追加
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const findRandomRestaurant = useCallback(async () => {
    if (!location) {
      setSearchError("まず現在地を取得してください");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSelectedRestaurant(null);

    try {
      const restaurant = await searchNearbyRestaurants(
        location,
        searchRadius,
        minRating,
        openOnly
      );

      // レストランの緯度経度が取得できている場合、徒歩経路距離を計算
      if (restaurant.lat && restaurant.lng) {
        try {
          const walkingInfo = await calculateWalkingDistance(location, {
            lat: restaurant.lat,
            lng: restaurant.lng,
          });
          restaurant.walkingDistance = walkingInfo.distance;
          restaurant.walkingDuration = walkingInfo.duration;
        } catch (walkingError) {
          console.warn("徒歩経路の計算に失敗しました:", walkingError);
          // 徒歩経路の計算に失敗しても、レストラン情報は表示する
        }
      }

      setSelectedRestaurant(restaurant);
    } catch (error) {
      setSearchError((error as Error).message);
    } finally {
      setIsSearching(false);
    }
  }, [location, searchRadius, minRating, openOnly]);

  const isLoading = locationLoading || isSearching;
  const error = locationError || searchError;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍽️ ランダムレストラン選択</h1>
        <p>あなたの現在地周辺からランダムにレストランを選びます</p>
      </header>

      <main className="app-main">
        <SearchSettingsComponent
          settings={{ radius: searchRadius, minRating, openOnly }}
          onRadiusChange={setSearchRadius}
          onMinRatingChange={setMinRating}
          onOpenOnlyChange={setOpenOnly}
        />

        <LocationSection
          location={location}
          isLoading={locationLoading}
          onGetLocation={getCurrentLocation}
        />

        <section className="search-section">
          <button
            onClick={findRandomRestaurant}
            disabled={!location || isLoading}
            className="search-button"
          >
            {isSearching ? "検索中..." : "ランダムにレストランを選ぶ"}
          </button>
        </section>

        {error && <div className="error">❌ {error}</div>}

        {selectedRestaurant && (
          <RestaurantResult
            restaurant={selectedRestaurant}
            currentLocation={location}
            onRetry={findRandomRestaurant}
          />
        )}
      </main>
    </div>
  );
}

export default App;
