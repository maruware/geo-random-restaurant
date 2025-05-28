import type { SearchSettings } from "../types";
import "./SearchSettings.css";

interface SearchSettingsProps {
  settings: SearchSettings;
  onRadiusChange: (radius: number) => void;
  onMinRatingChange: (minRating: number) => void;
}

export const SearchSettingsComponent = ({
  settings,
  onRadiusChange,
  onMinRatingChange,
}: SearchSettingsProps) => {
  return (
    <section className="settings">
      <h2>検索設定</h2>

      <div className="setting-group">
        <label htmlFor="radius">検索範囲:</label>
        <select
          id="radius"
          value={settings.radius}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
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
          value={settings.minRating}
          onChange={(e) => onMinRatingChange(Number(e.target.value))}
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
  );
};
