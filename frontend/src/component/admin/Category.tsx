import React, { useEffect, useState } from "react";
import { Input, Button, List, Card, message, Modal, Form, Popconfirm } from "antd";
import axios from "axios";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";

interface CategoryType {
  ID: number;
  name: string;
}

const API = "http://localhost:8080/api";

const Category: React.FC = () => {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);

  // สำหรับ Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryType | null>(null);
  const [form] = Form.useForm();

  // โหลดรายการ
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/listCategory`);
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

  // เพิ่มหมวดหมู่
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return message.error("กรุณากรอกชื่อหมวดหมู่");
    try {
      await axios.post(`${API}/CreateCategory`, { name: newCategory.trim() });
      message.success("เพิ่มหมวดหมู่เรียบร้อย");
      setNewCategory("");
      fetchCategories();
    } catch (err) {
      console.error(err);
      message.error("เพิ่มหมวดหมู่ไม่สำเร็จ");
    }
  };

  // เปิด modal แก้ไข
  const openEdit = (item: CategoryType) => {
    setEditing(item);
    form.setFieldsValue({ name: item.name });
    setEditOpen(true);
  };

  // ยืนยันแก้ไข
  const submitEdit = async () => {
    try {
      const values = await form.validateFields();
      await axios.put(`${API}/categories/${editing?.ID}`, { name: values.name });
      message.success("อัปเดตหมวดหมู่สำเร็จ");
      setEditOpen(false);
      setEditing(null);
      fetchCategories();
    } catch (err: any) {
      if (err?.errorFields) return; // validation error ในฟอร์ม
      console.error(err);
      message.error("อัปเดตไม่สำเร็จ");
    }
  };

  // ลบหมวดหมู่
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API}/categories/${id}`);
      message.success("ลบหมวดหมู่สำเร็จ");
      fetchCategories();
    } catch (err) {
      console.error(err);
      message.error("ลบหมวดหมู่ไม่สำเร็จ");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 720, margin: "0 auto" }}>
      <h2>เพิ่มหมวดหมู่สินค้า</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Input
          placeholder="กรอกชื่อหมวดหมู่"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onPressEnter={handleAddCategory}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCategory}>
          เพิ่มหมวดหมู่
        </Button>
      </div>

      <Card title="รายการหมวดหมู่ทั้งหมด">
        <List
          bordered
          loading={loading}
          dataSource={categories}
          rowKey={(item) => item.ID}
          renderItem={(item, index) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(item)}
                />,
                <Popconfirm
                  title="ยืนยันการลบ"
                  description={`ต้องการลบ "${item.name}" ใช่ไหม?`}
                  okText="ลบ"
                  cancelText="ยกเลิก"
                  onConfirm={() => handleDelete(item.ID)}
                >
                  <Button type="link" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <div>
                {index + 1}. {item.name} <span style={{ opacity: 0.7 }}>ID: {item.ID}</span>
              </div>
            </List.Item>
          )}
        />
      </Card>

      {/* Modal แก้ไขชื่อ */}
      <Modal
        title={`แก้ไขหมวดหมู่ #${editing?.ID || ""}`}
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
            name="name"
            label="ชื่อหมวดหมู่"
            rules={[{ required: true, message: "กรุณากรอกชื่อหมวดหมู่" }]}
          >
            <Input placeholder="ระบุชื่อใหม่" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Category;
