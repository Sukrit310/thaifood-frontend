import RestaurantCard from './RestaurantCard';
export default function RestaurantGrid({ items, renderAction }) {
  return <div className="restaurant-grid">{items.map(restaurant => <RestaurantCard key={restaurant.id} restaurant={restaurant} action={renderAction?.(restaurant)} />)}</div>;
}
