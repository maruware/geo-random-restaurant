import { useState, useEffect } from "react";
import type { Location, Building } from "../types";
import { searchNearbyBuildings } from "../utils/googleMaps";
import "./BuildingSelector.css";

interface BuildingSelectorProps {
  location: Location | null;
  radius: number;
  selectedBuildings: Building[];
  onBuildingsChange: (buildings: Building[]) => void;
}

export const BuildingSelector = ({
  location,
  radius,
  selectedBuildings,
  onBuildingsChange,
}: BuildingSelectorProps) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBuildings = async () => {
    if (!location) return;

    setIsLoading(true);
    setError(null);

    try {
      const foundBuildings = await searchNearbyBuildings(location, radius);
      setBuildings(foundBuildings);
      if (foundBuildings.length === 0) {
        setError("近隣に施設が見つかりませんでした");
      }
    } catch (err) {
      setError("施設の検索に失敗しました");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (location) {
      loadBuildings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, radius]);

  const toggleBuilding = (building: Building) => {
    const isSelected = selectedBuildings.some(
      (b) => b.place_id === building.place_id
    );

    if (isSelected) {
      onBuildingsChange(
        selectedBuildings.filter((b) => b.place_id !== building.place_id)
      );
    } else {
      onBuildingsChange([...selectedBuildings, building]);
    }
  };

  const getBuildingTypeLabel = (types: string[]): string => {
    if (types.includes("shopping_mall")) return "🛍️ ショッピングモール";
    if (types.includes("department_store")) return "🏬 デパート";
    if (types.includes("train_station")) return "🚉 駅";
    return "🏢 施設";
  };

  if (isLoading) {
    return (
      <div className="building-selector">
        <h3>📍 近隣の施設を検索中...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="building-selector">
        <h3>📍 近隣の施設</h3>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (buildings.length === 0) {
    return null;
  }

  return (
    <div className="building-selector">
      <h3>📍 近隣の施設を選択してください</h3>
      <p className="building-selector-help">
        レストランを探す施設を選択してください（複数選択可）
      </p>

      <div className="buildings-list">
        {buildings.map((building) => {
          const isSelected = selectedBuildings.some(
            (b) => b.place_id === building.place_id
          );
          return (
            <button
              key={building.place_id}
              className={`building-item ${isSelected ? "selected" : ""}`}
              onClick={() => toggleBuilding(building)}
            >
              <div className="building-info">
                <span className="building-type">
                  {getBuildingTypeLabel(building.types)}
                </span>
                <span className="building-name">{building.name}</span>
                {building.vicinity && (
                  <span className="building-vicinity">{building.vicinity}</span>
                )}
              </div>
              <div className="building-checkbox">{isSelected ? "✓" : ""}</div>
            </button>
          );
        })}
      </div>

      <div className="selected-count">選択中: {selectedBuildings.length}件</div>
    </div>
  );
};
