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

  // 営業時間の表示を取得する関数
  const getOpeningHoursDisplay = () => {
    if (!restaurant.opening_hours) {
      return null;
    }

    const isOpen = restaurant.opening_hours.open_now;
    const weekdayText = restaurant.opening_hours.weekday_text;

    // 今日の営業時間を取得（日本語版は月曜日から始まる）
    const getTodayHours = () => {
      if (!weekdayText || weekdayText.length === 0) {
        return null;
      }

      const today = new Date().getDay(); // 0=日曜日, 1=月曜日, ...
      // Google Maps APIの weekday_text は月曜日から始まるため調整
      const adjustedDay = today === 0 ? 6 : today - 1; // 日曜日を6に、その他は-1

      return weekdayText[adjustedDay] || null;
    };

    // 時間表示を簡潔にする関数
    const formatTimeDisplay = (timeText: string): string => {
      // 「16時00分～3時00分」を「16時～3時」に変換
      return timeText.replace(/(\d+)時00分/g, "$1時");
    };

    const todayHours = getTodayHours();
    const formattedTodayHours = todayHours
      ? formatTimeDisplay(todayHours)
      : null;

    // 全営業時間も同様にフォーマット
    const formattedAllHours = weekdayText?.map(formatTimeDisplay);

    return {
      isOpen,
      todayHours: formattedTodayHours,
      allHours: formattedAllHours,
    };
  };

  const distance = getDistance();
  const duration = restaurant.walkingDuration;
  const openingHoursInfo = getOpeningHoursDisplay();

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

        {openingHoursInfo && (
          <div className="opening-hours">
            <p
              className={`status ${
                openingHoursInfo.isOpen ? "open" : "closed"
              }`}
            >
              {openingHoursInfo.isOpen ? "🟢 営業中" : "🔴 営業時間外"}
            </p>
            {openingHoursInfo.todayHours && (
              <p className="today-hours">
                🕐 本日: {openingHoursInfo.todayHours.replace(/^[^:]+:\s*/, "")}
              </p>
            )}
            {openingHoursInfo.allHours &&
              openingHoursInfo.allHours.length > 0 && (
                <details className="all-hours">
                  <summary>📅 営業時間詳細</summary>
                  <div className="hours-list">
                    {openingHoursInfo.allHours.map((hours, index) => (
                      <p key={index} className="hours-item">
                        {hours}
                      </p>
                    ))}
                  </div>
                </details>
              )}
          </div>
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
