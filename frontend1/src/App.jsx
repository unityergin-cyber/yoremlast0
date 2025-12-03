import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import 'antd/dist/reset.css';
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./components/dashboard/AdminDashboard";
import AdminOrders from "./components/dashboard/AdminOrders";
import AdminUsers from "./components/dashboard/AdminUsers";
import AdminLogin from "./components/AdminLogin";
import Login from "./components/Login";
import Register from "./components/Register";
import VerifyCode from "./components/VerifyCode";
import AdminSettings from "./components/dashboard/AdminSettings"
import GeneralSettings from "./components/dashboard/GeneralSettings"; // YENİ - EKLE
import AdminCategories from "./components/dashboard/AdminCategories"
import AdminMainPageSlider from "./components/dashboard/AdminMainPageSlider"
import Profile from "./components/Profile";
import AdminProducts from "./components/dashboard/AdminProducts"
import AddProduct from "./components/dashboard/ADD/AddProduct"
import AdminCoupon from "./components/dashboard/AdminCoupon"
import AddCoupon from "./components/dashboard/ADD/AddCoupon";
import EditCoupon from "./components/dashboard/ADD/EditCoupon";
import EditProduct from "./components/dashboard/ADD/EditProduct";
import AddCategory from "./components/dashboard/ADD/AddCategories";
import EditCategory from "./components/dashboard/ADD/EditCategories";
import Products from "./components/Products";
import Address from "./components/Address";
import AdminOrderDetails from "./components/dashboard/AdminOrderDetails";
import AdminSliders from "./components/dashboard/AdminSliders";
import AddSlider from "./components/dashboard/ADD/AddSlider";
import EditSlider from "./components/dashboard/ADD/EditSlider";
import AdminLocations from "./components/dashboard/AdminLocations";
import AdminWorkingHours from "./components/dashboard/AdminWorkingHours";
import ProductOptionsManagement from "./components/dashboard/ProductOptionsManagement";
import AssignProductOptions from "./components/dashboard/AssignProductOptions";

const App = () => {
  return (
    <Routes>
      {/* Ana sayfayı Products'a yönlendir */}
      <Route path="/" element={<Navigate to="/admin/dashboard" />} />
      
      {/* Admin Giriş */}
      <Route path="/admin/login" element={<AdminLogin />} />
      
      {/* Korumalı Admin Rotaları */}
      <Route path="/admin/product-options" element={
        <ProtectedRoute>
          <ProductOptionsManagement />
        </ProtectedRoute>
      } />
      <Route path="/admin/assign-options" element={
        <ProtectedRoute>
          <AssignProductOptions />
        </ProtectedRoute>
      } />
      <Route path="/admin/dashboard" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/orders" element={
        <ProtectedRoute>
          <AdminOrders />
        </ProtectedRoute>
      } />
      <Route path="/admin/orders/:orderId" element={
        <ProtectedRoute>
          <AdminOrderDetails />
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute>
          <AdminUsers />
        </ProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <ProtectedRoute>
          <AdminSettings />
        </ProtectedRoute>
      } />
      {/* YENİ - Genel Ayarlar Route'u */}
      <Route path="/admin/settings/general" element={
        <ProtectedRoute>
          <GeneralSettings />
        </ProtectedRoute>
      } />
      <Route path="/admin/categories" element={
        <ProtectedRoute>
          <AdminCategories />
        </ProtectedRoute>
      } />
      <Route path="/admin/products" element={
        <ProtectedRoute>
          <AdminProducts />
        </ProtectedRoute>
      } />
      <Route path="/admin/coupons" element={
        <ProtectedRoute>
          <AdminCoupon />
        </ProtectedRoute>
      } />
      <Route path="/admin/sliders" element={
        <ProtectedRoute>
          <AdminSliders />
        </ProtectedRoute>
      } />
      <Route path="/admin/main-page/slider" element={
        <ProtectedRoute>
          <AdminMainPageSlider />
        </ProtectedRoute>
      } />
      <Route path="/admin/locations" element={
        <ProtectedRoute>
          <AdminLocations />
        </ProtectedRoute>
      } />
      <Route path="/admin/working-hours" element={
        <ProtectedRoute>
          <AdminWorkingHours />
        </ProtectedRoute>
      } />
      
      {/* Admin ADD/EDIT Rotaları */}
      <Route path="/admin/categories/add" element={
        <ProtectedRoute>
          <AddCategory />
        </ProtectedRoute>
      } />
      <Route path="/admin/products/add" element={
        <ProtectedRoute>
          <AddProduct />
        </ProtectedRoute>
      } />
      <Route path="/admin/coupons/add" element={
        <ProtectedRoute>
          <AddCoupon />
        </ProtectedRoute>
      } />
      <Route path="/admin/sliders/add" element={
        <ProtectedRoute>
          <AddSlider />
        </ProtectedRoute>
      } />
      <Route path="/admin/categories/edit/:id" element={
        <ProtectedRoute>
          <EditCategory />
        </ProtectedRoute>
      } />
      <Route path="/admin/products/edit/:id" element={
        <ProtectedRoute>
          <EditProduct />
        </ProtectedRoute>
      } />
      <Route path="/admin/coupons/edit/:id" element={
        <ProtectedRoute>
          <EditCoupon />
        </ProtectedRoute>
      } />
      <Route path="/admin/sliders/edit/:id" element={
        <ProtectedRoute>
          <EditSlider />
        </ProtectedRoute>
      } />

      {/* Kullanıcı Rotaları */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-code" element={<VerifyCode />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/products" element={<Products />} />
      <Route path="/address" element={<Address />} />
      
      {/* Tanımlanmamış rotaları Products'a yönlendir */}
      <Route path="*" element={<Navigate to="/admin/login" />} />
    </Routes>
  );
};

export default App;