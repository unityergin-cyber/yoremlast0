import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext"; 
import api from "../../services/api";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import Sidebar from "./Sidebar";
import Switch from "react-switch";
import "./Orders.css";
import "./AdminLocations.css";

const AdminLocations = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("regions"); // 'addressSettings' olarak değiştirilebilir
  
  // Veri state'leri
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [streets, setStreets] = useState([]);
  
  // Form state'leri
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(null);
  
  // Bölge formu
  const [regionForm, setRegionForm] = useState({
    name: "",
    is_active: true
  });
  
  // İlçe formu
  const [districtForm, setDistrictForm] = useState({
    name: "",
    region_id: "",
    minimum_order_amount: 0,
    is_active: true
  });
  
  // Mahalle formu
  const [neighborhoodForm, setNeighborhoodForm] = useState({
    name: "",
    district_id: "",
    minimum_order_amount: 0,
    is_active: true
  });
  
  // Sokak formu
  const [streetForm, setStreetForm] = useState({
    name: "",
    neighborhood_id: "",
    is_active: true
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
    }
  }, [admin, navigate]);

  // Veri yükleme fonksiyonları
  const fetchRegions = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/locations/regions");
      setRegions(response.data.data || []);
    } catch (err) {
      setError("Bölgeler yüklenirken bir hata oluştu: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDistricts = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/locations/districts");
      setDistricts(response.data.data || []);
    } catch (err) {
      setError("İlçeler yüklenirken bir hata oluştu: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  const fetchNeighborhoods = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/locations/neighborhoods");
      setNeighborhoods(response.data.data || []);
    } catch (err) {
      setError("Mahalleler yüklenirken bir hata oluştu: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStreets = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/locations/streets");
      setStreets(response.data.data || []);
    } catch (err) {
      setError("Sokaklar yüklenirken bir hata oluştu: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Sayfa açıldığında tüm verileri yükle
  useEffect(() => {
    if (admin) {
      const loadAllData = async () => {
        await Promise.all([
          fetchRegions(),
          fetchDistricts(),
          fetchNeighborhoods(),
          fetchStreets()
        ]);
      };
      loadAllData();
    }
  }, [admin]);

  // Tab değiştiğinde veri yenileme
  useEffect(() => {
    if (admin) {
      switch (activeTab) {
        case "regions":
          fetchRegions();
          break;
        case "districts":
          fetchDistricts();
          break;
        case "neighborhoods":
          fetchNeighborhoods();
          break;
        case "streets":
          fetchStreets();
          break;
        case "addressSettings":
          // Bu sekme kendi verisini kendi içinde çekecek
          break;
        default:
          break;
      }
    }
  }, [activeTab, admin]);

  // Form reset
  const resetForm = () => {
    setRegionForm({ name: "", is_active: true });
    setDistrictForm({ name: "", region_id: "", is_active: true });
    setNeighborhoodForm({ name: "", district_id: "",minimum_order_amount: 0, is_active: true });
    setStreetForm({ name: "", neighborhood_id: "", is_active: true });
    setEditMode(false);
    setCurrentItemId(null);
    setShowForm(false);
  };

  // Düzenleme modu
  const handleEdit = async (id) => {
    setLoading(true);
    setError("");
    setCurrentItemId(id);
    setEditMode(true);
    setShowForm(true);
    
    try {
      let response;
      switch (activeTab) {
        case "regions":
          response = await api.get(`/api/locations/regions/${id}`);
          setRegionForm({
            name: response.data.data.name,
            is_active: response.data.data.is_active === 1 || response.data.data.is_active === true
          });
          break;
        case "districts":
          response = await api.get(`/api/locations/districts/${id}`);
          setDistrictForm({
            name: response.data.data.name,
            region_id: response.data.data.region_id.toString(),
            is_active: response.data.data.is_active === 1 || response.data.data.is_active === true
          });
          break;
        case "neighborhoods":
          response = await api.get(`/api/locations/neighborhoods/${id}`);
          setNeighborhoodForm({
            name: response.data.data.name,
            district_id: response.data.data.district_id.toString(),
            minimum_order_amount: response.data.data.minimum_order_amount || 0,
            is_active: response.data.data.is_active === 1 || response.data.data.is_active === true
          });
          break;
        case "streets":
          response = await api.get(`/api/locations/streets/${id}`);
          setStreetForm({
            name: response.data.data.name,
            neighborhood_id: response.data.data.neighborhood_id.toString(),
            is_active: response.data.data.is_active === 1 || response.data.data.is_active === true
          });
          break;
        default:
          break;
      }
    } catch (err) {
      setError("Veri yüklenirken bir hata oluştu: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Silme işlemi
  const handleDelete = async (id) => {
    if (!window.confirm("Bu kaydı silmek istediğinizden emin misiniz?")) {
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      switch (activeTab) {
        case "regions":
          await api.delete(`/api/locations/regions/${id}`);
          fetchRegions(); // Listeyi güncelle
          break;
        case "districts":
          await api.delete(`/api/locations/districts/${id}`);
          fetchDistricts(); // Listeyi güncelle
          break;
        case "neighborhoods":
          await api.delete(`/api/locations/neighborhoods/${id}`);
          fetchNeighborhoods(); // Listeyi güncelle
          break;
        case "streets":
          await api.delete(`/api/locations/streets/${id}`);
          fetchStreets(); // Listeyi güncelle
          break;
        default:
          break;
      }
      setSuccess("Kayıt başarıyla silindi.");
    } catch (err) {
      setError("Silme işlemi sırasında bir hata oluştu: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Form gönderimi
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");
  
  try {
    let response;
    switch (activeTab) {
      case "regions":
        if (editMode) {
          response = await api.put(`/api/locations/regions/${currentItemId}`, regionForm);
          fetchRegions();
        } else {
          response = await api.post("/api/locations/regions", regionForm);
          fetchRegions();
        }
        break;
        
      case "districts":{
        if (editMode) {
          response = await api.put(`/api/locations/districts/${currentItemId}`, districtForm);
          fetchDistricts();
        } else {
          response = await api.post("/api/locations/districts", districtForm);
          fetchDistricts();
        }
        break;
      }
        
      case "neighborhoods": {
        // Veriyi hazırla
        const neighborhoodData = {
          name: neighborhoodForm.name,
          district_id: neighborhoodForm.district_id,
          minimum_order_amount: parseFloat(neighborhoodForm.minimum_order_amount) || 0,
          is_active: neighborhoodForm.is_active ? 1 : 0
        };
        
        console.log("Gönderilen veri:", neighborhoodData); // Debug için
        
        if (editMode) {
          response = await api.put(`/api/locations/neighborhoods/${currentItemId}`, neighborhoodData);
        } else {
          response = await api.post("/api/locations/neighborhoods", neighborhoodData);
        }
        fetchNeighborhoods();
        break;
      }
        
      case "streets":
        if (editMode) {
          response = await api.put(`/api/locations/streets/${currentItemId}`, streetForm);
          fetchStreets();
        } else {
          response = await api.post("/api/locations/streets", streetForm);
          void response;
          fetchStreets();
        }
        break;
      
      
        
      default:
        break;
      
    }
    
    setSuccess(editMode ? "Kayıt başarıyla güncellendi." : "Kayıt başarıyla eklendi.");
    resetForm();
  } catch (err) {
    console.error("Submit hatası:", err); // Debug için
    setError(`${editMode ? "Güncelleme" : "Ekleme"} işlemi sırasında bir hata oluştu: ` + 
      (err.response?.data?.error || err.message));
  } finally {
    setLoading(false);
  }
};

  // Form alanlarının değişiklik işlemleri
  const handleRegionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRegionForm({
      ...regionForm,
      [name]: type === "checkbox" ? checked : value
    });
  };
  
  const handleDistrictChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDistrictForm({
      ...districtForm,
      [name]: type === "checkbox" ? checked : value
    });
  };
  
  const handleNeighborhoodChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNeighborhoodForm({
      ...neighborhoodForm,
      [name]: type === "checkbox" ? checked : value
    });
  };
  
  const handleStreetChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStreetForm({
      ...streetForm,
      [name]: type === "checkbox" ? checked : value
    });
  };

// Hiyerarşik olarak alt öğeleri de güncelleme
const updateChildLocations = async (parentType, parentId, isActive) => {
    try {
      if (parentType === "region") {
        // İlçeleri güncelle
        const affectedDistricts = districts.filter(d => d.region_id === parentId);
        for (const district of affectedDistricts) {
          await api.put(`/api/locations/districts/${district.id}`, {
            name: district.name || "Bilinmeyen İlçe", // İsim kontrolü ekledik
            region_id: district.region_id,
            is_active: isActive ? 1 : 0
          });
          
          // Mahalleleri güncelle
          const affectedNeighborhoods = neighborhoods.filter(n => n.district_id === district.id);
          for (const neighborhood of affectedNeighborhoods) {
            if (!neighborhood.name || !neighborhood.district_id) {
              console.error("Mahalle güncellemesi hata: Eksik veri", neighborhood);
              continue; // Eksik veri durumunda bu öğeyi atla
            }
            
            await api.put(`/api/locations/neighborhoods/${neighborhood.id}`, {
              name: neighborhood.name,
              district_id: String(neighborhood.district_id), // ID'yi string'e çeviriyoruz
              minimum_order_amount: neighborhood.minimum_order_amount || 0, //mahalle min tutar
              is_active: isActive ? 1 : 0
            });
            
            // Sokakları güncelle
            const affectedStreets = streets.filter(s => s.neighborhood_id === neighborhood.id);
            for (const street of affectedStreets) {
              if (!street.name || !street.neighborhood_id) {
                console.error("Sokak güncellemesi hata: Eksik veri", street);
                continue; // Eksik veri durumunda bu öğeyi atla
              }
              
              await api.put(`/api/locations/streets/${street.id}`, {
                name: street.name,
                neighborhood_id: String(street.neighborhood_id), // ID'yi string'e çeviriyoruz
                is_active: isActive ? 1 : 0
              });
            }
          }
        }
        
        // Verileri yeniden yükle
        await Promise.all([
          fetchDistricts(),
          fetchNeighborhoods(),
          fetchStreets()
        ]);
      } 
      else if (parentType === "district") {
        // Mahalleleri güncelle
        const affectedNeighborhoods = neighborhoods.filter(n => n.district_id === parentId);
        for (const neighborhood of affectedNeighborhoods) {
          if (!neighborhood.name || !neighborhood.district_id) {
            console.error("Mahalle güncellemesi hata: Eksik veri", neighborhood);
            continue; // Eksik veri durumunda bu öğeyi atla
          }
          
          await api.put(`/api/locations/neighborhoods/${neighborhood.id}`, {
            name: neighborhood.name,
            district_id: String(neighborhood.district_id), // ID'yi string'e çeviriyoruz
            minimum_order_amount: neighborhood.minimum_order_amount || 0,  // mahalle min tutar için
            is_active: isActive ? 1 : 0
          });
          
          // Sokakları güncelle
          const affectedStreets = streets.filter(s => s.neighborhood_id === neighborhood.id);
          for (const street of affectedStreets) {
            if (!street.name || !street.neighborhood_id) {
              console.error("Sokak güncellemesi hata: Eksik veri", street);
              continue; // Eksik veri durumunda bu öğeyi atla
            }
            
            await api.put(`/api/locations/streets/${street.id}`, {
              name: street.name,
              neighborhood_id: String(street.neighborhood_id), // ID'yi string'e çeviriyoruz
              is_active: isActive ? 1 : 0
            });
          }
        }
        
        // Verileri yeniden yükle
        await Promise.all([
          fetchNeighborhoods(),
          fetchStreets()
        ]);
      } 
      else if (parentType === "neighborhood") {
        // Sokakları güncelle
        const affectedStreets = streets.filter(s => s.neighborhood_id === parentId);
        for (const street of affectedStreets) {
          if (!street.name || !street.neighborhood_id) {
            console.error("Sokak güncellemesi hata: Eksik veri", street);
            continue; // Eksik veri durumunda bu öğeyi atla
          }
          
          await api.put(`/api/locations/streets/${street.id}`, {
            name: street.name,
            neighborhood_id: String(street.neighborhood_id), // ID'yi string'e çeviriyoruz
            is_active: isActive ? 1 : 0
          });
        }
        
        // Sokakları yeniden yükle
        await fetchStreets();
      }
      
      setSuccess("Alt bölgeler başarıyla güncellendi.");
      return true;
    } catch (err) {
      console.error("Alt bölgeler güncellenirken hata:", err);
      setError("Alt bölgeler güncellenirken bir hata oluştu: " + (err.response?.data?.error || err.message));
      return false;
    }
  };
  
  // Durum değiştirme (aktif/pasif)
  const handleSwitchChange = async (id, checked) => {
    setLoading(true);
    setError("");
    
    try {
      let currentItem, updatedData;
      
      switch (activeTab) {
        case "regions":
          currentItem = regions.find(r => r.id === id);
          if (!currentItem) throw new Error("Bölge bulunamadı");
          
          updatedData = { 
            name: currentItem.name || "Bilinmeyen Bölge", // İsim kontrolü ekledik
            is_active: checked ? 1 : 0 
          };
          
          await api.put(`/api/locations/regions/${id}`, updatedData);
          
          // State'i güncelle
          setRegions(regions.map(region => region.id === id ? { ...region, is_active: checked ? 1 : 0 } : region));
          
          // Alt öğeleri güncelle
          await updateChildLocations("region", id, checked);
          break;
          
        case "districts":
          currentItem = districts.find(d => d.id === id);
          if (!currentItem) throw new Error("İlçe bulunamadı");
          
          updatedData = { 
            name: currentItem.name || "Bilinmeyen İlçe", // İsim kontrolü ekledik
            region_id: String(currentItem.region_id), // ID'yi string'e çeviriyoruz 
            is_active: checked ? 1 : 0 
          };
          
          await api.put(`/api/locations/districts/${id}`, updatedData);
          
          // State'i güncelle
          setDistricts(districts.map(district => district.id === id ? { ...district, is_active: checked ? 1 : 0 } : district));
          
          // Alt öğeleri güncelle
          await updateChildLocations("district", id, checked);
          break;
          
        case "neighborhoods":
          currentItem = neighborhoods.find(n => n.id === id);
          if (!currentItem) throw new Error("Mahalle bulunamadı");
          if (!currentItem.name || !currentItem.district_id) throw new Error("Mahalle adı ve ilçe ID'si zorunludur");
          
          updatedData = { 
            name: currentItem.name,
            district_id: String(currentItem.district_id), // ID'yi string'e çeviriyoruz
            minimum_order_amount: currentItem.minimum_order_amount || 0, // mahalleye min sipariş tutarı eklemek için
            is_active: checked ? 1 : 0 
          };
          
          await api.put(`/api/locations/neighborhoods/${id}`, updatedData);
          
          // State'i güncelle
          setNeighborhoods(neighborhoods.map(neighborhood => 
            neighborhood.id === id ? { ...neighborhood, is_active: checked ? 1 : 0 } : neighborhood));
          
          // Alt öğeleri güncelle
          await updateChildLocations("neighborhood", id, checked);
          break;
          
        case "streets":
          currentItem = streets.find(s => s.id === id);
          if (!currentItem) throw new Error("Sokak bulunamadı");
          if (!currentItem.name || !currentItem.neighborhood_id) throw new Error("Sokak adı ve mahalle ID'si zorunludur");
          
          updatedData = { 
            name: currentItem.name,
            neighborhood_id: String(currentItem.neighborhood_id), // ID'yi string'e çeviriyoruz
            is_active: checked ? 1 : 0 
          };
          
          await api.put(`/api/locations/streets/${id}`, updatedData);
          
          // State'i güncelle
          setStreets(streets.map(street => street.id === id ? { ...street, is_active: checked ? 1 : 0 } : street));
          break;
          
        default:
          break;
      }
      
      setSuccess("Durum başarıyla güncellendi.");
    } catch (err) {
      setError("Durum güncellenirken bir hata oluştu: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Aktif durum kontrolü - Üst öğelerin inaktif olması durumunda çalışmama kontrolü
  const isParentActive = (type, parentId) => {
    switch (type) {
      case "district":{
        const parentRegion = regions.find(r => r.id === parentId);
        return parentRegion && (parentRegion.is_active === 1 || parentRegion.is_active === true);
      }
      case "neighborhood":{
        const parentDistrict = districts.find(d => d.id === parentId);
        if (!parentDistrict) return false;
        
        const regionOfDistrict = regions.find(r => r.id === parentDistrict.region_id);
        return (parentDistrict.is_active === 1 || parentDistrict.is_active === true) && 
               regionOfDistrict && (regionOfDistrict.is_active === 1 || regionOfDistrict.is_active === true);
      }
      case "street":{
        const parentNeighborhood = neighborhoods.find(n => n.id === parentId);
        if (!parentNeighborhood) return false;
        
        const districtOfNeighborhood = districts.find(d => d.id === parentNeighborhood.district_id);
        if (!districtOfNeighborhood) return false;
        
        const regionOfNeighborhoodDistrict = regions.find(r => r.id === districtOfNeighborhood.region_id);
        
        return (parentNeighborhood.is_active === 1 || parentNeighborhood.is_active === true) && 
               (districtOfNeighborhood.is_active === 1 || districtOfNeighborhood.is_active === true) && 
               regionOfNeighborhoodDistrict && 
               (regionOfNeighborhoodDistrict.is_active === 1 || regionOfNeighborhoodDistrict.is_active === true);
      }
      default:
        return true;
    }
    
  };

  // İlgili ilçe ve mahalle adlarını bulmak için yardımcı fonksiyonlar
  const getRegionName = (regionId) => {
    const region = regions.find(r => r.id === parseInt(regionId));
    return region ? region.name : "Bilinmeyen Bölge";
  };
  
  const getDistrictName = (districtId) => {
    const district = districts.find(d => d.id === parseInt(districtId));
    return district ? district.name : "Bilinmeyen İlçe";
  };
  
  const getNeighborhoodName = (neighborhoodId) => {
    const neighborhood = neighborhoods.find(n => n.id === parseInt(neighborhoodId));
    return neighborhood ? neighborhood.name : "Bilinmeyen Mahalle";
  };

  // UI yardımcı fonksiyonları
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Adres Ayarları Sekmesi için Bileşen
const AddressSettingsTab = () => {
  const [isDescriptionEnabled, setIsDescriptionEnabled] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(null);
  const [settingsSuccess, setSettingsSuccess] = useState(null); // Kendi başarı state'i

  useEffect(() => {
    const fetchSettings = async () => {
      setSettingsLoading(true);
      setSettingsError(null);
      try {
        const response = await api.get("/api/settings/general");
        if (response.data && response.data.status === 'success' && response.data.data) {
          setIsDescriptionEnabled(response.data.data.address_description_enabled);
        } else {
          throw new Error("API'den beklenen formatta ayar verisi gelmedi.");
        }
      } catch (err) {
        setSettingsError("Adres ayarları alınamadı: " + (err.response?.data?.error || err.message));
        console.error("Ayar alınırken hata oluştu:", err);
        setIsDescriptionEnabled(false);
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleDescriptionSettingChange = async (checked) => {
    const originalValue = isDescriptionEnabled;
    setIsDescriptionEnabled(checked);
    setSettingsSuccess(null); // Kendi state'lerini temizle
    setSettingsError(null);   // Kendi state'lerini temizle

    try {
      const response = await api.put("/api/settings/general", { 
        address_description_enabled: checked 
      });
      
      if (response.data.status === 'success') {
        setSettingsSuccess(`Adres Tarifi özelliği başarıyla ${checked ? 'AÇILDI' : 'KAPATILDI'}.`);
      } else {
        throw new Error(response.data.message || 'Bilinmeyen bir hata oluştu.');
      }
    } catch (err) {
      setIsDescriptionEnabled(originalValue);
      setSettingsError("Ayar güncellenirken bir sorun oluştu: " + (err.response?.data?.error || err.message));
    }
  };

  if (settingsLoading) {
    return <div className="loading">Ayarlar Yükleniyor...</div>;
  }

  return (
    <div className="settings-container">
      <h2 className="settings-title">Adres Ayarları</h2>
      {settingsSuccess && <div className="success">{settingsSuccess}</div>}
      {settingsError && <div className="error">{settingsError}</div>}
      <div className="settings-card">
        <div className="setting-item">
          <div className="setting-info">
            <h4>Adres Tarifi Özelliği</h4>
            <p className="setting-description">
              Bu ayar aktif edildiğinde, kullanıcılar adres eklerken kurye için bir tarif alanı görürler.
            </p>
          </div>
          <Switch
            checked={isDescriptionEnabled}
            onChange={handleDescriptionSettingChange}
          />
        </div>
      </div>
    </div>
  );
};
  if (!admin) return null;

  return (
    <div className="admin-orders">
      <header className="header">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <svg
            width="24px"
            height="24px"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={isSidebarOpen ? "menu-icon-open" : "menu-icon-closed"}
          >
            <path
              className="line1"
              d="M4 6H20"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              className="line2"
              d="M4 12H14"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              className="line3"
              d="M4 18H9"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="header-title">Bölge Yönetimi</h1>
      </header>

      <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Admin</h2>
          <button className="close-sidebar" onClick={toggleSidebar}>
            ✕
          </button>
        </div>
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      </aside>

      <main
        className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      >
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === "regions" ? "active" : ""}`} 
            onClick={() => setActiveTab("regions")}
          >
            Bölgeler
          </button>
          <button 
            className={`tab-button ${activeTab === "districts" ? "active" : ""}`} 
            onClick={() => setActiveTab("districts")}
          >
            İlçeler
          </button>
          <button 
            className={`tab-button ${activeTab === "neighborhoods" ? "active" : ""}`} 
            onClick={() => setActiveTab("neighborhoods")}
          >
            Mahalleler
          </button>
          <button 
            className={`tab-button ${activeTab === "streets" ? "active" : ""}`} 
            onClick={() => setActiveTab("streets")}
          >
            Sokaklar
          </button>
          <button 
            className={`tab-button ${activeTab === "addressSettings" ? "active" : ""}`} 
            onClick={() => setActiveTab("addressSettings")}
          >
            Adres Ayarları
          </button>
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        
        <div className="action-buttons">
          {activeTab !== 'addressSettings' && (
            <button className="add-btn" onClick={() => setShowForm(!showForm)}>
              <FaPlus /> {showForm ? "Formu Kapat" : "Yeni Ekle"}
            </button>
          )}
        </div>
        
        {showForm && activeTab !== 'addressSettings' && (
          <div className="form-container">
            <h3>{editMode ? "Kaydı Düzenle" : "Yeni Kayıt Ekle"}</h3>
            
            {activeTab === "regions" && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Bölge Adı</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={regionForm.name}
                    onChange={handleRegionChange}
                    required
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="is_active">Durum</label>
                  <div className="switch-container">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={regionForm.is_active}
                      onChange={handleRegionChange}
                    />
                    <label htmlFor="is_active">
                      {regionForm.is_active ? "Aktif" : "Pasif"}
                    </label>
                  </div>
                </div>
                
                <div className="form-buttons">
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "İşleniyor..." : (editMode ? "Güncelle" : "Ekle")}
                  </button>
                  <button type="button" className="cancel-btn" onClick={resetForm}>
                    İptal
                  </button>
                </div>
              </form>
            )}
            
            {activeTab === "districts" && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">İlçe Adı</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={districtForm.name}
                    onChange={handleDistrictChange}
                    required
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="region_id">Bölge</label>
                  <select
                    id="region_id"
                    name="region_id"
                    value={districtForm.region_id}
                    onChange={handleDistrictChange}
                    required
                    className="form-control"
                  >
                    <option value="">Bölge Seçin</option>
                    {regions.map(region => (
                      <option key={region.id} value={region.id} disabled={!(region.is_active === 1 || region.is_active === true)}>
                        {region.name} {!(region.is_active === 1 || region.is_active === true) && "(Pasif)"}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="is_active">Durum</label>
                  <div className="switch-container">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={districtForm.is_active}
                      onChange={handleDistrictChange}
                      disabled={districtForm.region_id && !isParentActive("district", parseInt(districtForm.region_id))}
                    />
                    <label htmlFor="is_active">
                      {districtForm.is_active ? "Aktif" : "Pasif"}
                      {districtForm.region_id && !isParentActive("district", parseInt(districtForm.region_id)) && " (Bölge Pasif)"}
                    </label>
                  </div>
                </div>
                
                <div className="form-buttons">
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "İşleniyor..." : (editMode ? "Güncelle" : "Ekle")}
                  </button>
                  <button type="button" className="cancel-btn" onClick={resetForm}>
                    İptal
                  </button>
                </div>
              </form>
            )}
            
            {activeTab === "neighborhoods" && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Mahalle Adı</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={neighborhoodForm.name}
                    onChange={handleNeighborhoodChange}
                    required
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="district_id">İlçe</label>
                  <select
                    id="district_id"
                    name="district_id"
                    value={neighborhoodForm.district_id}
                    onChange={handleNeighborhoodChange}
                    required
                    className="form-control"
                  >
                    <option value="">İlçe Seçin</option>
                    {districts.map(district => (
                      <option 
                        key={district.id} 
                        value={district.id}
                        disabled={!(district.is_active === 1 || district.is_active === true) || 
                            !isParentActive("district", district.region_id)}
                 >
                   {district.name} ({getRegionName(district.region_id)})
                   {(!(district.is_active === 1 || district.is_active === true) || 
                    !isParentActive("district", district.region_id)) && " (Pasif)"}
                 </option>
               ))}
             </select>
           </div>

                {/* YENİ ALAN - Minimum Sipariş Tutarı */}
            <div className="form-group">
              <label htmlFor="minimum_order_amount">Minimum Sipariş Tutarı (₺)</label>
                <input
                 type="number"
                 id="minimum_order_amount"
                 name="minimum_order_amount"
                 value={neighborhoodForm.minimum_order_amount}
                 onChange={handleNeighborhoodChange}
                 min="0"
                 step="0.01"
                 className="form-control"
                 placeholder="0.00"
              />
             <small className="form-text">Bu mahalle için minimum sipariş tutarını belirleyin.</small>
           </div>
           
           <div className="form-group">
             <label htmlFor="is_active">Durum</label>
             <div className="switch-container">
               <input
                 type="checkbox"
                 id="is_active"
                 name="is_active"
                 checked={neighborhoodForm.is_active}
                 onChange={handleNeighborhoodChange}
                 disabled={neighborhoodForm.district_id && 
                          !isParentActive("neighborhood", parseInt(neighborhoodForm.district_id))}
               />
               <label htmlFor="is_active">
                 {neighborhoodForm.is_active ? "Aktif" : "Pasif"}
                 {neighborhoodForm.district_id && 
                  !isParentActive("neighborhood", parseInt(neighborhoodForm.district_id)) && 
                  " (Üst Bölge Pasif)"}
               </label>
             </div>
           </div>
           
           <div className="form-buttons">
             <button type="submit" className="submit-btn" disabled={loading}>
               {loading ? "İşleniyor..." : (editMode ? "Güncelle" : "Ekle")}
             </button>
             <button type="button" className="cancel-btn" onClick={resetForm}>
               İptal
             </button>
           </div>
         </form>
       )}
       
       {activeTab === "streets" && (
         <form onSubmit={handleSubmit}>
           <div className="form-group">
             <label htmlFor="name">Sokak Adı</label>
             <input
               type="text"
               id="name"
               name="name"
               value={streetForm.name}
               onChange={handleStreetChange}
               required
               className="form-control"
             />
           </div>
           
           <div className="form-group">
             <label htmlFor="neighborhood_id">Mahalle</label>
             <select
               id="neighborhood_id"
               name="neighborhood_id"
               value={streetForm.neighborhood_id}
               onChange={handleStreetChange}
               required
               className="form-control"
             >
               <option value="">Mahalle Seçin</option>
               {neighborhoods.map(neighborhood => (
                 <option 
                   key={neighborhood.id} 
                   value={neighborhood.id}
                   disabled={!(neighborhood.is_active === 1 || neighborhood.is_active === true) ||
                            !isParentActive("street", neighborhood.id)}
                 >
                   {neighborhood.name} ({getDistrictName(neighborhood.district_id)})
                   {(!(neighborhood.is_active === 1 || neighborhood.is_active === true) ||
                    !isParentActive("street", neighborhood.id)) && " (Pasif)"}
                 </option>
               ))}
             </select>
           </div>
           
           <div className="form-group">
             <label htmlFor="is_active">Durum</label>
             <div className="switch-container">
               <input
                 type="checkbox"
                 id="is_active"
                 name="is_active"
                 checked={streetForm.is_active}
                 onChange={handleStreetChange}
                 disabled={streetForm.neighborhood_id && 
                          !isParentActive("street", parseInt(streetForm.neighborhood_id))}
               />
               <label htmlFor="is_active">
                 {streetForm.is_active ? "Aktif" : "Pasif"}
                 {streetForm.neighborhood_id && 
                  !isParentActive("street", parseInt(streetForm.neighborhood_id)) && 
                  " (Üst Bölge Pasif)"}
               </label>
             </div>
           </div>
           
           <div className="form-buttons">
             <button type="submit" className="submit-btn" disabled={loading}>
               {loading ? "İşleniyor..." : (editMode ? "Güncelle" : "Ekle")}
             </button>
             <button type="button" className="cancel-btn" onClick={resetForm}>
               İptal
             </button>
           </div>
         </form>
       )}
     </div>
   )}
   
   {loading && <div className="loading">Yükleniyor...</div>}
   
   {activeTab === "regions" && (
     <div className="table-container">
       <table className="data-table">
         <thead>
           <tr>
             <th>ID</th>
             <th>Bölge Adı</th>
             <th>Durum</th>
             <th>İşlemler</th>
           </tr>
         </thead>
         <tbody>
           {regions.length > 0 ? (
             regions.map(region => (
               <tr key={region.id} className={region.is_active ? "" : "inactive-row"}>
                 <td>{region.id}</td>
                 <td>{region.name}</td>
                 <td className={region.is_active ? "status-active" : "status-inactive"}>
                   {region.is_active ? "Aktif" : "Pasif"}
                 </td>
                 <td>
                   <div className="action-buttons">
                     <button 
                       className="edit-btn" 
                       onClick={() => handleEdit(region.id)}
                       title="Düzenle"
                     >
                       <FaEdit />
                     </button>
                     <button 
                       className="delete-btn" 
                       onClick={() => handleDelete(region.id)}
                       title="Sil"
                     >
                       <FaTrash />
                     </button>
                     <Switch
                       checked={region.is_active === 1 || region.is_active === true}
                       onChange={(checked) => handleSwitchChange(region.id, checked)}
                       offColor="#888"
                       onColor="#0f0"
                       offHandleColor="#fff"
                       onHandleColor="#fff"
                       height={20}
                       width={40}
                     />
                   </div>
                 </td>
               </tr>
             ))
           ) : (
             <tr>
               <td colSpan="4" className="no-data">Henüz bölge kaydı bulunmamaktadır.</td>
             </tr>
           )}
         </tbody>
       </table>
     </div>
   )}
   
   {activeTab === "districts" && (
     <div className="table-container">
       <table className="data-table">
         <thead>
           <tr>
             <th>ID</th>
             <th>İlçe Adı</th>
             <th>Bölge</th>
             <th>Durum</th>
             <th>İşlemler</th>
           </tr>
         </thead>
         <tbody>
           {districts.length > 0 ? (
             districts.map(district => {
               const regionActive = isParentActive("district", district.region_id);
               const isDisabled = !regionActive;
               
               return (
                 <tr key={district.id} className={district.is_active && regionActive ? "" : "inactive-row"}>
                   <td>{district.id}</td>
                   <td>{district.name}</td>
                   <td>
                     {district.region_name || getRegionName(district.region_id)}
                     {!regionActive && " (Pasif)"}
                   </td>
                   <td className={district.is_active && regionActive ? "status-active" : "status-inactive"}>
                     {district.is_active ? (regionActive ? "Aktif" : "Pasif (Bölge Pasif)") : "Pasif"}
                   </td>
                   <td>
                     <div className="action-buttons">
                       <button 
                         className="edit-btn" 
                         onClick={() => handleEdit(district.id)}
                         title="Düzenle"
                       >
                         <FaEdit />
                       </button>
                       <button 
                         className="delete-btn" 
                         onClick={() => handleDelete(district.id)}
                         title="Sil"
                       >
                         <FaTrash />
                       </button>
                       <Switch
                         checked={district.is_active === 1 || district.is_active === true}
                         onChange={(checked) => handleSwitchChange(district.id, checked)}
                         offColor="#888"
                         onColor="#0f0"
                         offHandleColor="#fff"
                         onHandleColor="#fff"
                         height={20}
                         width={40}
                         disabled={isDisabled}
                       />
                     </div>
                   </td>
                 </tr>
               );
             })
           ) : (
             <tr>
               <td colSpan="5" className="no-data">Henüz ilçe kaydı bulunmamaktadır.</td>
             </tr>
           )}
         </tbody>
       </table>
     </div>
   )}
   
   {activeTab === "neighborhoods" && (
     <div className="table-container">
       <table className="data-table">
         <thead>
           <tr>
             <th>ID</th>
             <th>Mahalle Adı</th>
             <th>İlçe</th>
             <th>Min. Sipariş (₺)</th>  {/* YENİ KOLON min sipariş tutarı için */}
             <th>Durum</th>
             <th>İşlemler</th>
           </tr>
         </thead>
         <tbody>
           {neighborhoods.length > 0 ? (
             neighborhoods.map(neighborhood => {
               const parentActive = isParentActive("neighborhood", neighborhood.district_id);
               const isDisabled = !parentActive;
               
               return (
                 <tr key={neighborhood.id} className={neighborhood.is_active && parentActive ? "" : "inactive-row"}>
                   <td>{neighborhood.id}</td>
                   <td>{neighborhood.name}</td>
                   <td>
                     {neighborhood.district_name || getDistrictName(neighborhood.district_id)}
                     {!parentActive && " (Pasif)"}
                   </td>
                   <td>{neighborhood.minimum_order_amount ? `₺${parseFloat(neighborhood.minimum_order_amount).toFixed(2)}` : '₺0.00'}</td>  {/* YENİ VERİ min sipariş tutarı için */}
                   <td className={neighborhood.is_active && parentActive ? "status-active" : "status-inactive"}>
                     {neighborhood.is_active ? (parentActive ? "Aktif" : "Pasif (Üst Bölge Pasif)") : "Pasif"}
                   </td>
                   <td>
                     <div className="action-buttons">
                       <button 
                         className="edit-btn" 
                         onClick={() => handleEdit(neighborhood.id)}
                         title="Düzenle"
                       >
                         <FaEdit />
                       </button>
                       <button 
                         className="delete-btn" 
                         onClick={() => handleDelete(neighborhood.id)}
                         title="Sil"
                       >
                         <FaTrash />
                       </button>
                       <Switch
                         checked={neighborhood.is_active === 1 || neighborhood.is_active === true}
                         onChange={(checked) => handleSwitchChange(neighborhood.id, checked)}
                         offColor="#888"
                         onColor="#0f0"
                         offHandleColor="#fff"
                         onHandleColor="#fff"
                         height={20}
                         width={40}
                         disabled={isDisabled}
                       />
                     </div>
                   </td>
                 </tr>
               );
             })
           ) : (
             <tr>
               <td colSpan="6" className="no-data">Henüz mahalle kaydı bulunmamaktadır.</td>
             </tr>
           )}
         </tbody>
       </table>
     </div>
   )}
   
   {activeTab === "addressSettings" && (
      <AddressSettingsTab />
   )}

   {activeTab === "streets" && (
     <div className="table-container">
       <table className="data-table">
         <thead>
           <tr>
             <th>ID</th>
             <th>Sokak Adı</th>
             <th>Mahalle</th>
             <th>Durum</th>
             <th>İşlemler</th>
           </tr>
         </thead>
         <tbody>
           {streets.length > 0 ? (
             streets.map(street => {
               const parentActive = isParentActive("street", street.neighborhood_id);
               const isDisabled = !parentActive;
               
               return (
                 <tr key={street.id} className={street.is_active && parentActive ? "" : "inactive-row"}>
                   <td>{street.id}</td>
                   <td>{street.name}</td>
                   <td>
                     {street.neighborhood_name || getNeighborhoodName(street.neighborhood_id)}
                     {!parentActive && " (Pasif)"}
                   </td>
                   <td className={street.is_active && parentActive ? "status-active" : "status-inactive"}>
                     {street.is_active ? (parentActive ? "Aktif" : "Pasif (Üst Bölge Pasif)") : "Pasif"}
                   </td>
                   <td>
                     <div className="action-buttons">
                       <button 
                         className="edit-btn" 
                         onClick={() => handleEdit(street.id)}
                         title="Düzenle"
                       >
                         <FaEdit />
                       </button>
                       <button 
                         className="delete-btn" 
                         onClick={() => handleDelete(street.id)}
                         title="Sil"
                       >
                         <FaTrash />
                       </button>
                       <Switch
                         checked={street.is_active === 1 || street.is_active === true}
                         onChange={(checked) => handleSwitchChange(street.id, checked)}
                         offColor="#888"
                         onColor="#0f0"
                         offHandleColor="#fff"
                         onHandleColor="#fff"
                         height={20}
                         width={40}
                         disabled={isDisabled}
                       />
                     </div>
                   </td>
                 </tr>
               );
             })
           ) : (
             <tr>
               <td colSpan="5" className="no-data">Henüz sokak kaydı bulunmamaktadır.</td>
             </tr>
           )}
         </tbody>
       </table>
     </div>
   )}
 </main>
</div>
);
};

export default AdminLocations;