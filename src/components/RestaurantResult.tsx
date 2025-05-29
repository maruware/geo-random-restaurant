import { useEffect, useRef } from "react";
import type { Restaurant } from "../types";
import { StarRating } from "./StarRating";
import { getGoogleMapsUrl } from "../utils/googleMaps";
import "./RestaurantResult.css";

interface RestaurantResultProps {
  restaurant: Restaurant;
  onRetry: () => void;
}

export const RestaurantResult = ({
  restaurant,
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
  }, [restaurant.place_id]); // place_idが変更されたときにスクロール

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

        {restaurant.opening_hours?.isOpen !== undefined && (
          <p
            className={`status ${
              restaurant.opening_hours.isOpen() ? "open" : "closed"
            }`}
          >
            {restaurant.opening_hours.isOpen() ? "🟢 営業中" : "🔴 営業時間外"}
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
