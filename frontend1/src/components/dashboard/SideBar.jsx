import React, { useState, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaMapMarkedAlt, FaClock } from "react-icons/fa";
import {
  FaTachometerAlt, 
  FaShoppingCart,
  FaUsers,
  FaCog,
  FaAngleDown,
} from "react-icons/fa";
import { CiLogout } from "react-icons/ci";
import { AuthContext } from "../../context/AuthContext";

const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [isWorkingHoursDropdownOpen, setIsWorkingHoursDropdownOpen] = useState(false);

  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const toggleProductDropdown = () => {
    setIsProductDropdownOpen(!isProductDropdownOpen);
  };
  
  const toggleRegionDropdown = () => {
    setIsRegionDropdownOpen(!isRegionDropdownOpen);
  };
  
  const toggleWorkingHoursDropdown = () => {
    setIsWorkingHoursDropdownOpen(!isWorkingHoursDropdownOpen);
  };



  const handleLogoutClick = (e) => {
    e.preventDefault();
    console.log("Çıkış yapılıyor...");
    logout();
    navigate("/admin/login");
  };

  return (
    <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">Admin</h2>
      </div>

      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <FaTachometerAlt className="menu-icon" />
              <span className="menu-text">Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/orders"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <FaShoppingCart className="menu-icon" />
              <span className="menu-text">Siparişler</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/users"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <FaUsers className="menu-icon" />
              <span className="menu-text">Kullanıcılar</span>
            </NavLink>
          </li>

          <li className="dropdown">
            <div className="dropdown-toggle" onClick={toggleProductDropdown}>
              <FaShoppingCart className="menu-icon" />
              <span className="menu-text">Ürün Yönetimi</span>
              <FaAngleDown className={`dropdown-arrow ${isProductDropdownOpen ? "open" : ""}`} />
            </div>
            <div className={`dropdown-menu-container ${isProductDropdownOpen ? "open" : ""}`}>
              <ul className="dropdown-menu">
                <li>
                  <NavLink
                    to="/admin/sliders"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    <span className="menu-text">Slider Yönetimi</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/products"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    <span className="menu-text">Ürünler</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/categories"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    <span className="menu-text">Kategoriler</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/product-options"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    <span className="menu-text">Ürün Seçenek Yönetimi</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          </li>

          <li className="dropdown">
            <div className="dropdown-toggle" onClick={toggleRegionDropdown}>
              <FaMapMarkedAlt className="menu-icon" />
              <span className="menu-text">Bölge Yönetimi</span>
              <FaAngleDown className={`dropdown-arrow ${isRegionDropdownOpen ? "open" : ""}`} />
            </div>
            <div className={`dropdown-menu-container ${isRegionDropdownOpen ? "open" : ""}`}>
              <ul className="dropdown-menu">
                <li>
                  <NavLink
                    to="/admin/locations"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    <span className="menu-text">Bölge, İlçe, Mahalle ve Sokak Yönetimi</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          </li>
          
          <li className="dropdown">
            <div className="dropdown-toggle" onClick={toggleWorkingHoursDropdown}>
              <FaClock className="menu-icon" />
              <span className="menu-text">Çalışma Saatleri</span>
              <FaAngleDown className={`dropdown-arrow ${isWorkingHoursDropdownOpen ? "open" : ""}`} />
            </div>
            <div className={`dropdown-menu-container ${isWorkingHoursDropdownOpen ? "open" : ""}`}>
              <ul className="dropdown-menu">
                <li>
                  <NavLink
                    to="/admin/working-hours"
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    <span className="menu-text">Restoran Çalışma Saatleri</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          </li>



          <li>
            <button
              onClick={handleLogoutClick}
              style={{ 
                background: "#c0392b", 
                color: "white",
                border: "none", 
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "12px 20px",
                width: "100%",
                textAlign: "left"
              }}
              className="logout-link"
            >
              <CiLogout style={{ fontSize: "20px", fontWeight: "bold", marginRight: "10px" }} />
              <span className="menu-text">Çıkış Yap</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;