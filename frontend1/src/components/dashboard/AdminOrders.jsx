import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import AdminOrderDetails from "./AdminOrderDetails";
import StatusUpdateModal from "./StatusUpdateModal";
import {
  FaEdit,
  FaTrash,
  FaPrint,
  FaSyncAlt
} from "react-icons/fa";
import Sidebar from "./SideBar";
import "./Orders.css";

const AdminOrders = () => {
  const { admin, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(searchParams.get("page")) || 1;
  });
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const ordersPerPage = 10;

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

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/orders/all");
        console.log("Orders Response:", response.data);
        setOrders(response.data.data || []);
        setFilteredOrders(response.data.data || []);
      } catch (err) {
        console.error("Fetch Orders Error:", err);
        setError(err.response?.data?.error || "Siparişler getirilemedi.");
      } finally {
        setLoading(false);
      }
    };
    if (admin) {
      fetchOrders();
    }
  }, [admin]);

  useEffect(() => {
    let filtered = [...orders];
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.id.toString().includes(searchTerm) ||
          (order.user_full_name && order.user_full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (order.user_id && order.user_id.toString().includes(searchTerm))
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.order_status === statusFilter
      );
    }
    setFilteredOrders(filtered);

    const pageFromUrl = parseInt(searchParams.get("page")) || 1;
    if (
      filtered.length > 0 &&
      pageFromUrl > Math.ceil(filtered.length / ordersPerPage)
    ) {
      setCurrentPage(1);
      setSearchParams({ page: "1" });
    } else if (searchTerm || statusFilter !== "all") {
      setCurrentPage(1);
      setSearchParams({ page: "1" });
    } else {
      setCurrentPage(pageFromUrl);
    }
  }, [searchTerm, statusFilter, orders, searchParams, setSearchParams]);

  useEffect(() => {
    if (parseInt(searchParams.get("page")) !== currentPage) {
      setSearchParams({ page: currentPage.toString() });
    }
  }, [currentPage, searchParams, setSearchParams]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(
    indexOfFirstOrder,
    indexOfLastOrder
  );
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleDelete = async (orderId) => {
    if (window.confirm("Bu siparişi silmek istediğinizden emin misiniz?")) {
      try {
        await api.delete(`/api/orders/${orderId}`);
        setOrders(orders.filter((order) => order.id !== orderId));
        setIsEditPanelOpen(false);
      } catch (err) {
        setError(
          err.response?.data?.error || "Sipariş silinirken bir hata oluştu."
        );
      }
    }
  };

  const handleEditClick = (order) => {
    setSelectedOrder(order);
    setIsEditPanelOpen(true);
  };

  const handleCloseEditPanel = () => {
    setIsEditPanelOpen(false);
    setTimeout(() => setSelectedOrder(null), 500);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenStatusModal = () => {
    setIsStatusModalOpen(true);
  };

  const handleCloseStatusModal = () => {
    setIsStatusModalOpen(false);
  };

  const handleStatusUpdate = (newStatus) => {
    setOrders(orders.map(order => 
      order.id === selectedOrder.id 
        ? {...order, order_status: newStatus} 
        : order
    ));
    
    setSelectedOrder({...selectedOrder, order_status: newStatus});
  };

  const translatePaymentType = (type) => {
    const translations = {
      'cash': 'Nakit',
      'credit_card': 'Kredi Kartı'
    };
    return translations[type] || type;
  };

  const translateOrderStatus = (status) => {
    const translations = {
      'pending': 'Beklemede',
      'preparing': 'Hazırlanıyor',
      'on_the_way': 'Yolda',
      'delivered': 'Teslim Edildi',
      'cancelled': 'İptal Edildi'
    };
    return translations[status] || status;
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
        <h1 className="header-title">Sipariş Yönetimi</h1>
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
        className={`main-content ${
          isSidebarOpen ? "sidebar-open" : "sidebar-closed"
        }`}
      >
        <section className="orders-section">
          <div className="filters">
            <input
              type="text"
              placeholder="Sipariş ID, Üye Adı veya Kullanıcı ID ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-bar"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Beklemede</option>
              <option value="preparing">Hazırlanıyor</option>
              <option value="on_the_way">Yolda</option>
              <option value="delivered">Teslim Edildi</option>
              <option value="cancelled">İptal Edildi</option>
            </select>
          </div>

          {loading && <p className="loading">Yükleniyor...</p>}
          {error && <p className="error">{error}</p>}
          {filteredOrders.length === 0 && !loading && !error && (
            <p className="no-data">Sipariş bulunamadı.</p>
          )}
          {filteredOrders.length > 0 && (
            <>
              <div className="table-wrapper">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Sipariş ID</th>
                      <th>Üye Adı</th>
                      <th>Ödeme Türü</th>
                      <th>Toplam Tutar</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>
                        {order.user_full_name || 
   (order.user_id ? `Kullanıcı #${order.user_id}` : "Misafir")}
                        </td>
                        <td>
                          <span className={`payment-badge payment-${order.payment_type}`}>
                            {translatePaymentType(order.payment_type)}
                          </span>
                        </td>
                        <td>{parseFloat(order.total_amount).toFixed(2)} TL</td>
                        <td>
                          <span className={`status-badge status-${order.order_status}`}>
                            {translateOrderStatus(order.order_status)}
                          </span>
                        </td>
                        <td>{new Date(order.order_time).toLocaleString()}</td>
                        <td>
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEditClick(order)}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(order.id)}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div
                className="pagination"
                style={{ marginTop: "20px", textAlign: "center" }}
              >
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="action-btn"
                  style={{ margin: "0 10px" }}
                >
                  Önceki
                </button>
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => handlePageClick(index + 1)}
                    className={`action-btn ${
                      currentPage === index + 1 ? "edit-btn" : ""
                    }`}
                    style={{ margin: "0 5px" }}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="action-btn"
                  style={{ margin: "0 10px" }}
                >
                  Sonraki
                </button>
              </div>
            </>
          )}
        </section>

        {selectedOrder && (
          <div className={`edit-panel ${isEditPanelOpen ? "open" : "closed"}`}>
            <div className="edit-panel-header">
              <h2>Sipariş Detay #{selectedOrder.id}</h2>
              <button
                className="close-edit-panel"
                onClick={handleCloseEditPanel}
              >
                ✕
              </button>
            </div>
            
            <AdminOrderDetails order={selectedOrder} />

            <div className="edit-panel-action-bar">
              <button
                className="action-bar-btn print-btn"
                onClick={handlePrint}
              >
                <FaPrint /> Yazdır
              </button>
              <button
                className="action-bar-btn update-status-btn"
                onClick={handleOpenStatusModal}
              >
                <FaSyncAlt /> Durumu Güncelle
              </button>
              <button
                className="action-bar-btn delete-btn"
                onClick={() => handleDelete(selectedOrder.id)}
              >
                <FaTrash /> Sil
              </button>
            </div>
          </div>
        )}

        {isStatusModalOpen && selectedOrder && (
          <StatusUpdateModal
            orderId={selectedOrder.id}
            currentStatus={selectedOrder.order_status}
            onClose={handleCloseStatusModal}
            onUpdate={handleStatusUpdate}
          />
        )}
      </main>
    </div>
  );
};

export default AdminOrders;