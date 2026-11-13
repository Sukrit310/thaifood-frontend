import { useId } from 'react';
import { Link } from 'react-router-dom';
import './RestaurantCard.css';

const FALLBACK_IMAGE = '/images/food-rice.svg';

function handleImageError(event) {
  const image = event.currentTarget;
  if (image.getAttribute('src') !== FALLBACK_IMAGE) image.src = FALLBACK_IMAGE;
}

export default function RestaurantCard({ restaurant, action }) {
  const titleId = useId();
  const hasRating = typeof restaurant.rating === 'number' && Number.isFinite(restaurant.rating) && restaurant.rating >= 1 && restaurant.rating <= 5;
  const hasReviewCount = Number.isInteger(restaurant.reviewCount) && restaurant.reviewCount >= 0;
  const address = restaurant.address || 'ค้นพบรสชาติประจำถิ่น';

  return <article className="restaurant-card" aria-labelledby={titleId}>
    <Link to={`/restaurants/${restaurant.id}`} className="restaurant-card-link" aria-labelledby={titleId}>
      <div className="card-media"><img src={restaurant.imageUrl || FALLBACK_IMAGE} onError={handleImageError} alt="" className="card-image" width="640" height="480" loading="lazy" decoding="async" /></div>
      <div className="card-content">
        {restaurant.category && <span className="category-tag">{restaurant.category}</span>}
        <h3 className="card-name" id={titleId} title={restaurant.name}>{restaurant.name}</h3>
        <div className="card-meta">
          <span className="card-province">{restaurant.province}</span>
          <span className="rating">{hasRating ? <>
            <span className="rating-star" aria-hidden="true">★</span><span className="sr-only">คะแนน </span><strong>{restaurant.rating.toFixed(1)}</strong><span className="sr-only"> จาก 5</span>
            {hasReviewCount && <small>({restaurant.reviewCount.toLocaleString('th-TH')} รีวิว)</small>}
          </> : 'ยังไม่มีคะแนน'}</span>
        </div>
        <p className="card-address" title={address}>{address}</p>
      </div>
    </Link>
    {action && <div className="card-action">{action}</div>}
  </article>;
}
