import { useState } from "react";
import { Button, Card, Form, Input, message, Row, Col, Typography } from "antd";
import type { LoginRequest } from "../../../interfaces/Login";
import { useNavigate } from "react-router-dom";
import useEcomStore from "../../store/ecom-store";

const { Title, Text } = Typography;

export default function LoginForm() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);

  const actionLogin = useEcomStore((state: any) => state.actionLogin);
  const tokenInStore = useEcomStore((state: any) => state.token);
  console.log("token from zustand:", tokenInStore);

  const persistAuth = (user: any, token?: string) => {
    const ID = Number(user?.ID ?? user?.id);
    const username = user?.UserName ?? user?.username ?? user?.userName ?? "Me";
    if (!ID || Number.isNaN(ID)) throw new Error("Invalid user ID from login response");

    localStorage.setItem("auth:user", JSON.stringify({ ID, username }));
    localStorage.setItem("uid", String(ID));          // dev mode header: Bearer uid:<ID>
    if (token) localStorage.setItem("token", token);  // JWT (ถ้ามี)

    window.dispatchEvent(new Event("auth-changed"));  // แจ้งให้ Messenger/หน้าอื่นรีโหลดผู้ใช้
  };

  const onFinish = async (values: LoginRequest) => {
    setLoading(true);
    try {
      const { user, token } = await actionLogin(values);
      persistAuth(user, token);

      messageApi.success({
        content: "Welcome back",
        duration: 0.8,
        onClose: () => {
          // ✅ เปลี่ยนเป็นไปหน้า Home (หรือจะไม่ navigate เลยก็ได้)
          navigate("/"); 
          // ถ้าไม่อยากเปลี่ยนหน้าเลย: ลบบรรทัด navigate("/") ออก
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
                <Title level={2} style={{ margin: 0, color: "#1890ff" }}>Sign In</Title>
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
                      style={{ marginTop: 12, width: "100%", height: 48, fontSize: 16, borderRadius: 8 }}
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
