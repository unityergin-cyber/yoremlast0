import React, { useState, useEffect } from "react";
import "./OrderDetails.css";
import api from "../../services/api";

const AdminOrderDetails = ({ order }) => {
  const [detailedOrder, setDetailedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Ürün seçeneklerini formatla (sadece görüntüleme için)
  const formatOptions = (options) => {
    if (!options) return null;

    const raw = typeof options === "string" ? options.trim() : options;
    let parsed = null;

    if (typeof raw === "string" && raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        return null;
      }
    } else if (Array.isArray(raw) || typeof raw === "object") {
      parsed = raw;
    }

    if (!parsed) return null;

    const optionsList = [];
    
    if (Array.isArray(parsed)) {
      parsed.forEach((opt) => {
        if (opt && Array.isArray(opt.values)) {
          opt.values.forEach((val) => {
            if (val?.value || val?.name) {
              const price = val?.price_adjustment ?? val?.priceModifier ?? val?.price_modifier;
              optionsList.push({
                name: val.value || val.name,
                price: price ? parseFloat(price) : 0
              });
            }
          });
        }
      });
    } else if (parsed && typeof parsed === "object") {
      Object.values(parsed).forEach((opt) => {
        if (opt && Array.isArray(opt.values)) {
          opt.values.forEach((val) => {
            if (val?.value || val?.name) {
              const price = val?.price_adjustment ?? val?.priceModifier ?? val?.price_modifier;
              optionsList.push({
                name: val.value || val.name,
                price: price ? parseFloat(price) : 0
              });
            }
          });
        }
      });
    }

    return optionsList.length > 0 ? optionsList : null;
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!order || !order.id) return;

      setLoading(true);
      try {
        const response = await api.get(`/api/orders/${order.id}`);
        if (response.data && response.data.status === "success") {
          setDetailedOrder(response.data.data);
        } else {
          setError("Sipariş detayları alınamadı.");
        }
      } catch (err) {
        console.error("Sipariş detayları getirme hatası:", err);
        setError(
          err.response?.data?.error || "Sipariş detayları alınırken bir hata oluştu."
        );
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

  const displayOrder = detailedOrder || order;

  if (!displayOrder) return <div>Sipariş bulunamadı.</div>;

  // ✅ DÜZELTİLMİŞ: Toplam tutarı hesapla
  // unit_price ZATEN seçenek fiyatlarını içeriyor
  const calculateTotal = () => {
    if (!displayOrder.order_items || displayOrder.order_items.length === 0) {
      return parseFloat(displayOrder.total_amount || 0).toFixed(2);
    }

    // ✅ unit_price zaten seçenek dahil, sadece çarp
    const total = displayOrder.order_items.reduce((sum, item) => {
      const unitPrice = parseFloat(item.unit_price || item.price || 0);
      const qty = item.quantity || 1;
      return sum + (unitPrice * qty);
    }, 0);

    return total.toFixed(2);
  };

  return (
    <div className="order-receipt">
      <div className="receipt-header">
        <h3>Sipariş Fişi</h3>
        <p className="receipt-id">Sipariş No: #{displayOrder.id}</p>
      </div>

      <div className="receipt-customer-info">
        <div className="info-section">
          <p>
            <strong>Tarih:</strong>{" "}
            {new Date(displayOrder.order_time).toLocaleDateString()}
          </p>
          <p>
            <strong>Saat:</strong>{" "}
            {new Date(displayOrder.order_time).toLocaleTimeString()}
          </p>
        </div>

        <div className="info-section">
          <p>
            <strong>Müşteri:</strong>{" "}
            {displayOrder.user_full_name ||
              displayOrder.customer_name ||
              (displayOrder.user_type === "guest" ? "Misafir" : "Bilinmiyor")}
          </p>
          <p>
            <strong>Telefon:</strong>{" "}
            {displayOrder.user_phone || displayOrder.phone || "-"}
          </p>
        </div>
      </div>

      <div className="receipt-address">
        <p>
          <strong>Adres:</strong> {formatAddress(displayOrder)}
        </p>
        {displayOrder.address_description && (
          <p>
            <strong>Adres Tarifi:</strong> {displayOrder.address_description}
          </p>
        )}
      </div>

      <div className="receipt-payment">
        <p>
          <strong>Ödeme Tipi:</strong>{" "}
          {translatePaymentType(displayOrder.payment_type)}
        </p>
        <p>
          <strong>Not:</strong> {displayOrder.note || "-"}
        </p>
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
                <th>Birim Fiyat</th>
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {displayOrder.order_items.map((item, index) => {
                // ✅ unit_price zaten seçenek dahil
                const unitPrice = parseFloat(item.unit_price || item.price || 0);
                const qty = item.quantity || 1;
                const itemTotal = unitPrice * qty;
                const options = formatOptions(item.options);

                return (
                  <React.Fragment key={index}>
                    <tr>
                      <td>{qty}</td>
                      <td>
                        <div>
                          {item.product_name || `Ürün #${item.product_id}`}
                          {options && options.length > 0 && (
                            <div style={{ fontSize: "0.85em", color: "#666", marginTop: "4px" }}>
                              {options.map((opt, i) => (
                                <div key={i}>
                                  + {opt.name}
                                  {opt.price > 0 && (
                                    <span style={{ color: "#FF6B00" }}>
                                      {" "}(+{opt.price.toFixed(2)} TL)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{unitPrice.toFixed(2)} TL</td>
                      <td>{itemTotal.toFixed(2)} TL</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="no-items">Ürün bilgisi bulunamadı.</p>
        )}
      </div>

      <div className="receipt-divider"></div>

      <div className="receipt-totals">
        {displayOrder.shipping_cost && (
          <p>
            <strong>Kargo Ücreti:</strong> {displayOrder.shipping_cost} TL
          </p>
        )}
        {displayOrder.discount_amount && (
          <p>
            <strong>İndirim:</strong> {displayOrder.discount_amount} TL
          </p>
        )}
        <p className="receipt-total">
          <strong>Genel Toplam:</strong> {calculateTotal()} TL
        </p>
      </div>

      <div className="receipt-status">
        <p>
          <strong>Sipariş Durumu:</strong>{" "}
          <span className={`status-badge status-${displayOrder.order_status}`}>
            {translateOrderStatus(displayOrder.order_status)}
          </span>
        </p>
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

  return addressParts.length > 0 ? addressParts.join(", ") : "-";
};

// Helper function to translate payment types
const translatePaymentType = (paymentType) => {
  const translations = {
    cash: "Nakit",
    credit_card: "Kredi Kartı",
  };
  return translations[paymentType] || paymentType;
};

// Helper function to translate order statuses
const translateOrderStatus = (status) => {
  const translations = {
    pending: "Beklemede",
    preparing: "Hazırlanıyor",
    on_the_way: "Yolda",
    delivered: "Teslim Edildi",
    cancelled: "İptal Edildi",
  };
  return translations[status] || status;
};

export default AdminOrderDetails;