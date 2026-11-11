import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RequireRole from './components/RequireRole';
import Home from './pages/Home';
import Restaurants from './pages/Restaurants';
import RestaurantDetail from './pages/RestaurantDetail';
import Favorites from './pages/Favorites';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import NotFound from './pages/NotFound';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRestaurants from './pages/admin/AdminRestaurants';
import AdminRestaurantForm from './pages/admin/AdminRestaurantForm';
import AdminReviews from './pages/admin/AdminReviews';
import AdminMembers from './pages/admin/AdminMembers';

export function AppRoutes() {
  return <Routes><Route element={<Layout />}><Route index element={<Home />} /><Route path="restaurants" element={<Restaurants />} /><Route path="restaurants/:id" element={<RestaurantDetail />} /><Route path="login" element={<Login />} /><Route path="register" element={<Register />} /><Route element={<ProtectedRoute />}><Route path="favorites" element={<Favorites />} /><Route path="profile" element={<Profile />} /><Route path="change-password" element={<ChangePassword />} /></Route><Route element={<RequireRole role="admin" />}><Route path="admin" element={<AdminLayout />}><Route index element={<AdminDashboard />} /><Route path="restaurants" element={<AdminRestaurants />} /><Route path="restaurants/new" element={<AdminRestaurantForm />} /><Route path="restaurants/:id/edit" element={<AdminRestaurantForm />} /><Route path="reviews" element={<AdminReviews />} /><Route path="members" element={<AdminMembers />} /></Route></Route><Route path="*" element={<NotFound />} /></Route></Routes>;
}
export default function App() { return <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>; }
