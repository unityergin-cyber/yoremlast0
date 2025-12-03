import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../services/api";
import Sidebar from "../Sidebar";
import "../Orders.css";

const AddProduct = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [productData, setProductData] = useState({
    name: "",
    description: "",
    base_price: "",
    category_id: "",
    image: null,
    optionGroups: [], // ✅ YENİ - Hiyerarşik yapı
    ingredients: [],
  });

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ YENİ - Ana seçenek girişi
  const [mainOptionInput, setMainOptionInput] = useState({
    name: "",
    is_required: false,
  });

  // ✅ YENİ - Alt seçenek girişi
  const [subOptionInput, setSubOptionInput] = useState({
    name: "",
    price_modifier: "",
    is_default: false,
  });

  // ✅ YENİ - Hangi gruba alt seçenek ekleniyor?
  const [activeGroupId, setActiveGroupId] = useState(null);

  // ✅ YENİ - Accordion açık/kapalı durumu
  const [expandedGroups, setExpandedGroups] = useState({});

  const [ingredientInput, setIngredientInput] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  // Sidebar responsive
  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Admin kontrol + kategorileri çek
  useEffect(() => {
    if (!admin) {
      navigate("/admin/login");
      return;
    }

    const fetchData = async () => {
      try {
        const categoriesResponse = await api.get("/api/categories");
        setCategories(categoriesResponse?.data?.data || []);
      } catch (err) {
        console.error("Veriler yüklenirken hata:", err);
        setError("Veriler yüklenirken bir hata oluştu.");
      }
    };

    fetchData();
  }, [admin, navigate]);

  // Object URL cleanup
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProductData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      setError("Sadece JPG/JPEG/PNG dosyaları yükleyebilirsiniz.");
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setProductData((prev) => ({ ...prev, image: file }));
    setImagePreview(URL.createObjectURL(file));
    setError("");
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setProductData((prev) => ({ ...prev, image: null }));
  };

  // ✅ YENİ - Ana seçenek ekleme
  const handleMainOptionAdd = () => {
    const name = mainOptionInput.name.trim();
    if (!name) {
      setError("Ana seçenek adı boş olamaz.");
      return;
    }

    const newGroup = {
      id: `group_${Date.now()}`,
      name,
      is_required: mainOptionInput.is_required,
      sub_options: [],
    };

    setProductData((prev) => ({
      ...prev,
      optionGroups: [...prev.optionGroups, newGroup],
    }));

    setMainOptionInput({ name: "", is_required: false });
    setActiveGroupId(newGroup.id);
    setExpandedGroups((prev) => ({ ...prev, [newGroup.id]: true }));
    setError("");
  };

  // ✅ YENİ - Alt seçenek ekleme
  const handleSubOptionAdd = (groupId) => {
    const name = subOptionInput.name.trim();
    if (!name) {
      setError("Alt seçenek adı boş olamaz.");
      return;
    }

    const priceModifier = Number(subOptionInput.price_modifier);
    if (!Number.isFinite(priceModifier) || priceModifier < 0) {
      setError("Fiyat değiştirici 0 veya daha büyük bir sayı olmalıdır.");
      return;
    }

    setProductData((prev) => ({
      ...prev,
      optionGroups: prev.optionGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              sub_options: [
                ...group.sub_options,
                {
                  name,
                  price_modifier: priceModifier,
                  is_default: subOptionInput.is_default,
                },
              ],
            }
          : group
      ),
    }));

    setSubOptionInput({ name: "", price_modifier: "", is_default: false });
    setError("");
  };

  // ✅ YENİ - Ana seçenek silme
  const handleMainOptionRemove = (groupId) => {
    setProductData((prev) => ({
      ...prev,
      optionGroups: prev.optionGroups.filter((g) => g.id !== groupId),
    }));
    if (activeGroupId === groupId) setActiveGroupId(null);
  };

  // ✅ YENİ - Alt seçenek silme
  const handleSubOptionRemove = (groupId, subIndex) => {
    setProductData((prev) => ({
      ...prev,
      optionGroups: prev.optionGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              sub_options: group.sub_options.filter((_, i) => i !== subIndex),
            }
          : group
      ),
    }));
  };

  // ✅ YENİ - Accordion toggle
  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // ✅ YENİ - Ana seçenek aktif/pasif
  const toggleGroupActive = (groupId) => {
    setProductData((prev) => ({
      ...prev,
      optionGroups: prev.optionGroups.map((group) =>
        group.id === groupId
          ? { ...group, is_required: !group.is_required }
          : group
      ),
    }));
  };

  const handleIngredientAdd = () => {
    const name = ingredientInput.trim();
    if (!name) return;

    setProductData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name }],
    }));
    setIngredientInput("");
  };

  const handleIngredientRemove = (index) => {
    setProductData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("name", productData.name);
      formData.append("description", productData.description);
      formData.append("base_price", String(productData.base_price));
      formData.append("category_id", String(productData.category_id));

      if (productData.image) formData.append("image", productData.image);

      // ✅ YENİ - optionGroups gönderimi
      formData.append("optionGroups", JSON.stringify(productData.optionGroups));
      formData.append("ingredients", JSON.stringify(productData.ingredients));

      console.log("Gönderilecek optionGroups:", productData.optionGroups);

      const response = await api.post("/api/products/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess(response?.data?.message || "Ürün başarıyla eklendi.");
      setTimeout(() => navigate("/admin/products"), 900);
    } catch (err) {
      console.log("Hata detayı:", err?.response?.data);
      setError(
        err?.response?.data?.error ||
          "Ürün eklenirken bir hata oluştu: " + (err?.message || "Bilinmeyen hata")
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
          <h1 className="apw-title">Yeni Ürün Ekle</h1>
          <p className="apw-subtitle">Zorunlu alanları doldurun, opsiyonel seçenek ve malzemeleri ekleyin.</p>
        </div>

        <div className="apw-header-actions">
          <button className="apw-btn apw-btn-ghost" type="button" onClick={() => navigate("/admin/products")}>
            Listeye Dön
          </button>
        </div>
      </header>

      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className={`apw-main ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <section className="apw-container">
          <div className="apw-card">
            {error && <div className="apw-alert apw-alert-error">{error}</div>}
            {success && <div className="apw-alert apw-alert-success">{success}</div>}

            <form onSubmit={handleSubmit} className="apw-form">
              {/* Ürün adı + kategori */}
              <div className="apw-grid apw-grid-2">
                <div className="apw-field">
                  <label className="apw-label" htmlFor="name">
                    Ürün Adı <span className="apw-req">*</span>
                  </label>
                  <input
                    className="apw-input"
                    type="text"
                    id="name"
                    name="name"
                    value={productData.name}
                    onChange={handleChange}
                    required
                    placeholder="Ürün adını girin"
                    autoComplete="off"
                  />
                </div>

                <div className="apw-field">
                  <label className="apw-label" htmlFor="category_id">
                    Kategori <span className="apw-req">*</span>
                  </label>
                  <select
                    className="apw-input"
                    id="category_id"
                    name="category_id"
                    value={productData.category_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Kategori Seçin</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* fiyat + görsel */}
              <div className="apw-grid apw-grid-2">
                <div className="apw-field">
                  <label className="apw-label" htmlFor="base_price">
                    Fiyat <span className="apw-req">*</span>
                  </label>
                  <div className="apw-input-suffix">
                    <input
                      className="apw-input"
                      type="number"
                      id="base_price"
                      name="base_price"
                      value={productData.base_price}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      required
                      placeholder="99.99"
                    />
                    <span className="apw-suffix">TL</span>
                  </div>
                </div>

                <div className="apw-field">
                  <label className="apw-label" htmlFor="image">Ürün Görseli (opsiyonel)</label>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                    <input
                      className="apw-file"
                      type="file"
                      id="image"
                      name="image"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleImageChange}
                      style={{ flex: 1 }}
                    />
                    <div className="apw-upload-box" style={{ flex: 1 }}>
                      <div className="apw-upload-title">Dosya seç</div>
                      <div className="apw-upload-hint">JPG/PNG, öneri: kare görsel</div>
                    </div>
                  </div>

                  {imagePreview && (
                    <div className="apw-preview">
                      <img src={imagePreview} alt="Ürün görsel önizleme" />
                      <button type="button" className="apw-btn apw-btn-ghost-danger" onClick={removeImage}>
                        Görseli Kaldır
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ YENİ - Hiyerarşik Seçenekler Bölümü */}
              <div className="apw-block">
                <div className="apw-block-head">
                  <div>
                    <h3 className="apw-block-title">Ürün Seçenekleri (opsiyonel)</h3>
                    <p className="apw-block-desc">Önce ana seçenek ekleyin (örn: Boyut), sonra alt seçenekleri girin.</p>
                  </div>
                </div>

                {/* Ana Seçenek Ekleme */}
                <div className="apw-inline">
                  <input
                    className="apw-input"
                    type="text"
                    value={mainOptionInput.name}
                    onChange={(e) => setMainOptionInput((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ana seçenek adı (örn: Boyut)"
                  />

                  <label className="apw-check">
                    <input
                      type="checkbox"
                      checked={mainOptionInput.is_required}
                      onChange={(e) => setMainOptionInput((prev) => ({ ...prev, is_required: e.target.checked }))}
                    />
                    Zorunlu
                  </label>

                  <button type="button" className="apw-btn apw-btn-dark" onClick={handleMainOptionAdd}>
                    Ana Seçenek Ekle
                  </button>
                </div>

                {/* Ana Seçeneklerin Listesi - Accordion Tarzı */}
                {productData.optionGroups.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    {productData.optionGroups.map((group) => (
                      <div
                        key={group.id}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          marginBottom: '12px',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Ana Seçenek Başlığı */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: '#f9fafb',
                            cursor: 'pointer',
                            borderBottom: expandedGroups[group.id] ? '1px solid #e5e7eb' : 'none',
                          }}
                          onClick={() => toggleGroup(group.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '20px' }}>
                              {expandedGroups[group.id] ? '▼' : '▶'}
                            </span>
                            <strong>{group.name}</strong>
                            {group.is_required && (
                              <span style={{ fontSize: '12px', color: '#ef4444' }}>(Zorunlu)</span>
                            )}
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              ({group.sub_options.length} alt seçenek)
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="apw-btn apw-btn-ghost-danger"
                              style={{ padding: '4px 12px', fontSize: '14px' }}
                              onClick={() => handleMainOptionRemove(group.id)}
                            >
                              Sil
                            </button>
                          </div>
                        </div>

                        {/* Alt Seçenekler - Accordion İçeriği */}
                        {expandedGroups[group.id] && (
                          <div style={{ padding: '16px' }}>
                            {/* Alt Seçenek Ekleme Formu */}
                            <div className="apw-inline" style={{ marginBottom: '16px' }}>
                              <input
                                className="apw-input"
                                type="text"
                                value={activeGroupId === group.id ? subOptionInput.name : ""}
                                onChange={(e) => {
                                  setActiveGroupId(group.id);
                                  setSubOptionInput((prev) => ({ ...prev, name: e.target.value }));
                                }}
                                placeholder="Alt seçenek adı (örn: Küçük)"
                              />

                              <div className="apw-input-suffix">
                                <input
                                  className="apw-input"
                                  type="number"
                                  value={activeGroupId === group.id ? subOptionInput.price_modifier : ""}
                                  onChange={(e) => {
                                    setActiveGroupId(group.id);
                                    setSubOptionInput((prev) => ({ ...prev, price_modifier: e.target.value }));
                                  }}
                                  placeholder="0.00"
                                  step="0.01"
                                  min="0"
                                />
                                <span className="apw-suffix">TL</span>
                              </div>

                              <label className="apw-check">
                                <input
                                  type="checkbox"
                                  checked={activeGroupId === group.id ? subOptionInput.is_default : false}
                                  onChange={(e) => {
                                    setActiveGroupId(group.id);
                                    setSubOptionInput((prev) => ({ ...prev, is_default: e.target.checked }));
                                  }}
                                />
                                Varsayılan
                              </label>

                              <button
                                type="button"
                                className="apw-btn apw-btn-dark"
                                onClick={() => handleSubOptionAdd(group.id)}
                              >
                                Ekle
                              </button>
                            </div>

                            {/* Alt Seçeneklerin Listesi */}
                            {group.sub_options.length > 0 ? (
                              <div className="apw-chips">
                                {group.sub_options.map((subOpt, idx) => (
                                  <div
                                    className={`apw-chip ${subOpt.is_default ? "is-default" : ""}`}
                                    key={`${subOpt.name}-${idx}`}
                                  >
                                    <div className="apw-chip-main">
                                      <div className="apw-chip-title">
                                        {subOpt.name} {subOpt.is_default ? "(Varsayılan)" : ""}
                                      </div>
                                      <div className="apw-chip-meta">+{Number(subOpt.price_modifier).toFixed(2)} TL</div>
                                    </div>
                                    <button
                                      type="button"
                                      className="apw-chip-x"
                                      onClick={() => handleSubOptionRemove(group.id, idx)}
                                      aria-label="Remove"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ color: '#6b7280', fontSize: '14px', fontStyle: 'italic' }}>
                                Henüz alt seçenek eklenmedi.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Malzemeler */}
              <div className="apw-block">
                <div className="apw-block-head">
                  <div>
                    <h3 className="apw-block-title">Malzemeler (opsiyonel)</h3>
                    <p className="apw-block-desc">Örn: Peynir, Zeytin, Sos.</p>
                  </div>
                </div>

                <div className="apw-inline">
                  <input
                    className="apw-input"
                    type="text"
                    value={ingredientInput}
                    onChange={(e) => setIngredientInput(e.target.value)}
                    placeholder="Malzeme adı"
                  />
                  <button type="button" className="apw-btn apw-btn-dark" onClick={handleIngredientAdd}>
                    Ekle
                  </button>
                </div>

                {productData.ingredients.length > 0 && (
                  <div className="apw-chips">
                    {productData.ingredients.map((ing, idx) => (
                      <div className="apw-chip" key={`${ing.name}-${idx}`}>
                        <div className="apw-chip-main">
                          <div className="apw-chip-title">{ing.name}</div>
                        </div>
                        <button type="button" className="apw-chip-x" onClick={() => handleIngredientRemove(idx)} aria-label="Remove">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Açıklama */}
              <div className="apw-field">
                <label className="apw-label" htmlFor="description">Açıklama (opsiyonel)</label>
                <textarea
                  className="apw-textarea"
                  id="description"
                  name="description"
                  value={productData.description}
                  onChange={handleChange}
                  placeholder="Ürün açıklaması..."
                />
              </div>

              <div className="apw-actions">
                <button type="button" className="apw-btn apw-btn-ghost" onClick={() => navigate("/admin/products")}>
                  İptal
                </button>
                <button type="submit" className="apw-btn apw-btn-primary" disabled={loading}>
                  {loading ? "Ekleniyor..." : "Ürünü Ekle"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AddProduct;