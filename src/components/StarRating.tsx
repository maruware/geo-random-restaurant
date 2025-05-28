import "./StarRating.css";

interface StarRatingProps {
  rating: number;
}

export const StarRating = ({ rating }: StarRatingProps) => {
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
  return <>{stars}</>;
};
