/// <reference types="google.maps" />
import { useState, useCallback } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import "./App.css";

// 型定義
interface Location {
  lat: number;
  lng: number;
}

interface Restaurant {
  place_id: string;
  name: string;
  rating?: number;
  vicinity: string;
  opening_hours?: {
    open_now?: boolean;
  };
  photos?: google.maps.places.PlacePhoto[];
}

function App() {
  const [location, setLocation] = useState<Location | null>(null);
  const [searchRadius, setSearchRadius] = useState(1000); // デフォルト1km
  const [minRating, setMinRating] = useState(3.5); // デフォルト3.5以上
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 現在地を取得する関数
  const getCurrentLocation = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("この端末では位置情報がサポートされていません");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoading(false);
      },
      (error) => {
        setError("位置情報の取得に失敗しました: " + error.message);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  // レストランを検索してランダムに選択する関数
  const findRandomRestaurant = useCallback(async () => {
    if (!location) {
      setError("まず現在地を取得してください");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedRestaurant(null);

    try {
      // Google Maps API Keyが設定されていない場合の警告
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setError(
          "Google Maps API Keyが設定されていません。環境変数VITE_GOOGLE_MAPS_API_KEYを設定してください。"
        );
        setIsLoading(false);
        return;
      }

      // Google Maps APIを読み込み
      const loader = new Loader({
        apiKey: apiKey,
        version: "weekly",
        libraries: ["places"],
      });

      const google = await loader.load();
      const service = new google.maps.places.PlacesService(
        document.createElement("div")
      );

      // レストランを検索
      const request = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: searchRadius,
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
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            // 評価でフィルタリング
            const filteredRestaurants = results.filter(
              (place: google.maps.places.PlaceResult) =>
                place.rating && place.rating >= minRating
            );

            if (filteredRestaurants.length === 0) {
              setError(
                `半径${searchRadius}m以内に評価${minRating}以上のレストランが見つかりませんでした`
              );
              setIsLoading(false);
              return;
            }

            // ランダムに選択
            const randomIndex = Math.floor(
              Math.random() * filteredRestaurants.length
            );
            const selected = filteredRestaurants[randomIndex];

            setSelectedRestaurant({
              place_id: selected.place_id!,
              name: selected.name!,
              rating: selected.rating,
              vicinity: selected.vicinity!,
              opening_hours: selected.opening_hours,
              photos: selected.photos,
            });
          } else {
            setError("レストランの検索に失敗しました");
          }
          setIsLoading(false);
        }
      );
    } catch (error) {
      setError("エラーが発生しました: " + (error as Error).message);
      setIsLoading(false);
    }
  }, [location, searchRadius, minRating]);

  // Google Mapsで開くURL生成
  const getGoogleMapsUrl = useCallback((restaurant: Restaurant) => {
    return `https://maps.google.com/?q=${encodeURIComponent(
      restaurant.name
    )}&place_id=${restaurant.place_id}`;
  }, []);

  // 星評価の表示
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} className="star full">
          ★
        </span>
      );
    }
    if (hasHalfStar) {
      stars.push(
        <span key="half" className="star half">
          ☆
        </span>
      );
    }
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="star empty">
          ☆
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍽️ ランダムレストラン選択</h1>
        <p>あなたの現在地周辺からランダムにレストランを選びます</p>
      </header>

      <main className="app-main">
        {/* 設定セクション */}
        <section className="settings">
          <h2>検索設定</h2>

          <div className="setting-group">
            <label htmlFor="radius">検索範囲:</label>
            <select
              id="radius"
              value={searchRadius}
              onChange={(e) => setSearchRadius(Number(e.target.value))}
            >
              <option value={500}>500m</option>
              <option value={1000}>1km</option>
              <option value={2000}>2km</option>
              <option value={5000}>5km</option>
            </select>
          </div>

          <div className="setting-group">
            <label htmlFor="rating">最低評価:</label>
            <select
              id="rating"
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
            >
              <option value={1}>★☆☆☆☆ (1.0以上)</option>
              <option value={2}>★★☆☆☆ (2.0以上)</option>
              <option value={3}>★★★☆☆ (3.0以上)</option>
              <option value={3.5}>★★★★☆ (3.5以上)</option>
              <option value={4}>★★★★☆ (4.0以上)</option>
              <option value={4.5}>★★★★★ (4.5以上)</option>
            </select>
          </div>
        </section>

        {/* 現在地取得ボタン */}
        <section className="location-section">
          <button
            onClick={getCurrentLocation}
            disabled={isLoading}
            className="location-button"
          >
            {isLoading ? "取得中..." : "現在地を取得"}
          </button>

          {location && (
            <p className="location-info">
              📍 現在地: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          )}
        </section>

        {/* レストラン検索ボタン */}
        <section className="search-section">
          <button
            onClick={findRandomRestaurant}
            disabled={!location || isLoading}
            className="search-button"
          >
            {isLoading ? "検索中..." : "ランダムにレストランを選ぶ"}
          </button>
        </section>

        {/* エラー表示 */}
        {error && <div className="error">❌ {error}</div>}

        {/* 選択されたレストラン表示 */}
        {selectedRestaurant && (
          <section className="restaurant-result">
            <h2>🎯 今日のおすすめレストラン</h2>
            <div className="restaurant-card">
              <h3>{selectedRestaurant.name}</h3>

              {selectedRestaurant.rating && (
                <div className="rating">
                  <div className="stars">
                    {renderStars(selectedRestaurant.rating)}
                  </div>
                  <span className="rating-value">
                    ({selectedRestaurant.rating})
                  </span>
                </div>
              )}

              <p className="address">📍 {selectedRestaurant.vicinity}</p>

              {selectedRestaurant.opening_hours?.open_now !== undefined && (
                <p
                  className={`status ${
                    selectedRestaurant.opening_hours.open_now
                      ? "open"
                      : "closed"
                  }`}
                >
                  {selectedRestaurant.opening_hours.open_now
                    ? "🟢 営業中"
                    : "🔴 営業時間外"}
                </p>
              )}

              <div className="actions">
                <a
                  href={getGoogleMapsUrl(selectedRestaurant)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="maps-button"
                >
                  📱 Google Mapsで開く
                </a>

                <button onClick={findRandomRestaurant} className="retry-button">
                  🎲 もう一度選択
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
