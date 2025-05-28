/// <reference types="google.maps" />

export interface Location {
  lat: number;
  lng: number;
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
}
