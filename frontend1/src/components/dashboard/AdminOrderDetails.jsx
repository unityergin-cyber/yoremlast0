import React, { useState, useEffect } from "react";
import "./OrderDetails.css"; 
import api from "../../services/api";

const AdminOrderDetails = ({ order }) => {
  const [detailedOrder, setDetailedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!order || !order.id) return;
      
      setLoading(true);
      try {
        // Fetch detailed order information from API
        const response = await api.get(`/api/orders/${order.id}`);
        if (response.data && response.data.status === "success") {
          setDetailedOrder(response.data.data);
        } else {
          setError("Sipariş detayları alınamadı.");
        }
      } catch (err) {
        console.error("Sipariş detayları getirme hatası:", err);
        setError(err.response?.data?.error || "Sipariş detayları alınırken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [order]);

  if (loading) {
    return <div className="loading-spinner">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  // If we have detailed data, use it; otherwise fall back to the passed order prop
  const displayOrder = detailedOrder || order;
  
  if (!displayOrder) return <div>Sipariş bulunamadı.</div>;

  return (
    <div className="order-receipt">
      <div className="receipt-header">
        <h3>Sipariş Fişi</h3>
        <p className="receipt-id">Sipariş No: #{displayOrder.id}</p>
      </div>
      
      <div className="receipt-customer-info">
        <div className="info-section">
          <p><strong>Tarih:</strong> {new Date(displayOrder.order_time).toLocaleDateString()}</p>
          <p><strong>Saat:</strong> {new Date(displayOrder.order_time).toLocaleTimeString()}</p>
        </div>
        
        <div className="info-section">
          <p><strong>Müşteri:</strong> {displayOrder.user_full_name || displayOrder.customer_name || (displayOrder.user_type === "guest" ? "Misafir" : "Bilinmiyor")}</p>
          <p><strong>Telefon:</strong> {displayOrder.user_phone || displayOrder.phone || "-"}</p>
        </div>
      </div>
      
      <div className="receipt-address">
        <p><strong>Adres:</strong> {formatAddress(displayOrder)}</p>
      </div>
      
      <div className="receipt-payment">
        <p><strong>Ödeme Tipi:</strong> {translatePaymentType(displayOrder.payment_type)}</p>
        <p><strong>Not:</strong> {displayOrder.note || "-"}</p>
      </div>
      
      <div className="receipt-divider"></div>
      
      <div className="receipt-items">
        <h4>Ürünler</h4>
        
        {displayOrder.order_items && displayOrder.order_items.length > 0 ? (
          <table className="items-table">
            <thead>
              <tr>
                <th>Adet</th>
                <th>Ürün</th>
                <th>Fiyat</th>
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {displayOrder.order_items.map((item, index) => (
                <tr key={index}>
                  <td>{item.quantity}</td>
                  <td>{item.product_name || `Ürün #${item.product_id}`}</td>
                  <td>{item.unit_price} TL</td>
                  <td>{(item.quantity * item.unit_price).toFixed(2)} TL</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-items">Ürün bilgisi bulunamadı.</p>
        )}
      </div>
      
      <div className="receipt-divider"></div>
      
      <div className="receipt-totals">
        <p><strong>Ara Toplam:</strong> {displayOrder.subtotal || displayOrder.total_amount} TL</p>
        {displayOrder.shipping_cost && <p><strong>Kargo Ücreti:</strong> {displayOrder.shipping_cost} TL</p>}
        {displayOrder.discount_amount && <p><strong>İndirim:</strong> {displayOrder.discount_amount} TL</p>}
        <p className="receipt-total"><strong>Genel Toplam:</strong> {displayOrder.total_amount} TL</p>
      </div>
      
      <div className="receipt-status">
        <p><strong>Sipariş Durumu:</strong> <span className={`status-badge status-${displayOrder.order_status}`}>{translateOrderStatus(displayOrder.order_status)}</span></p>
      </div>
    </div>
  );
};

// Helper function to format the address
const formatAddress = (order) => {
  if (order.address) return order.address;
  
  let addressParts = [];
  if (order.street) addressParts.push(order.street);
  if (order.address_detail) addressParts.push(order.address_detail);
  if (order.neighborhood) addressParts.push(order.neighborhood);
  if (order.district) addressParts.push(order.district);
  if (order.city) addressParts.push(order.city);
  
  return addressParts.length > 0 ? addressParts.join(', ') : '-';
};

// Helper function to translate payment types
const translatePaymentType = (paymentType) => {
  const translations = {
    'cash': 'Nakit',
    'credit_card': 'Kredi Kartı'
  };
  return translations[paymentType] || paymentType;
};

// Helper function to translate order statuses
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

export default AdminOrderDetails;