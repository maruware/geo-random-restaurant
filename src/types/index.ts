/// <reference types="google.maps" />

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface Restaurant {
  place_id: string;
  name: string;
  rating?: number;
  vicinity: string;
  lat?: number; // 緯度を追加
  lng?: number; // 経度を追加
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[]; // 営業時間の詳細テキスト
  };
  photos?: google.maps.places.PlacePhoto[];
  walkingDistance?: string; // 徒歩距離を追加
  walkingDuration?: string; // 徒歩時間を追加
}

export interface SearchSettings {
  radius: number;
  minRating: number;
  openOnly: boolean; // 営業中のみを検索するかどうか
  indoorMode: boolean; // 屋内施設優先モード
}

export interface Building {
  place_id: string;
  name: string;
  vicinity: string;
  lat: number;
  lng: number;
  types: string[];
}
