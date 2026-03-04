import type { Location } from "../types";
import "./LocationSection.css";

interface LocationSectionProps {
  location: Location | null;
  isLoading: boolean;
  onGetLocation: () => void;
}

export const LocationSection = ({ location, isLoading, onGetLocation }: LocationSectionProps) => {
  return (
    <section className="location-section">
      <button onClick={onGetLocation} disabled={isLoading} className="location-button">
        {isLoading ? "取得中..." : "現在地を取得"}
      </button>

      {location && (
        <p className="location-info">
          📍 現在地: {location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
        </p>
      )}
    </section>
  );
};
