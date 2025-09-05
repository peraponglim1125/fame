import React, { useMemo, useState, useEffect } from "react";
import dayjs from "dayjs";
import axios from "axios";
import {
  Form,
  Input,
  InputNumber,
  Button,
  Card,
  DatePicker,
  Upload,
  message,
  List,
  Tag,
  Space,
  Popconfirm,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";

type CodeImage = {
  uid: string;
  name: string;
  status: "done";
  url?: string;
  originFileObj?: File;
};

type DiscountCode = {
  id: number | string;
  name: string;
  amount: number;
  min_order: number;
  usage_limit: number;
  times_used: number;
  starts_at: string | null;
  expires_at: string | null;
  image_url?: string;
  created_at?: string;
  CreatedAt?: string; // เผื่อ GORM ส่งมาแบบตัวใหญ่
};

const API = "http://localhost:8080/api";
const API_HOST = "http://localhost:8080"; // ใช้ทำ absolute URL ให้รูป

const Createcode: React.FC = () => {
  const [form] = Form.useForm();
  const [createdCodes, setCreatedCodes] = useState<DiscountCode[]>([]);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, contextHolder] = message.useMessage();

  const isEditing = useMemo(() => !!editingId, [editingId]);

  // cleanup blob urls
  const [objectURLs, setObjectURLs] = useState<string[]>([]);
  const fileToURL = (file?: File | null) => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setObjectURLs((prev) => [...prev, url]);
    return url;
  };
  useEffect(() => {
    return () => {
      objectURLs.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [objectURLs]);

  // ✅ normalize API data
  const absolutize = (url?: string) =>
    url && url.startsWith("/uploads") ? `${API_HOST}${url}` : url;

  const normalize = (raw: any): DiscountCode => ({
    id: raw.id ?? raw.ID, // << สำคัญ
    name: raw.name ?? raw.Name,
    amount: raw.amount ?? raw.Amount,
    min_order: raw.min_order ?? raw.MinOrder ?? 0,
    usage_limit: raw.usage_limit ?? raw.UsageLimit ?? 0,
    times_used: raw.times_used ?? raw.TimesUsed ?? 0,
    starts_at: raw.starts_at ?? raw.StartsAt ?? null,
    expires_at: raw.expires_at ?? raw.ExpiresAt ?? null,
    image_url: absolutize(raw.image_url ?? raw.ImageURL),
    created_at: raw.created_at ?? raw.CreatedAt ?? undefined,
  });

  // ---------------- API helpers ----------------
  const fetchCodes = async () => {
    try {
      const res = await axios.get(`${API}/discountcodes`);
      const list: DiscountCode[] = (res.data?.data || []).map(normalize);
      setCreatedCodes(list);
    } catch (e: any) {
      console.error(e);
      msg.error(e?.response?.data?.message || "โหลดรายการโค้ดไม่สำเร็จ");
    }
  };

  const createCode = async (fd: FormData) => {
    const res = await axios.post(`${API}/discountcodes`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return normalize(res.data?.data);
  };

  const updateCode = async (id: number | string, fd: FormData) => {
    const res = await axios.put(`${API}/discountcodes/${id}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return normalize(res.data?.data);
  };

  const deleteCode = async (id: number | string) => {
    return axios.delete(`${API}/discountcodes/${String(id)}`);
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  // ---------------- Form submit ----------------
  const onFinish = async (values: any) => {
    setSubmitting(true);
    const startsISO = values.starts_at ? values.starts_at.toISOString() : "";
    const expiresISO = values.expires_at ? values.expires_at.toISOString() : "";
    const imageFile: File | null =
      values.image && values.image[0]?.originFileObj ? values.image[0].originFileObj : null;

    const fd = new FormData();
    fd.append("name", values.name);
    fd.append("amount", String(values.amount));
    fd.append("min_order", String(values.min_order ?? 0));
    fd.append("usage_limit", String(values.usage_limit ?? 0));
    fd.append("starts_at", startsISO);
    fd.append("expires_at", expiresISO);
    if (imageFile) fd.append("image", imageFile);

    try {
      if (!isEditing) {
        const created = await createCode(fd);
        setCreatedCodes((prev) => [created, ...prev]);
        msg.success("บันทึกโค้ดสำเร็จ");
      } else {
        const updated = await updateCode(editingId!, fd);
        setCreatedCodes((prev) =>
          prev.map((it) => (String(it.id) === String(editingId) ? updated : it))
        );
        setEditingId(null);
        msg.success("อัปเดตโค้ดสำเร็จ");
      }
      form.resetFields();
    } catch (e: any) {
      console.error(e);
      msg.error(e?.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- Upload guard ----------------
  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      msg.error("สามารถอัปโหลดได้เฉพาะไฟล์รูปภาพเท่านั้น!");
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  // ---------------- Edit / Delete ----------------
  const fillFormForEdit = (item: DiscountCode) => {
    setEditingId(item.id);

    const fileList: CodeImage[] = item.image_url
      ? [
          {
            uid: String(item.id),
            name: "code-image",
            status: "done",
            url: item.image_url,
          },
        ]
      : [];

    form.setFieldsValue({
      name: item.name,
      amount: item.amount,
      min_order: item.min_order,
      usage_limit: item.usage_limit,
      times_used: item.times_used,
      starts_at: item.starts_at ? dayjs(item.starts_at) : null,
      expires_at: item.expires_at ? dayjs(item.expires_at) : null,
      image: fileList as any,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    form.resetFields();
  };

  const removeItem = async (id: number | string) => {
    if (id == null) {
      msg.error("ไม่พบรหัสโค้ดที่จะลบ");
      return;
    }
    try {
      await deleteCode(id);
      setCreatedCodes((prev) => prev.filter((it) => String(it.id) !== String(id)));
      if (String(editingId) === String(id)) cancelEdit();
      msg.success("ลบโค้ดแล้ว");
    } catch (e: any) {
      console.error(e);
      msg.error(e?.response?.data?.message || "ลบไม่สำเร็จ");
    }
  };

  return (
    <>
      {contextHolder}
      <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
        <Card
          title={isEditing ? "แก้ไขโค้ดส่วนลด" : "สร้างโค้ดส่วนลดใหม่"}
          style={{ marginBottom: 16 }}
          extra={
            isEditing ? (
              <Button onClick={cancelEdit} danger>
                ยกเลิกการแก้ไข
              </Button>
            ) : null
          }
        >
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="name"
              label="ชื่อโค้ด"
              rules={[{ required: true, message: "กรุณากรอกชื่อโค้ด" }]}
            >
              <Input placeholder="เช่น โปรลดต้นเดือน" />
            </Form.Item>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Form.Item
                name="amount"
                label="จำนวนเงินที่ลด (บาท)"
                rules={[{ required: true, message: "กรุณากรอกจำนวนลด" }]}
              >
                <InputNumber min={1} style={{ width: "100%" }} placeholder="เช่น 50" />
              </Form.Item>

              <Form.Item name="min_order" label="ยอดสั่งขั้นต่ำ (บาท)" initialValue={0}>
                <InputNumber min={0} style={{ width: "100%" }} placeholder="เช่น 100" />
              </Form.Item>

              <Form.Item name="usage_limit" label="จำนวนครั้งที่ใช้ได้" initialValue={0}>
                <InputNumber min={0} style={{ width: "100%" }} placeholder="0 = ไม่จำกัด" />
              </Form.Item>

              <Form.Item name="times_used" label="จำนวนครั้งที่ใช้ไปแล้ว" initialValue={0}>
                <InputNumber min={0} style={{ width: "100%" }} disabled />
              </Form.Item>

              <Form.Item name="starts_at" label="วันเริ่มใช้">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>

              <Form.Item name="expires_at" label="วันหมดอายุ">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </div>

            <Form.Item
              name="image"
              label="รูปภาพโค้ดส่วนลด"
              valuePropName="fileList"
              getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
              rules={[{ required: !isEditing, message: "กรุณาอัปโหลดรูปภาพ" }]}
            >
              <Upload listType="picture-card" maxCount={1} beforeUpload={beforeUpload}>
                <div>
                  <UploadOutlined /> <div style={{ marginTop: 8 }}>อัปโหลด</div>
                </div>
              </Upload>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {isEditing ? "อัปเดตโค้ด" : "บันทึกโค้ด"}
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="โค้ดที่สร้างแล้ว">
          {createdCodes.length === 0 ? (
            <div style={{ color: "#888" }}>ยังไม่มีโค้ดที่สร้าง</div>
          ) : (
            <List
              itemLayout="vertical"
              dataSource={createdCodes}
              renderItem={(item) => (
                <List.Item
                  key={String(item.id)}
                  extra={
                    item.image_url ? (
                      <img
                        src={item.image_url}
                        alt="code"
                        style={{
                          width: 120,
                          height: 120,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #eee",
                        }}
                      />
                    ) : null
                  }
                  actions={[
                    <Button key="edit" onClick={() => fillFormForEdit(item)}>
                      แก้ไข
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="ลบโค้ดนี้?"
                      okText="ลบ"
                      cancelText="ยกเลิก"
                      onConfirm={() => removeItem(item.id)}
                    >
                      <Button danger>ลบ</Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space wrap>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                        <Tag color="green">-฿{item.amount}</Tag>
                        {item.min_order > 0 && <Tag color="blue">ขั้นต่ำ ฿{item.min_order}</Tag>}
                        {item.usage_limit > 0 ? (
                          <Tag color="purple">ใช้ได้ {item.usage_limit} ครั้ง</Tag>
                        ) : (
                          <Tag>ไม่จำกัดจำนวนครั้ง</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div style={{ lineHeight: 1.8 }}>
                        <div>
                          ช่วงเวลาใช้:{" "}
                          <b>
                            {item.starts_at ? new Date(item.starts_at).toLocaleDateString() : "—"} ถึง{" "}
                            {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : "—"}
                          </b>
                        </div>
                        {item.created_at && (
                          <div>
                            สร้างเมื่อ: <b>{new Date(item.created_at).toLocaleString()}</b>
                          </div>
                        )}
                        <div>ใช้ไปแล้ว: <b>{item.times_used}</b> ครั้ง</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    </>
  );
};

export default Createcode;
