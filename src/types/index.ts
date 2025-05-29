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
  opening_hours?: {
    open_now?: boolean;
  };
  photos?: google.maps.places.PlacePhoto[];
}

export interface SearchSettings {
  radius: number;
  minRating: number;
  openOnly: boolean; // 営業中のみを検索するかどうか
}
