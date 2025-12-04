import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from "../../context/AuthContext";
import api from '../../services/api';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Popconfirm,
  Drawer,
  Switch,
  Typography,
  Divider,
  InputNumber,
} from 'antd';
import Sidebar from "./SideBar";
import "./Orders.css";

const { Option } = Select;
const { Text } = Typography;

const ProductOptionsManagement = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // STATE
  const [options, setOptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modal - Seçenek ekleme/düzenleme
  const [optionModalVisible, setOptionModalVisible] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [optionForm] = Form.useForm();
  
  // Modal - Değer ekleme/düzenleme
  const [valueModalVisible, setValueModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState(null);
  const [selectedOptionForValue, setSelectedOptionForValue] = useState(null);
  const [valueForm] = Form.useForm();
  
  // Drawer - Ürüne seçenek atama
  const [assignDrawerVisible, setAssignDrawerVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductOptions, setSelectedProductOptions] = useState([]);
  const [selectedRequiredOptions, setSelectedRequiredOptions] = useState([]);

  // Sidebar responsive
  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!admin) navigate("/admin/login");
  }, [admin, navigate]);

  // Veri çekme
  useEffect(() => {
    fetchOptions();
    fetchProducts();
  }, []);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/options');
      setOptions(response.data);
    } catch (error) {
      console.error('Options fetch error:', error);
      message.error('Seçenekler yüklenirken bir hata oluştu');
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products');
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Products fetch error:', error);
      message.error('Ürünler yüklenirken bir hata oluştu');
    }
  };

  // ==================== SEÇENEKLERİ YÖNET ====================

  const handleAddOption = () => {
    setEditingOption(null);
    optionForm.resetFields();
    setOptionModalVisible(true);
  };

  const handleEditOption = (record) => {
    setEditingOption(record);
    optionForm.setFieldsValue({
      name: record.name,
      description: record.description,
      type: record.type,
    });
    setOptionModalVisible(true);
  };

  const handleSubmitOption = async (values) => {
    try {
      if (editingOption) {
        await api.put(`/api/options/${editingOption.id}`, values);
        message.success('Seçenek başarıyla güncellendi');
      } else {
        await api.post('/api/options', values);
        message.success('Seçenek başarıyla eklendi');
      }
      setOptionModalVisible(false);
      fetchOptions();
    } catch (error) {
      console.error('Option submit error:', error);
      message.error(editingOption ? 'Güncelleme başarısız' : 'Ekleme başarısız');
    }
  };

  const handleDeleteOption = async (id) => {
    try {
      await api.delete(`/api/options/${id}`);
      message.success('Seçenek başarıyla silindi');
      fetchOptions();
    } catch (error) {
      console.error('Option delete error:', error);
      message.error('Silme başarısız');
    }
  };

  // ==================== DEĞERLERI YÖNET ====================

  const handleAddValue = (optionId) => {
    setSelectedOptionForValue(optionId);
    setEditingValue(null);
    valueForm.resetFields();
    setValueModalVisible(true);
  };

  const handleEditValue = (optionId, value) => {
    setSelectedOptionForValue(optionId);
    setEditingValue(value);
    valueForm.setFieldsValue({
      name: value.name,
      price_modifier: value.price_modifier,
    });
    setValueModalVisible(true);
  };

  const handleSubmitValue = async (values) => {
    try {
      if (editingValue) {
        await api.put(`/api/options/values/${editingValue.id}`, values);
        message.success('Değer başarıyla güncellendi');
      } else {
        await api.post(`/api/options/${selectedOptionForValue}/values`, values);
        message.success('Değer başarıyla eklendi');
      }
      setValueModalVisible(false);
      fetchOptions();
    } catch (error) {
      console.error('Value submit error:', error);
      message.error(editingValue ? 'Güncelleme başarısız' : 'Ekleme başarısız');
    }
  };

  const handleDeleteValue = async (valueId) => {
    try {
      await api.delete(`/api/options/values/${valueId}`);
      message.success('Değer başarıyla silindi');
      fetchOptions();
    } catch (error) {
      console.error('Value delete error:', error);
      message.error('Silme başarısız');
    }
  };

  // ==================== ÜRÜNE SEÇENEK ATA ====================

  const showAssignDrawer = async (productId) => {
    if (productId) {
      setSelectedProduct(productId);
      try {
        // ✅ DÜZELTİLMİŞ ENDPOINT
        const response = await api.get(`/api/options/product/${productId}`);
        const productOpts = response.data;
        setSelectedProductOptions(productOpts.map(po => po.id.toString()));
        setSelectedRequiredOptions(productOpts.filter(po => po.is_required).map(po => po.id.toString()));
      } catch (error) {
        console.error('Product options fetch error:', error);
        setSelectedProductOptions([]);
        setSelectedRequiredOptions([]);
      }
    }
    setAssignDrawerVisible(true);
  };

  const handleOpenDrawer = () => {
    setSelectedProduct(null);
    setSelectedProductOptions([]);
    setSelectedRequiredOptions([]);
    setAssignDrawerVisible(true);
  };

  const handleAssignOptions = async () => {
    if (!selectedProduct) {
      message.warning('Lütfen bir ürün seçin');
      return;
    }

    try {
      // ✅ DÜZELTİLMİŞ ENDPOINT
      await api.post(`/api/options/product/${selectedProduct}/assign`, {
        options: selectedProductOptions.map(optionId => ({
          option_id: parseInt(optionId),
          is_required: selectedRequiredOptions.includes(optionId),
        })),
      });
      message.success('Seçenekler başarıyla atandı');
      setAssignDrawerVisible(false);
    } catch (error) {
      console.error('Assign options error:', error);
      message.error('Atama başarısız: ' + (error.response?.data?.error || error.message));
    }
  };

  // ==================== RENDER ====================

  const optionColumns = [
    {
      title: 'Seçenek Adı',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
    },
    {
      title: 'Tür',
      dataIndex: 'type',
      key: 'type',
      width: '15%',
      render: (type) => type === 'single' ? 'Tekli Seçim' : 'Çoklu Seçim',
    },
    {
      title: 'Değerler',
      key: 'values',
      width: '50%',
      render: (_, record) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {record.values && record.values.length > 0 ? (
            record.values.map(val => (
              <div key={val.id} style={{
                background: '#f0f0f0',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>{val.name} (+{parseFloat(val.price_modifier).toFixed(2)} TL)</span>
                <Space size={4}>
                  <Button 
                    type="link" 
                    size="small" 
                    style={{ padding: 0, height: 'auto' }}
                    onClick={() => handleEditValue(record.id, val)}
                  >
                    Düzenle
                  </Button>
                  <Popconfirm
                    title="Değeri silmek istediğinizden emin misiniz?"
                    onConfirm={() => handleDeleteValue(val.id)}
                    okText="Evet"
                    cancelText="Hayır"
                  >
                    <Button 
                      type="link" 
                      danger 
                      size="small"
                      style={{ padding: 0, height: 'auto' }}
                    >
                      Sil
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            ))
          ) : (
            <span style={{ color: '#999' }}>Değer yok</span>
          )}
        </div>
      ),
    },
    {
      title: 'İşlemler',
      key: 'action',
      width: '15%',
      render: (_, record) => (
        <Space size="small" direction="vertical">
          <Button type="link" size="small" onClick={() => handleAddValue(record.id)}>
            Değer Ekle
          </Button>
          <Button type="link" size="small" onClick={() => handleEditOption(record)}>
            Düzenle
          </Button>
          <Popconfirm
            title="Seçeneği silmek istediğinizden emin misiniz?"
            onConfirm={() => handleDeleteOption(record.id)}
            okText="Evet"
            cancelText="Hayır"
          >
            <Button type="link" danger size="small">
              Sil
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="admin-orders">
      <header className="header">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6H20" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 12H14" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 18H9" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="header-title">Ürün Seçenek Yönetimi</h1>
      </header>

      <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Admin</h2>
          <button className="close-sidebar" onClick={toggleSidebar}>✕</button>
        </div>
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      </aside>

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <section className="orders-section">
          <div className="filters">
            <Space>
              <Button type="primary" onClick={handleAddOption}>
                Yeni Seçenek Ekle
              </Button>
              <Button type="primary" onClick={handleOpenDrawer}>
                Ürüne Seçenek Ata
              </Button>
            </Space>
          </div>

          <div className="table-wrapper">
            <Table
              columns={optionColumns}
              dataSource={options}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </div>

          {/* Seçenek Modal */}
          <Modal
            title={editingOption ? 'Seçeneği Düzenle' : 'Yeni Seçenek Ekle'}
            open={optionModalVisible}
            onCancel={() => setOptionModalVisible(false)}
            footer={null}
          >
            <Form form={optionForm} layout="vertical" onFinish={handleSubmitOption}>
              <Form.Item name="name" label="Seçenek Adı" rules={[{ required: true, message: 'Seçenek adı zorunludur' }]}>
                <Input placeholder="Örn: Boyut" />
              </Form.Item>
              <Form.Item name="description" label="Açıklama">
                <Input.TextArea rows={3} placeholder="Seçenek hakkında kısa açıklama" />
              </Form.Item>
              <Form.Item name="type" label="Tür" rules={[{ required: true, message: 'Tür zorunludur' }]}>
                <Select placeholder="Seçim türü">
                  <Option value="single">Tekli Seçim</Option>
                  <Option value="multiple">Çoklu Seçim</Option>
                </Select>
              </Form.Item>
              <Button type="primary" htmlType="submit" block>
                {editingOption ? 'Güncelle' : 'Ekle'}
              </Button>
            </Form>
          </Modal>

          {/* Değer Modal */}
          <Modal
            title={editingValue ? 'Değeri Düzenle' : 'Yeni Değer Ekle'}
            open={valueModalVisible}
            onCancel={() => setValueModalVisible(false)}
            footer={null}
          >
            <Form form={valueForm} layout="vertical" onFinish={handleSubmitValue}>
              <Form.Item name="name" label="Değer Adı" rules={[{ required: true, message: 'Değer adı zorunludur' }]}>
                <Input placeholder="Örn: Küçük, Orta, Büyük" />
              </Form.Item>
              <Form.Item 
                name="price_modifier" 
                label="Fiyat Değiştirici (TL)" 
                rules={[{ required: true, message: 'Fiyat değiştirici zorunludur' }]}
              >
                <InputNumber 
                  min={0} 
                  step={0.01} 
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" block>
                {editingValue ? 'Güncelle' : 'Ekle'}
              </Button>
            </Form>
          </Modal>

          {/* Ürüne Seçenek Atama Drawer */}
          <Drawer
            title="Ürüne Seçenek Atama"
            placement="right"
            width={700}
            onClose={() => setAssignDrawerVisible(false)}
            open={assignDrawerVisible}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text strong>Ürün Seçin:</Text>
                <Select
                  style={{ width: '100%', marginTop: '8px' }}
                  placeholder="Ürün seçiniz"
                  value={selectedProduct}
                  onChange={showAssignDrawer}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {products.map(p => (
                    <Option key={p.id} value={p.id}>{p.name}</Option>
                  ))}
                </Select>
              </div>

              {selectedProduct && (
                <>
                  <Divider />
                  <div>
                    <Text strong>Seçenekleri Seçin:</Text>
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {options.map(opt => (
                        <div key={opt.id} style={{ border: '1px solid #d9d9d9', padding: '12px', borderRadius: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <strong>{opt.name}</strong>
                            <Switch
                              checked={selectedProductOptions.includes(opt.id.toString())}
                              onChange={(checked) => {
                                if (checked) {
                                  setSelectedProductOptions([...selectedProductOptions, opt.id.toString()]);
                                } else {
                                  setSelectedProductOptions(selectedProductOptions.filter(id => id !== opt.id.toString()));
                                  setSelectedRequiredOptions(selectedRequiredOptions.filter(id => id !== opt.id.toString()));
                                }
                              }}
                            />
                          </div>
                          {selectedProductOptions.includes(opt.id.toString()) && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Switch
                                  checked={selectedRequiredOptions.includes(opt.id.toString())}
                                  onChange={(checked) => {
                                    if (checked) {
                                      setSelectedRequiredOptions([...selectedRequiredOptions, opt.id.toString()]);
                                    } else {
                                      setSelectedRequiredOptions(selectedRequiredOptions.filter(id => id !== opt.id.toString()));
                                    }
                                  }}
                                />
                                <span style={{ fontSize: '12px' }}>Zorunlu Seçenek</span>
                              </label>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    <Button onClick={() => setAssignDrawerVisible(false)} style={{ flex: 1 }}>
                      İptal
                    </Button>
                    <Button type="primary" onClick={handleAssignOptions} style={{ flex: 1 }}>
                      Kaydet
                    </Button>
                  </div>
                </>
              )}
            </Space>
          </Drawer>
        </section>
      </main>
    </div>
  );
};

export default ProductOptionsManagement;