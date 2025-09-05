import { useState } from "react";
import { Button, Card, Form, Input, message, Row, Col, Typography } from "antd";
import type { LoginRequest } from "../../../interfaces/Login";
import { useNavigate } from "react-router-dom";
import useEcomStore from "../../store/ecom-store";

const { Title, Text } = Typography; // ย้ายออกมานอก component ก็ได้

export default function LoginForm() {
  
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);

  const actionLogin = useEcomStore((state: any) => state.actionLogin);
  const token = useEcomStore((state: any) => state.token);   // ✅ ตั้งชื่อให้ตรงความจริง
  console.log("token from zustand:", token);

  const onFinish = async (values: LoginRequest) => {
    setLoading(true);
    try {
      // ✅ ใช้ค่าที่ actionLogin คืนมาให้ถูก
      const { user, token, hasShop } = await actionLogin(values);
      console.log("user:", user);
      console.log("hasShop:", hasShop);
      console.log("token:", token);

      messageApi.success({
        content: "Welcome back",
        duration: 1.0,
        onClose: () => {
          // จะเลือกเส้นทางตาม hasShop ก็ได้
          navigate("/");
          // หรือ: navigate(hasShop ? "/shop" : "/create-shop");
        },
      });
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed";
      messageApi.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Row
        align="middle"
        justify="center"
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: 16,
        }}
      >
        <Col>
          <Card
            style={{
              width: 500,
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
            <Row align="middle" justify="center" style={{ padding: "20px 0" }}>
              <Col span={24} style={{ textAlign: "center", marginBottom: 20 }}>
                <Title level={2} style={{ margin: 0, color: "#1890ff" }}>
                  Sign In
                </Title>
                <Text type="secondary">Access your account</Text>
              </Col>

              <Col span={24}>
                <Form<LoginRequest>
                  name="login"
                  onFinish={onFinish}
                  autoComplete="off"
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    label="Username or Email"
                    name="username"
                    rules={[{ required: true, message: "Please input your username or email!" }]}
                  >
                    <Input placeholder="Enter your username or email" disabled={loading} />
                  </Form.Item>

                  <Form.Item
                    label="Password"
                    name="password"
                    rules={[{ required: true, message: "Please input your password!" }]}
                  >
                    <Input.Password placeholder="Enter your password" disabled={loading} />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      disabled={loading}
                      style={{
                        width: "100%",
                        height: 48,
                        fontSize: 16,
                        borderRadius: 8,
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        border: "none",
                      }}
                    >
                      Sign In
                    </Button>

                    <Button
                      type="default"
                      block
                      disabled={loading}
                      style={{
                        marginTop: 12,
                        width: "100%",
                        height: 48,
                        fontSize: 16,
                        borderRadius: 8,
                      }}
                      onClick={() => navigate("/register")}
                    >
                      Register
                    </Button>
                  </Form.Item>
                </Form>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </>
  );
}
