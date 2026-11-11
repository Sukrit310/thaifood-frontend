import { Link } from 'react-router-dom';
export default function RestaurantCard({ restaurant, action }) {
  return <article className="restaurant-card group">
    <Link to={`/restaurants/${restaurant.id}`} className="card-image-link" tabIndex={-1} aria-hidden="true"><img src={restaurant.imageUrl || '/images/food-rice.svg'} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/food-rice.svg'; }} alt="" className="card-image" loading="lazy" /><span className="category-tag">{restaurant.category}</span></Link>
    <div className="card-content"><div className="card-meta"><span>{restaurant.province}</span><span className="rating">{restaurant.rating == null ? 'ยังไม่มีคะแนน' : <><span aria-hidden="true">★</span> {Number(restaurant.rating).toFixed(1)} <small>({restaurant.reviewCount})</small></>}</span></div><h3><Link to={`/restaurants/${restaurant.id}`}>{restaurant.name}</Link></h3><p className="card-address">{restaurant.address || 'ค้นพบรสชาติประจำถิ่น'}</p>{action}</div>
  </article>;
}
