import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import Sidebar from "./Sidebar";
import "./Orders.css";

const GeneralSettings = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [settings, setSettings] = useState({
    product_options_enabled: false,
  });

  // Sidebar responsive
  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Admin kontrolü ve ayarları yükle
  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
      return;
    }
    fetchSettings();
  }, [admin, navigate]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/settings/general");
      setSettings(response?.data?.data || { product_options_enabled: false });
    } catch (err) {
      console.error("Ayarlar yüklenemedi:", err);
      // Varsayılan değer kullan
      setSettings({ product_options_enabled: false });
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/api/settings/general", settings);
      setSuccess(response?.data?.message || "Ayarlar başarıyla kaydedildi.");
      
      // 2 saniye sonra success mesajını temizle
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "Ayarlar kaydedilirken bir hata oluştu: " + (err?.message || "Bilinmeyen hata")
      );
    } finally {
      setLoading(false);
    }
  };

  if (!admin) return null;

  return (
    <div className="admin-products-page ap-white">
      <header className="apw-header">
        <button className="apw-menu-btn" onClick={toggleSidebar} aria-label="Toggle Sidebar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6H20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M4 12H16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M4 18H10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>

        <div className="apw-header-text">
          <h1 className="apw-title">Genel Ayarlar</h1>
          <p className="apw-subtitle">Sistem genelindeki özellikleri yönetin</p>
        </div>
      </header>

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      

      <style jsx>{`
        .settings-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 16px;
          background: #ffffff;
        }

        .settings-item-info {
          flex: 1;
        }

        .settings-item-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .settings-item-desc {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: 0.4s;
          border-radius: 34px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        input:checked + .toggle-slider {
          background-color: #10b981;
        }

        input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }

        input:focus + .toggle-slider {
          box-shadow: 0 0 1px #10b981;
        }
      `}</style>
    </div>
  );
};

export default GeneralSettings;