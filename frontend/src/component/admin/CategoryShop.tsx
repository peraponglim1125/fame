import React, { useEffect, useState } from "react";
import { Input, Button, List, Card, message, Modal, Form, Popconfirm } from "antd";
import axios from "axios";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";

interface CategoryType {
  ID: number;
  category_name: string;
}

const API_LIST   = "http://localhost:8080/api/ListCShopCategory";
const API_CREATE = "http://localhost:8080/api/CreateCShopCategory";
const API_UPDATE = (id: number) => `http://localhost:8080/api/shopcategories/${id}`;
const API_DELETE = (id: number) => `http://localhost:8080/api/shopcategories/${id}`;

const CategoryShop: React.FC = () => {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);

  // สำหรับแก้ไข
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryType | null>(null);
  const [form] = Form.useForm();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_LIST);
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error(err);
      message.error("โหลดหมวดหมู่ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return message.error("กรุณากรอกชื่อหมวดหมู่");
    try {
      await axios.post(API_CREATE, { category_name: newCategory.trim() });
      message.success("เพิ่มหมวดหมู่เรียบร้อย");
      setNewCategory("");
      fetchCategories();
    } catch (err) {
      console.error(err);
      message.error("เพิ่มหมวดหมู่ไม่สำเร็จ");
    }
  };

  const openEdit = (item: CategoryType) => {
    setEditing(item);
    form.setFieldsValue({ category_name: item.category_name });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    try {
      const values = await form.validateFields();
      await axios.put(API_UPDATE(editing!.ID), { category_name: values.category_name });
      message.success("อัปเดตหมวดหมู่ร้านสำเร็จ");
      setEditOpen(false);
      setEditing(null);
      fetchCategories();
    } catch (err: any) {
      if (err?.errorFields) return;
      console.error(err);
      message.error("อัปเดตไม่สำเร็จ");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(API_DELETE(id));
      message.success("ลบหมวดหมู่ร้านสำเร็จ");
      fetchCategories();
    } catch (err) {
      console.error(err);
      message.error("ลบไม่สำเร็จ");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 720, margin: "0 auto" }}>
      <h2>เพิ่มหมวดหมู่ร้านค้า (ShopCategory)</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Input
          placeholder="กรอกชื่อหมวดหมู่ร้าน"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onPressEnter={handleAddCategory}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCategory}>
          เพิ่มหมวดหมู่
        </Button>
      </div>

      <Card title="รายการหมวดหมู่ร้านทั้งหมด">
        <List
          bordered
          loading={loading}
          dataSource={categories}
          rowKey={(item) => item.ID}
          renderItem={(item, index) => (
            <List.Item
              actions={[
                <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(item)} />,
                <Popconfirm
                  title="ยืนยันการลบ"
                  description={`ต้องการลบ "${item.category_name}" ใช่ไหม?`}
                  okText="ลบ"
                  cancelText="ยกเลิก"
                  onConfirm={() => handleDelete(item.ID)}
                >
                  <Button type="link" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <div>
                {index + 1}. {item.category_name} <span style={{ opacity: 0.7 }}>ID: {item.ID}</span>
              </div>
            </List.Item>
          )}
        />
      </Card>

      {/* Modal แก้ไขชื่อ */}
      <Modal
        title={`แก้ไขหมวดหมู่ร้าน #${editing?.ID || ""}`}
        open={editOpen}
        onOk={submitEdit}
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        okText="บันทึก"
        cancelText="ยกเลิก"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="category_name"
            label="ชื่อหมวดหมู่ร้าน"
            rules={[{ required: true, message: "กรุณากรอกชื่อหมวดหมู่ร้าน" }]}
          >
            <Input placeholder="ระบุชื่อใหม่" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoryShop;
