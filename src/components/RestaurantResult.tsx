import { useEffect, useRef } from "react";
import type { Restaurant, Location } from "../types";
import { StarRating } from "./StarRating";
import {
  getGoogleMapsUrl,
  calculateDistance,
  formatDistance,
} from "../utils/googleMaps";
import "./RestaurantResult.css";

interface RestaurantResultProps {
  restaurant: Restaurant;
  currentLocation: Location | null; // 現在地を追加
  onRetry: () => void;
}

export const RestaurantResult = ({
  restaurant,
  currentLocation,
  onRetry,
}: RestaurantResultProps) => {
  const resultRef = useRef<HTMLElement>(null);

  // レストランが変更されたときに自動スクロール
  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [restaurant.place_id]);

  // 距離を計算する関数
  const getDistance = (): string | null => {
    // 徒歩経路距離がある場合はそれを優先表示
    if (restaurant.walkingDistance) {
      return restaurant.walkingDistance;
    }

    // フォールバック: 直線距離を計算
    if (currentLocation && restaurant.lat && restaurant.lng) {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        restaurant.lat,
        restaurant.lng
      );
      return `約${formatDistance(distance)} (直線距離)`;
    }
    return null;
  };

  const distance = getDistance();
  const duration = restaurant.walkingDuration;

  return (
    <section className="restaurant-result" ref={resultRef}>
      <h2>🎯 今日のおすすめレストラン</h2>
      <div className="restaurant-card">
        <h3>{restaurant.name}</h3>

        {restaurant.rating && (
          <div className="rating">
            <div className="stars">
              <StarRating rating={restaurant.rating} />
            </div>
            <span className="rating-value">({restaurant.rating})</span>
          </div>
        )}

        <p className="address">📍 {restaurant.vicinity}</p>

        {distance && (
          <p className="distance">
            🚶 現在地から {distance}
            {duration && <span> ({duration})</span>}
          </p>
        )}

        {restaurant.opening_hours?.open_now !== undefined && (
          <p
            className={`status ${
              restaurant.opening_hours.open_now ? "open" : "closed"
            }`}
          >
            {restaurant.opening_hours.open_now ? "🟢 営業中" : "🔴 営業時間外"}
          </p>
        )}

        <div className="actions">
          <a
            href={getGoogleMapsUrl(restaurant)}
            target="_blank"
            rel="noopener noreferrer"
            className="maps-button"
          >
            📱 Google Mapsで開く
          </a>

          <button onClick={onRetry} className="retry-button">
            🎲 もう一度選択
          </button>
        </div>
      </div>
    </section>
  );
};
