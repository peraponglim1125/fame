// EditShopProfile.tsx  // [CHANGED] ← เปลี่ยนชื่อไฟล์/คอมโพเนนต์ให้เป็นหน้าแก้ไขชัดเจน

import { useEffect, useMemo, useState } from 'react';
import UploadLogo from '../Createshop/UploadLogo';
import { Divider, Col, Row, Button, Form, Input, message, Radio } from 'antd';
import { UploadOutlined } from '@ant-design/icons'; // [CHANGED] ลบไอคอนที่ไม่ใช้
import {  useNavigate } from 'react-router-dom';
import '../Createshop/index.css';
import { useForm } from 'antd/es/form/Form';
import type { RcFile } from 'antd/es/upload';
import axios from 'axios';
import useEcomStore from '../../../store/ecom-store';
import { ListMyProfile } from '../../../api/auth';

// [NEW] ประกาศชนิดข้อมูลที่ได้จาก backend (ย่อ/เท่าที่ใช้)
type ShopProfileDTO = {
  shop_name: string;
  slogan: string;
  shop_description: string;
  logo_path: string;          // เช่น "/uploads/logo/xxx.png"
  ShopCategoryID?: number;    // อาจมีหรือไม่มีก็ได้
  Category?: { ID?: number; category_name?: string };
  ShopAddress?: {
    address?: string;
    sub_district?: string;
    district?: string;
    province?: string;
  };
};

