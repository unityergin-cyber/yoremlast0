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
  Transfer,
  Switch,
  Typography,
  Divider
} from 'antd';
import Sidebar from "./Sidebar";
import "./Orders.css";

const { Option } = Select;
const { Text } = Typography;

const ProductOptionsManagement = () => {
  const { admin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [options, setOptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignDrawerVisible, setAssignDrawerVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductOptions, setSelectedProductOptions] = useState([]);
  const [selectedRequiredOptions, setSelectedRequiredOptions] = useState([]);
  const [editingOption, setEditingOption] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [form] = Form.useForm();

  // Sidebar responsive kontrolü
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

  // Seçenekleri getir
  const fetchOptions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/options');
      setOptions(response.data);
    } catch (error) {
      message.error('Seçenekler yüklenirken bir hata oluştu');
    }
    setLoading(false);
  };

  // Ürünleri getir
  const fetchProducts = async () => {
    try {
      const response = await api.get('/api/products');
      setProducts(response.data.data);
    } catch (error) {
      message.error('Ürünler yüklenirken bir hata oluştu');
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchProducts();
  }, []);

  // Yeni seçenek ekle
  const handleAdd = () => {
    setEditingOption(null);
    form.resetFields();
    setModalVisible(true);
  };

  // Seçenek düzenle
  const handleEdit = (record) => {
    setEditingOption(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      type: record.type
    });
    setModalVisible(true);
  };

  // Form gönderme
  const handleSubmit = async (values) => {
    try {
      if (editingOption) {
        // Düzenleme işlemi
        await api.put(`/api/options/${editingOption.id}`, values);
        message.success('Seçenek başarıyla güncellendi');
      } else {
        // Yeni ekleme işlemi
        await api.post('/api/options', values);
        message.success('Seçenek başarıyla eklendi');
      }
      setModalVisible(false);
      setEditingOption(null);
      form.resetFields();
      fetchOptions();
    } catch (error) {
      message.error(editingOption ? 'Seçenek güncellenirken bir hata oluştu' : 'Seçenek eklenirken bir hata oluştu');
    }
  };

  // Seçenek silme
  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/options/${id}`);
      message.success('Seçenek başarıyla silindi');
      fetchOptions();
    } catch (error) {
      message.error('Seçenek silinirken bir hata oluştu');
    }
  };

  // Ürüne seçenek atama penceresini aç
  const showAssignDrawer = async (productId) => {
    if (productId) {
      setSelectedProduct(productId);
      try {
        const response = await api.get(`/api/products/${productId}/options`);
        const productOptions = response.data;
        setSelectedProductOptions(productOptions.map(po => po.id.toString()));
        setSelectedRequiredOptions(productOptions.filter(po => po.is_required).map(po => po.id.toString()));
      } catch (error) {
        message.error('Ürün seçenekleri yüklenirken bir hata oluştu');
        setSelectedProductOptions([]);
        setSelectedRequiredOptions([]);
      }
    } else {
      setSelectedProduct(null);
      setSelectedProductOptions([]);
      setSelectedRequiredOptions([]);
    }
    setAssignDrawerVisible(true);
  };

  // Drawer'ı açan buton için handler
  const handleOpenDrawer = () => {
    setSelectedProduct(null);
    setSelectedProductOptions([]);
    setSelectedRequiredOptions([]);
    setAssignDrawerVisible(true);
  };

  // Seçenekleri ürüne kaydet
  const handleAssignOptions = async () => {
    try {
      await api.post(`/api/products/${selectedProduct}/options`, {
        options: selectedProductOptions.map(optionId => ({
          option_id: parseInt(optionId),
          is_required: selectedRequiredOptions.includes(optionId)
        }))
      });
      message.success('Seçenekler başarıyla atandı');
      setAssignDrawerVisible(false);
    } catch (error) {
      message.error('Seçenekler atanırken bir hata oluştu');
    }
  };

  const columns = [
    {
      title: 'Seçenek Adı',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Açıklama',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Tür',
      dataIndex: 'type',
      key: 'type',
      render: (type) => type === 'single' ? 'Tekli Seçim' : 'Çoklu Seçim',
    },
    {
      title: 'Durum',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (is_active) => (is_active ? 'Aktif' : 'Pasif'),
    },
    {
      title: 'İşlemler',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="primary" onClick={() => handleEdit(record)}>
            Düzenle
          </Button>
          <Popconfirm
            title="Bu seçeneği silmek istediğinizden emin misiniz?"
            onConfirm={() => handleDelete(record.id)}
            okText="Evet"
            cancelText="Hayır"
          >
            <Button type="primary" danger>
              Sil
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

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
        <h1 className="header-title">Ürün Seçenek Yönetimi</h1>
      </header>

      <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Admin</h2>
          <button className="close-sidebar" onClick={toggleSidebar}>
            ✕
          </button>
        </div>
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
      </aside>

      <main className={`main-content ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <section className="orders-section">
          <div className="filters">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Button type="primary" onClick={handleAdd}>
                Yeni Seçenek Ekle
              </Button>
              <Button type="primary" onClick={handleOpenDrawer}>
                Ürüne Seçenek Ata
              </Button>
            </div>
          </div>

          <div className="table-wrapper">
            <Table
              columns={columns}
              dataSource={options}
              rowKey="id"
              loading={loading}
            />
          </div>

          <Modal
            title={editingOption ? 'Seçenek Düzenle' : 'Yeni Seçenek Ekle'}
            open={modalVisible}
            onCancel={() => {
              setModalVisible(false);
              setEditingOption(null);
              form.resetFields();
            }}
            footer={null}
          >
            <Form
              form={form}
              onFinish={handleSubmit}
              layout="vertical"
              initialValues={editingOption || {}}
            >
              <Form.Item
                name="name"
                label="Seçenek Adı"
                rules={[{ required: true, message: 'Lütfen seçenek adını girin' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="description"
                label="Açıklama"
              >
                <Input.TextArea />
              </Form.Item>

              <Form.Item
                name="type"
                label="Tür"
                rules={[{ required: true, message: 'Lütfen seçenek türünü seçin' }]}
              >
                <Select>
                  <Option value="single">Tekli Seçim</Option>
                  <Option value="multiple">Çoklu Seçim</Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  {editingOption ? 'Güncelle' : 'Kaydet'}
                </Button>
              </Form.Item>
            </Form>
          </Modal>

          <Drawer
            title="Ürüne Seçenek Atama"
            placement="right"
            width={800}
            onClose={() => {
              setAssignDrawerVisible(false);
              setSelectedProduct(null);
            }}
            open={assignDrawerVisible}
          >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: '60px' }}>
              <Space direction="vertical" style={{ width: '100%', flex: 1 }} size="large">
                <div>
                  <Text strong>Önce bir ürün seçin, ardından seçenekleri atayın.</Text>
                  <Select
                    style={{ width: '100%', marginTop: '16px' }}
                    placeholder="Ürün Seçin"
                    value={selectedProduct}
                    onChange={showAssignDrawer}
                    showSearch
                    optionFilterProp="children"
                  >
                    {products.map(product => (
                      <Option key={product.id} value={product.id}>{product.name}</Option>
                    ))}
                  </Select>
                </div>

                {selectedProduct && (
                  <>
                    <Divider />
                    <div>
                      <Text strong>Seçenekleri sağ tarafa sürükleyerek ürüne ekleyin.</Text>
                      <br />
                      <Text type="secondary">Eklenen seçenekleri zorunlu yapmak için alttaki switch'leri kullanın.</Text>
                    </div>
                    
                    <Transfer
                      dataSource={options.map(option => ({
                        key: option.id.toString(),
                        title: option.name,
                        description: option.description,
                        type: option.type
                      }))}
                      titles={['Mevcut Seçenekler', 'Ürüne Eklenecek Seçenekler']}
                      targetKeys={selectedProductOptions}
                      onChange={setSelectedProductOptions}
                      render={item => (
                        <Space direction="vertical" size={0}>
                          <Text strong>{item.title}</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {item.type === 'single' ? 'Tekli Seçim' : 'Çoklu Seçim'}
                          </Text>
                        </Space>
                      )}
                      listStyle={{
                        width: 350,
                        height: 400,
                      }}
                    />

                    <Divider>Zorunlu Seçenekler</Divider>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      {selectedProductOptions.map(optionId => {
                        const option = options.find(o => o.id.toString() === optionId);
                        if (!option) return null;
                        return (
                          <div key={optionId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Switch
                              checked={selectedRequiredOptions.includes(optionId)}
                              onChange={(checked) => {
                                if (checked) {
                                  setSelectedRequiredOptions([...selectedRequiredOptions, optionId]);
                                } else {
                                  setSelectedRequiredOptions(selectedRequiredOptions.filter(id => id !== optionId));
                                }
                              }}
                            />
                            <Text>{option.name}</Text>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </Space>
              {selectedProduct && (
                <div style={{
                  position: 'fixed',
                  bottom: 24,
                  right: 24,
                  zIndex: 1000
                }}>
                  <Button type="primary" onClick={handleAssignOptions}>
                    Kaydet
                  </Button>
                </div>
              )}
            </div>
          </Drawer>
        </section>
      </main>
    </div>
  );
};

export default ProductOptionsManagement; 