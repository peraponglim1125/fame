import React, { useState } from 'react';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    UploadOutlined,
    DashboardOutlined,
    SettingOutlined,
    ShopOutlined,
    AppstoreAddOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, theme } from 'antd';
import { Outlet,useNavigate } from 'react-router-dom';

const { Header, Sider, Content, Footer } = Layout;

const AdminLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* แถบข้าง */}
            <Sider trigger={null} collapsible collapsed={collapsed}>
                <div className="demo-logo-vertical" style={{
                    height: 64,
                    margin: 16,
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 8
                }} />

                <Menu
                    theme="dark"
                    mode="inline"
                    defaultSelectedKeys={['1']}

                    onClick={(item) => {
                        switch (item.key) {
                            case "1": navigate("/admin"); break;
                            case "2": navigate("/admin"); break;
                            case "3": navigate("/admin"); break;
                            case "4": navigate("/admin/Createcode"); break;
                            case "5": navigate("/admin/category"); break;
                            case "6": navigate("/admin/shopcategory"); break;
                            default: break;
                        }
                    }}
                    items={[
                        {
                            key: '1',
                            icon: <DashboardOutlined />,
                            label: 'Dashboard',
                        },
                        {
                            key: '2',
                            icon: <UserOutlined />,
                            label: 'จัดการผู้ใช้',
                        },
                        {
                            key: '3',
                            icon: <UploadOutlined />,
                            label: 'อัปโหลดไฟล์',
                        },
                        {
                            key: '4',
                            icon: <SettingOutlined />,
                            label: 'สร้างโค้ดส่วนลด',
                        },
                        {
                            key: '5',
                            icon: <ShopOutlined />,
                            label: 'เพิ่มหมวดหมู่สินค้า',
                        },
                        {
                            key: '6',
                            icon: <AppstoreAddOutlined />,
                            label: 'เพิ่มหมวดหมู่ร้านค้า',
                        },
                    ]}
                />
            </Sider>

            {/* ส่วนหลัก */}
            <Layout>
                <Header style={{ padding: 0, background: colorBgContainer }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            fontSize: '16px',
                            width: 64,
                            height: 64,
                        }}
                    />
                    <span style={{ fontSize: 18, fontWeight: 600, marginLeft: 16 }}>
                        Admin Panel
                    </span>
                </Header>

                <Content
                    style={{
                        margin: '24px 16px',
                        padding: 24,
                        minHeight: 360,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                    }}
                >
                    
                    <Outlet />
                </Content>

                <Footer style={{ textAlign: 'center' }}>
                    © {new Date().getFullYear()} Admin Dashboard by Ant Design
                </Footer>
            </Layout>
        </Layout>
    );
};

export default AdminLayout;
