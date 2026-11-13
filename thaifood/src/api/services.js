import { request } from './backend';

export const authService = {
  register: body => request('/api/auth/register', { method: 'POST', body }),
  login: body => request('/api/auth/login', { method: 'POST', body }),
  me: () => request('/api/me'),
  updateProfile: body => request('/api/me', { method: 'PATCH', body }),
  changePassword: body => request('/api/me/password', { method: 'PUT', body }),
};
export const restaurantService = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    }
    const encoded = query.toString();
    return request(`/api/restaurants${encoded ? `?${encoded}` : ''}`);
  },
  get: id => request(`/api/restaurants/${encodeURIComponent(id)}`),
  provinces: () => request('/api/provinces'),
  categories: () => request('/api/categories'),
};
export const reviewService = {
  list: restaurantId => request(`/api/restaurants/${encodeURIComponent(restaurantId)}/reviews`),
  create: (restaurantId, body) => request(`/api/restaurants/${encodeURIComponent(restaurantId)}/reviews`, { method: 'POST', body }),
  remove: id => request(`/api/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
export const favoriteService = {
  list: () => request('/api/favorites'),
  add: restaurantId => request('/api/favorites', { method: 'POST', body: { restaurantId: Number(restaurantId) } }),
  remove: restaurantId => request(`/api/favorites/${encodeURIComponent(restaurantId)}`, { method: 'DELETE' }),
};
export const adminService = {
  members: () => request('/api/admin/members'),
  updateMemberRole: (id, role) => request(`/api/admin/members/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: { role } }),
  createRestaurant: body => request('/api/admin/restaurants', { method: 'POST', body }),
  updateRestaurant: (id, body) => request(`/api/admin/restaurants/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deleteRestaurant: id => request(`/api/admin/restaurants/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  deleteReview: id => request(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
