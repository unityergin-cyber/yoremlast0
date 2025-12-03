import axios from "axios";
import { isTokenExpired } from "../utils/auth";

const api = axios.create({
  baseURL: "http://192.168.1.150:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Global bir değişken ile token durumunu izleyelim
let isRedirecting = false;

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      // Token varsa ve süresi dolmamışsa ekle
      if (!isTokenExpired(token)) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("API isteği gönderiliyor:", config.url, "- Token geçerli");
      } else {
        console.log("API isteği gönderiliyor:", config.url, "- Token süresi dolmuş!");
        // Token süresi dolmuşsa ve yönlendirme henüz yapılmamışsa
        if (!isRedirecting) {
          isRedirecting = true;
          localStorage.removeItem("adminToken");
          localStorage.removeItem("admin");
          
          // Sayfayı yeniden yükle ve login sayfasına yönlendir
          if (window.location.pathname.includes('/admin') && 
              !window.location.pathname.includes('/admin/login')) {
            window.location.href = "/admin/login";
          }
        }
      }
    } else {
      console.log("API isteği gönderiliyor:", config.url, "- Token yok");
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log("API yanıtı alındı:", response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error("API hatası:", error.config?.url, error.response?.status, error.message);
    
    // 401 veya 403 hatasında çıkış yap
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log("Yetkilendirme hatası alındı, çıkış yapılıyor...");
      
      // Yalnızca bir kez yönlendirme yap
      if (!isRedirecting) {
        isRedirecting = true;
        localStorage.removeItem("adminToken");
        localStorage.removeItem("admin");
        
        // Sayfayı yeniden yükle ve login sayfasına yönlendir
        if (window.location.pathname.includes('/admin') && 
            !window.location.pathname.includes('/admin/login')) {
          window.location.href = "/admin/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;