function EditShopProfile() { // [CHANGED] เปลี่ยนชื่อคอมโพเนนต์
  const user   = useEcomStore((s: any) => s.user);
  const token  = useEcomStore((s: any) => s.token); // [NEW] ใช้แนบ auth header ตอนเรียก /me และ update
  const navigate = useNavigate();

  const [form] = useForm();
  const [logoFile, setLogoFile] = useState<RcFile | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  // [NEW] เก็บค่า init (ที่โหลดมาจาก backend) เพื่อใช้เทียบตอนส่ง update แบบ partial
  const [init, setInit] = useState<ShopProfileDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // [NEW] โลโก้ปัจจุบันเพื่อแสดงพรีวิว
  const previewLogo = useMemo(
    () => (init?.logo_path ? `http://localhost:8080${init.logo_path}` : ''),
    [init]
  );

  // [CHANGED] โหลดข้อมูลร้านปัจจุบันมาเติมฟอร์ม (แทน logic hasShop เดิม)
  useEffect(() => {
    (async () => {
      try {
        const res = await ListMyProfile(token)
        const d: ShopProfileDTO = res.data?.data;
        console.log(d)
        // map ค่าจาก backend → ชื่อฟิลด์ในฟอร์ม
        form.setFieldsValue({
          shop_name: d.shop_name,
          slogan: d.slogan,
          shop_description: d.shop_description,
          shopCategoryID: d.ShopCategoryID ?? d.Category?.ID, // มีตัวไหนก็ใช้ตัวนั้น
          address: d.ShopAddress?.address ?? '',
          sub_district: d.ShopAddress?.sub_district ?? '',
          district: d.ShopAddress?.district ?? '',
          province: d.ShopAddress?.province ?? '',
        });

        setInit(d);
      } catch (error: any) {
        const msg = error?.response?.data?.error || 'โหลดข้อมูลร้านไม่สำเร็จ';
        messageApi.error(msg);
        // ถ้าอยากเด้งกลับหน้าก่อนหน้า:
        // navigate('/user/profile');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // [CHANGED] onFinish สำหรับ "แก้ไข": ไม่บังคับต้องมีโลโก้ใหม่, และส่งเฉพาะฟิลด์ที่เปลี่ยน
  const onFinish = async (values: any) => {
    try {
      setLoading(true);

      // 1) ถ้ามีไฟล์โลโก้ใหม่ → อัปโหลดก่อน
      let newLogoUrl: string | undefined;
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        const up = await axios.post('http://localhost:8080/api/upload-logo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        newLogoUrl = up.data?.url; // ตัวอย่าง: "/uploads/logo/xxx.png"
      }

      // 2) สร้าง payload แบบ partial เฉพาะฟิลด์ที่เปลี่ยน
      const body: any = { seller_id: user?.id }; 

      if (!init || values.shop_name !== init.shop_name) {
        body.shop_name = values.shop_name;
      }
      if (!init || values.slogan !== init.slogan) {
        body.slogan = values.slogan;
      }
      if (!init || values.shop_description !== init.shop_description) {
        body.shop_description = values.shop_description;
      }
      if (newLogoUrl) {
        body.logo_path = newLogoUrl;
      }

      const initCategory = init?.ShopCategoryID ?? init?.Category?.ID ?? undefined;
      if (!init || Number(values.shopCategoryID) !== Number(initCategory)) {
        body.category_id = Number(values.shopCategoryID);
      }

      const addr: any = {};
      if (!init || (init.ShopAddress?.address ?? '') !== values.address) {
        addr.address = values.address;
      }
      if (!init || (init.ShopAddress?.sub_district ?? '') !== values.sub_district) {
        addr.sub_district = values.sub_district;
      }
      if (!init || (init.ShopAddress?.district ?? '') !== values.district) {
        addr.district = values.district;
      }
      if (!init || (init.ShopAddress?.province ?? '') !== values.province) {
        addr.province = values.province;
      }
      if (Object.keys(addr).length > 0) {
        body.address = addr;
      }

      // ถ้าไม่มีอะไรเปลี่ยนเลย (มีแค่ seller_id) ก็ไม่ต้องยิง
      if (Object.keys(body).length === 1) {
        messageApi.info('ไม่มีข้อมูลที่เปลี่ยนแปลง');
        return;
      }

      // 3) อัปเดต
      await axios.put('http://localhost:8080/api/UpdateShopProfile', body, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      messageApi.success('บันทึกการแก้ไขสำเร็จ');
      // อยากกลับหน้าโปรไฟล์ก็:
      // navigate('/user/profile');
      // หรือรีโหลดค่าใหม่:
      if (newLogoUrl && init) {
        setInit({ ...init, logo_path: newLogoUrl });
      }
      setLogoFile(null);
      navigate('/user/profile');
    } catch (error: any) {
      const errMsg = error?.response?.data?.error || 'อัปเดตร้านค้าไม่สำเร็จ';
      messageApi.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <div className="container">
        <Form
          form={form}
          name="edit-shop"                                   // [CHANGED] เปลี่ยนชื่อฟอร์ม
          labelAlign="right"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 12 }}
          colon={false}
          style={{ maxWidth: '1000px', margin: '0 auto' }}
          onFinish={onFinish}
          disabled={loading}                                  // [NEW] ล็อกฟอร์มระหว่างโหลด/ส่ง
        >
          {/* โลโก้ร้าน: โหมดแก้ไข "ไม่บังคับ" อัปโหลดใหม่ */}
          <Form.Item
            label="โลโก้ร้าน"
            name="logo_path"
            rules={[]}                                        // [CHANGED] เอา required ออก
          >
            <div style={{ display: 'grid', gap: 8 }}>
              <h4>รูปเก่า</h4>
              {previewLogo && (
                <img
                  src={previewLogo}
                  alt="current logo"
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: 'contain',
                    border: '1px solid #eee',
                    borderRadius: 8,
                    background: '#fff',
                  }}
                />
              )}

              <UploadLogo
                onFileChange={(file) => {
                  setLogoFile(file);                          // [CHANGED] เก็บไฟล์ไว้ ส่งตอนกดบันทึก
                  // ไม่ต้อง set form field เพื่อบังคับ validate แล้ว
                }}
              />
            </div>
          </Form.Item>

          <Divider style={{ borderColor: 'black' }} />

          <div className="form2">
            <div>
              <Form.Item
                label={<span style={{ fontSize: '16px' }}>ชื่อร้านค้า</span>}
                name="shop_name"
                rules={[{ required: true, message: 'กรุณากรอกชื่อร้านค้า' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontSize: '16px' }}>สโลแกนร้านค้า</span>}
                name="slogan"
                rules={[{ required: true, message: 'กรุณากรอกสโลแกน' }]}   // [CHANGED] ข้อความ validate
              >
                <Input />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontSize: '16px' }}>คำอธิบายร้านค้า</span>}
                name="shop_description"
                rules={[{ required: true, message: 'กรุณากรอกรายละเอียด' }]}
              >
                <Input.TextArea rows={4} />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontSize: '16px' }}>หมวดหมู่ร้านค้า</span>}
                name="shopCategoryID"
                rules={[{ required: true, message: 'กรุณาเลือกหมวดหมู่ร้านค้า' }]}
              >
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
            </div>

            <div>
              <Form.Item
                label={<span style={{ fontSize: '16px' }}>ที่อยู่</span>}
                name="address"
                rules={[{ required: true, message: 'กรุณากรอกที่อยู่' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontSize: '16px' }}>ตำบล/แขวง</span>}
                name="sub_district"
                rules={[{ required: true, message: 'กรุณากรอกตำบล/แขวง' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontSize: '16px' }}>อำเภอ/เขต</span>}
                name="district"
                rules={[{ required: true, message: 'กรุณากรอกอำเภอ/เขต' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontSize: '16px' }}>จังหวัด</span>}
                name="province"
                rules={[{ required: true, message: 'กรุณากรอกจังหวัด' }]}
              >
                <Input />
              </Form.Item>
            </div>
          </div>

          <Form.Item wrapperCol={{ span: 24 }} style={{ textAlign: 'center', marginTop: '24px' }}>
            <Button
              icon={<UploadOutlined />}
              style={{ background: '#fe7e01', color: 'white' }}
              htmlType="submit"
            >
              บันทึกการแก้ไข {/* [CHANGED] ปรับข้อความปุ่ม */}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </>
  );
}

export default EditShopProfile; // [CHANGED] export ชื่อใหม่ให้ชัดเจน
