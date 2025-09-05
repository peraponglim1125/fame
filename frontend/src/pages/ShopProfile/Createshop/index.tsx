import { useState } from "react";
import { Steps, Form, Input, Button, message, Radio, Row, Col } from "antd";
import axios from "axios";

import UploadLogo from "./UploadLogo";
import type { RcFile } from "antd/es/upload";
import { useNavigate } from "react-router-dom";
import useEcomStore from "../../../store/ecom-store";

export default function SellerShopWizardOneShot() {
  const [current, setCurrent] = useState(0);
  const [sellerForm] = Form.useForm();
  const [shopForm] = Form.useForm();
  const [logoFile, setLogoFile] = useState<RcFile | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshUser = useEcomStore((s: any) => s.refreshUser);
  const navigate = useNavigate();
  const [sellerData, setSellerData] = useState<{ name: string; address: string } | null>(null);

  const steps = [{ title: "ข้อมูลผู้ขาย" }, { title: "ข้อมูลร้านค้า" }];

  const nextFromSeller = async () => {
    try {
      const values = await sellerForm.validateFields(); // { name, address }
      setSellerData(values);                            // <-- เก็บไว้ก่อน
      setCurrent(1);
    } catch { }
  };


  const submitAll = async () => {
    try {
      await shopForm.validateFields();

      if (!sellerData) {
        message.error("ข้อมูลผู้ขายหาย กรุณากลับไปกรอกใหม่");
        setCurrent(0);
        return;
      }

      const v = shopForm.getFieldsValue();

      let logoPath = v.logo_path;
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        const up = await axios.post("/api/upload-logo", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        logoPath = up.data?.url;
      }
      if (!logoPath) {
        message.error("กรุณาอัปโหลดโลโก้ร้าน");
        return;
      }

      const payload = {
        seller_name: sellerData.name,       // ✅ ส่งจาก state
        seller_address: sellerData.address, // ✅ ส่งจาก state
        shop_name: v.shop_name,
        slogan: v.slogan,
        shop_description: v.shop_description,
        category_id: Number(v.shopCategoryID),
        logo_path: logoPath,
        address: {
          address: v.address,
          sub_district: v.sub_district,
          district: v.district,
          province: v.province,
        },
      };

      await axios.post("/api/seller-shop", payload, {
        headers: { "Content-Type": "application/json" },
      });
      await refreshUser();
      message.success("สร้างผู้ขายและร้านค้าเรียบร้อย");
      navigate("/user/profile");
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = err?.response?.data?.message || err?.response?.data?.error || "ไม่สำเร็จ";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <Steps current={current} items={steps} style={{ margin: "16px 0 24px" }} />

      {current === 0 && (
        <Form form={sellerForm} layout="vertical">
          <Form.Item label="ชื่อผู้ขาย" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="ที่อยู่ผู้ขาย" name="address" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" onClick={nextFromSeller}>ถัดไป</Button>
        </Form>
      )}

      {current === 1 && (
        <Form form={shopForm} layout="vertical">
          <Form.Item label="โลโก้ร้าน" name="logo_path" rules={[{ required: true, message: "กรุณาอัปโหลดโลโก้หรือใส่ URL" }]}>
            <UploadLogo onFileChange={(f) => { setLogoFile(f); shopForm.setFieldsValue({ logo_path: "uploaded" }) }} />
          </Form.Item>

          <Row gutter={[24, 8]}>
            <Col xs={24} md={12}>
              <Form.Item label="ชื่อร้านค้า" name="shop_name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="สโลแกน" name="slogan" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="คำอธิบาย" name="shop_description" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
              <Form.Item label="หมวดหมู่ร้านค้า" name="shopCategoryID" rules={[{ required: true }]}>
                <Radio.Group>
                  <Row gutter={[0, 8]}>
                    <Col span={12}><Radio value={1}>เสื้อผ้าแฟชั่น</Radio></Col>
                    <Col span={12}><Radio value={2}>อิเล็กทรอนิก</Radio></Col>
                    <Col span={12}><Radio value={3}>อาหาร</Radio></Col>
                    <Col span={12}><Radio value={4}>ของใช้จำเป็น</Radio></Col>
                    <Col span={12}><Radio value={5}>เกมมิ่งเกียร์</Radio></Col>
                  </Row>
                </Radio.Group>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="ที่อยู่" name="address" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="ตำบล/แขวง" name="sub_district" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="อำเภอ/เขต" name="district" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="จังหวัด" name="province" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>

          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 8 }}>
            <Button onClick={() => setCurrent(0)}>ย้อนกลับ</Button>
            <Button type="primary" onClick={submitAll} loading={loading}>บันทึก</Button>
          </div>
        </Form>
      )}
    </div>
  );
}
