import RestaurantCard from './RestaurantCard';
export default function RestaurantGrid({ items, renderAction }) {
  return <ul className="restaurant-grid" aria-label="รายการร้านอาหาร">{items.map(restaurant => <li key={restaurant.id}><RestaurantCard restaurant={restaurant} action={renderAction?.(restaurant)} /></li>)}</ul>;
}
