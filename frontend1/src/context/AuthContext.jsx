import React, { createContext, useState, useEffect } from "react";
import api from "../services/api";
import { isTokenExpired } from "../utils/auth";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(localStorage.getItem("adminToken") || null);
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Admin bilgilerini yükle
  useEffect(() => {
    const storedAdmin = localStorage.getItem("admin");
    if (storedAdmin) {
      try {
        setAdmin(JSON.parse(storedAdmin));
      } catch (error) {
        console.error("Admin verisi ayrıştırılamadı:", error);
        localStorage.removeItem("admin");
      }
    }
    setIsLoading(false);
  }, []);
  
  // Token değiştiğinde API ve localStorage'u güncelle
  useEffect(() => {
    if (adminToken) {
      localStorage.setItem("adminToken", adminToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${adminToken}`;
    } else {
      localStorage.removeItem("adminToken");
      delete api.defaults.headers.common["Authorization"];
    }
  }, [adminToken]);
  
  // Admin bilgileri değiştiğinde localStorage'u güncelle
  useEffect(() => {
    if (admin) {
      localStorage.setItem("admin", JSON.stringify(admin));
    } else {
      localStorage.removeItem("admin");
    }
  }, [admin]);
  
  // Token süresi dolduğunda otomatik çıkış yap
  useEffect(() => {
    if (!adminToken) return;
    
    // İlk kontrol
    if (isTokenExpired(adminToken)) {
      console.log("Token süresi dolmuş, çıkış yapılıyor...");
      logout();
      return;
    }
    
    // Periyodik kontrol (60 saniyede bir)
    const interval = setInterval(() => {
      if (isTokenExpired(adminToken)) {
        console.log("Token süresi dolmuş, çıkış yapılıyor...");
        logout();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [adminToken]);
  
  const login = (token, adminData) => {
    // Önce localStorage'a kaydet
    localStorage.setItem("adminToken", token);
    localStorage.setItem("admin", JSON.stringify(adminData));
    
    // API headers'ı ayarla
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    
    // Sonra state'i güncelle
    setAdminToken(token);
    setAdmin(adminData);
  };
  
  const logout = () => {
    setAdminToken(null);
    setAdmin(null);
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    delete api.defaults.headers.common["Authorization"];
    
    // Admin sayfasındaysa login'e yönlendir
    if (window.location.pathname.includes('/admin') && 
        !window.location.pathname.includes('/admin/login')) {
      window.location.href = "/admin/login";
    }
  };
  
  return (
    <AuthContext.Provider 
      value={{ 
        adminToken, 
        admin, 
        login, 
        logout, 
        isLoading, 
        isAuthenticated: !!adminToken && !!admin 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;