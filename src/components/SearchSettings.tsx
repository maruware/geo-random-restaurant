import type { SearchSettings } from "../types";
import "./SearchSettings.css";

interface SearchSettingsProps {
  settings: SearchSettings;
  onRadiusChange: (radius: number) => void;
  onMinRatingChange: (minRating: number) => void;
  onOpenOnlyChange: (openOnly: boolean) => void;
  onIndoorModeChange: (indoorMode: boolean) => void; // 屋内モード追加
}

export const SearchSettingsComponent = ({
  settings,
  onRadiusChange,
  onMinRatingChange,
  onOpenOnlyChange,
  onIndoorModeChange, // 屋内モード追加
}: SearchSettingsProps) => {
  return (
    <section className="settings">
      <div className="settings-header">
        <h2>検索設定</h2>
        <div className="mode-switch">
          <button
            type="button"
            className={`mode-button ${!settings.indoorMode ? "active" : ""}`}
            onClick={() => onIndoorModeChange(false)}
            title="通常モード"
          >
            🗺️
          </button>
          <button
            type="button"
            className={`mode-button ${settings.indoorMode ? "active" : ""}`}
            onClick={() => onIndoorModeChange(true)}
            title="屋内施設優先モード"
          >
            🏢
          </button>
        </div>
      </div>

      <div className="setting-group">
        <label htmlFor="radius">検索範囲:</label>
        <select
          id="radius"
          value={settings.radius}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
        >
          <option value={300}>300m</option>
          <option value={500}>500m</option>
          <option value={750}>750m</option>
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

      <div className="setting-group">
        <label htmlFor="openOnly">営業状況:</label>
        <select
          id="openOnly"
          value={settings.openOnly ? "true" : "false"}
          onChange={(e) => onOpenOnlyChange(e.target.value === "true")}
        >
          <option value="false">すべて表示</option>
          <option value="true">🟢 営業中のみ</option>
        </select>
      </div>
    </section>
  );
};
