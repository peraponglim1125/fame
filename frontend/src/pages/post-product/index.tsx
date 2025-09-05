import { useEffect, useState } from 'react';
import { useForm } from 'antd/es/form/Form';
import { useParams, useNavigate } from 'react-router-dom';
import Uploadimage from './Uploadimage';
import { Divider, Col, Row, Button, Form, Input, message, Radio } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import type { PostProductPayload } from '../../../interfaces/PostProductPayload';
import useEcomStore from '../../store/ecom-store';
import axios from 'axios';

import './index.css';
import { getAllcategory } from '../../api/categoty';

const API = 'http://localhost:8080/api';

function PostProduct() {
  const { postId } = useParams();
  const isEdit = !!postId;
  const navigate = useNavigate();

  const [form] = useForm();
  const seller_id = useEcomStore((state) => state.user?.sellerID);
  const token = useEcomStore((s: any) => s.token);

  const [files, setFiles] = useState<RcFile[]>([]);
  const [oldImages, setOldImages] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // เวลาเลือกไฟล์ อัปเดต field ซ่อนสำหรับ validate
  const handleFileSelect = (selectedFiles: RcFile[]) => {
    setFiles(selectedFiles);
    form.setFieldsValue({ upload_images: selectedFiles.length || 0 });
    form.validateFields(['upload_images']).catch(() => {});
  };

  // โหลด category
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getAllcategory();
        setCategories(res.data?.data || []);
      } catch (err) {
        console.error('โหลดหมวดหมู่ล้มเหลว:', err);
        message.error('โหลดหมวดหมู่ล้มเหลว');
      }
    };
    fetchCategories();
  }, []);

  // โหลดข้อมูลตอนแก้ไข
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await axios.get(`${API}/post-products/${postId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        hydrateFromPost(res.data?.data);
      } catch (err) {
        console.error(err);
        message.error('ไม่สามารถโหลดข้อมูลที่จะแก้ไขได้');
      }
    })();
  }, [isEdit, postId, token]);

  const hydrateFromPost = (p: any) => {
    const productObj = p?.Product || p?.product || {};
    const categoryId =
      p?.Category_ID ?? p?.category_id ?? p?.Category?.ID ?? p?.category?.id;

    form.setFieldsValue({
      product_name: productObj?.name ?? p?.name ?? '',
      description: productObj?.description ?? p?.description ?? '',
      price: productObj?.price ?? '',
      quantity: productObj?.quantity ?? '',
      category_id: categoryId,
    });

    const imgsFromObj = productObj?.ProductImage || productObj?.productImage || [];
    const imgs = (Array.isArray(imgsFromObj) ? imgsFromObj : [])
      .map((x: any) => (typeof x === 'string' ? x : `http://localhost:8080${x?.image_path}`))
      .filter(Boolean);

    setOldImages(imgs);
  };

  const onFinish = async (values: Omit<PostProductPayload, 'images'>) => {
    if (!seller_id) {
      message.error('ไม่พบผู้ขาย (seller_id)');
      return;
    }

    try {
      // 1) อัปโหลดรูปใหม่ถ้ามี
      let imageUrls: string[] | undefined;
      if (files.length > 0) {
        const fd = new FormData();
        files.forEach((f) => fd.append('files', f));
        const up = await axios.post(`${API}/upload-Product`, fd, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        imageUrls = up.data?.urls || [];
      }

      // 2) แก้ไข
      if (isEdit) {
        const body: any = {
          post_id: Number(postId),
          name: String(values.product_name).trim(),
          description: String(values.description).trim(),
          price: Number(values.price),
          quantity: Number(values.quantity),
          category_id: Number((values as any).category_id),
        };
        if (imageUrls && imageUrls.length > 0) body.images = imageUrls;

        await axios.put(`${API}/UpdateProduct`, body, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        message.success('อัปเดตสินค้าเรียบร้อย');
        navigate('/user');
        return;
      }

      // 3) สร้างใหม่
      if (!imageUrls || imageUrls.length === 0) {
        message.error('กรุณาอัปโหลดภาพอย่างน้อย 1 รูป');
        return;
      }

      const payload = {
        name: String(values.product_name).trim(),
        description: String(values.description).trim(),
        price: Number(values.price),
        quantity: Number(values.quantity),
        category_id: Number((values as any).category_id),
        seller_id: Number(seller_id),
        images: imageUrls,
      };

      if (
        !payload.name ||
        !payload.description ||
        Number.isNaN(payload.price) ||
        Number.isNaN(payload.quantity) ||
        !payload.category_id ||
        !payload.seller_id ||
        !payload.images?.length
      ) {
        message.error('กรอกข้อมูลให้ครบ และรูปแบบต้องถูกต้อง');
        return;
      }

      await axios.post(`${API}/post-Product`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      message.success('บันทึกสินค้าสำเร็จ');
      navigate('/user');
      form.resetFields();
      setFiles([]);
      form.setFieldsValue({ upload_images: 0 });
    } catch (err: any) {
      console.error(err?.response?.data || err);
      message.error(err?.response?.data?.error || 'ทำรายการไม่สำเร็จ');
    }
  };

  return (
    <div className="container">
      <div className="form">
        <Form
          form={form}
          name="wrap"
          labelCol={{ flex: '200px' }}
          labelAlign="left"
          labelWrap
          wrapperCol={{ flex: 1 }}
          colon={false}
          style={{ maxWidth: 1000 }}
          onFinish={onFinish}
        >
          {/* อัปโหลด + พรีวิว */}
          <Form.Item style={{ marginLeft: '100px' }}>
            <div style={{ display: 'flex' }}>
              <h4 style={{ marginRight: 15 }}>
                {isEdit ? 'ภาพสินค้า (อัปโหลดใหม่เพื่อแทนที่ได้)' : 'ภาพสินค้า'}
              </h4>
              <Uploadimage onFileSelect={handleFileSelect} />
            </div>

            {isEdit && oldImages.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {oldImages.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`old-${i}`}
                    style={{
                      width: 70,
                      height: 70,
                      objectFit: 'contain',
                      border: '1px solid #eee',
                      borderRadius: 8,
                    }}
                  />
                ))}
              </div>
            )}
          </Form.Item>

          {/* ฟิลด์ซ่อนสำหรับ validate จำนวนรูปตอน create */}
          <Form.Item
            name="upload_images"
            initialValue={0} // ✅ กัน uncontrolled → controlled
            rules={
              isEdit
                ? []
                : [
                    {
                      validator: (_, value) =>
                        value && value > 0
                          ? Promise.resolve()
                          : Promise.reject(new Error('กรุณาอัปโหลดภาพอย่างน้อย 1 รูป')),
                    },
                  ]
            }
            noStyle
          >
            <Input type="hidden" /> {/* ✅ ใช้ Input ของ antd */}
          </Form.Item>

          <Form.Item noStyle>
            <Divider style={{ borderColor: 'black' }} />
          </Form.Item>

          <div className="Card1">
            <div style={{ paddingRight: '100px', paddingLeft: '100px' }}>
              <Form.Item
                label={<h4>ชื่อสินค้า</h4>}
                name="product_name"
                rules={[{ required: true, message: 'กรุณากรอกชื่อสินค้า' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label={<h4>ราคา</h4>}
                name="price"
                rules={[{ required: true, message: 'กรุณากรอกราคา' }]}
              >
                <Input type="number" inputMode="numeric" />
              </Form.Item>

              <Form.Item
                label={<h4>จำนวนสินค้า</h4>}
                name="quantity"
                rules={[{ required: true, message: 'กรุณากรอกจำนวน' }]}
              >
                <Input type="number" inputMode="numeric" />
              </Form.Item>

              <Form.Item
                label={<h4>รายละเอียดสินค้า</h4>}
                name="description"
                rules={[{ required: true, message: 'กรุณากรอกรายละเอียด' }]}
              >
                <Input.TextArea rows={4} />
              </Form.Item>
            </div>

            <div>
              <Form.Item
                label={<h4>หมวดหมู่สินค้า</h4>}
                name="category_id"
                rules={[{ required: true, message: 'กรุณาเลือกหมวดหมู่สินค้า' }]}
              >
                <Radio.Group>
                  <Row>
                    {categories.map((cat) => (
                      <Col span={12} key={cat.ID}>
                        <Radio value={Number(cat.ID)}>{cat.name}</Radio>
                      </Col>
                    ))}
                  </Row>
                </Radio.Group>
              </Form.Item>
            </div>
          </div>

          <Form.Item label=" ">
            <Button
              icon={<UploadOutlined />}
              style={{ background: '#fe7e01', marginLeft: 230, color: '#fff' }}
              htmlType="submit"
            >
              {isEdit ? 'Update' : 'Submit'}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}

export default PostProduct;
