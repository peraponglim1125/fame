import {
  Button,
  Card,
  Form,
  Input,
  message,
  Row,
  Col,
  Typography,
  Select,
  DatePicker,
  InputNumber,
} from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import useEcomStore from "../../store/ecom-store";
const { Title, Text } = Typography;

type FormValues = {
  username: string;
  password: string;

  firstName?: string;
  lastName?: string;
  email?: string;
  age?: number;
  phone?: string;
  birthday?: Dayjs;
  address?: string;

  genderID?: number; // 1=ชาย, 2=หญิง
};

export default function RegisterForm() {
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const actionRegister = useEcomStore((s: any) => s.actionRegister);
  const [form] = Form.useForm<FormValues>();

  const onFinish = async (values: FormValues) => {
    const payload = {
      username: values.username,
      password: values.password,
      ...(values.firstName ? { firstName: values.firstName } : {}),
      ...(values.lastName ? { lastName: values.lastName } : {}),
      ...(values.email ? { email: values.email } : {}),
      ...(values.age !== undefined ? { age: values.age } : {}),
      ...(values.phone ? { phone: values.phone } : {}),
      ...(values.birthday ? { birthday: values.birthday.toDate().toISOString() } : {}),
      ...(values.address ? { address: values.address } : {}),
      ...(values.genderID ? { genderID: values.genderID } : {}),
    };

    try {
      const { user } = await actionRegister(payload); // ✅ ใช้ store
      if (!user) {
        messageApi.error("Unexpected response");
        return;
      }
      messageApi.success({
        content: `Register success! Welcome ${user.username}`,
        duration: 1.2,
        onClose: () => navigate("/"),
      });
      form.resetFields();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.response?.data?.error || err?.message || "Error: cannot register";
      messageApi.error(msg);
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
        }}
      >
        <Col>
          <Card
            style={{
              width: 700,
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
            <Row align="middle" justify="center" style={{ padding: "20px 0" }}>
              <Col span={24} style={{ textAlign: "center", marginBottom: 20 }}>
                <Title level={2} style={{ margin: 0, color: "#1890ff" }}>
                  Registration
                </Title>
                <Text type="secondary">Create your account</Text>
              </Col>

              <Col span={24}>
                <Form<FormValues>
                  name="register"
                  onFinish={onFinish}
                  autoComplete="off"
                  layout="vertical"
                  size="large"
                >
                  <Row gutter={[16, 8]}>
                    {/* Member */}
                    <Col xs={24} sm={12}>
                      <Form.Item
                        label="Username"
                        name="username"
                        rules={[
                          { required: true, message: "Please input your username!" },
                          { min: 1, message: "At least 1 characters" },
                        ]}
                      >
                        <Input placeholder="Enter your username" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Form.Item
                        label="Password"
                        name="password"
                        rules={[
                          { required: true, message: "Please input your password!" },
                          { min: 1, message: "At least 1 characters" },
                        ]}
                      >
                        <Input.Password placeholder="Enter your password" />
                      </Form.Item>
                    </Col>

                    {/* People */}
                    <Col xs={24} sm={12}>
                      <Form.Item
                        label="First name"
                        name="firstName"
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <Input placeholder="First name" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Form.Item
                        label="Last name"
                        name="lastName"
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <Input placeholder="Last name" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                          { required: false, message: "Required" },
                          { type: "email", message: "Invalid email" },
                        ]}
                      >
                        <Input placeholder="name@example.com" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Form.Item
                        label="Phone"
                        name="phone"
                        rules={[{ required: false, message: "Required" }]}
                      >
                        <Input placeholder="08x-xxx-xxxx" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Form.Item
                        label="Age"
                        name="age"
                        rules={[{ required: false, message: "Required" }]}
                      >
                        <InputNumber min={0} style={{ width: "100%" }} placeholder="Age" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Form.Item
                        label="Birthday"
                        name="birthday"
                        rules={[{ required: false, message: "Required" }]}
                      >
                        <DatePicker
                          style={{ width: "100%" }}
                          format="YYYY-MM-DD"
                          disabledDate={(current) => !!current && current > dayjs()}
                          placeholder="Select date"
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Form.Item
                        label="Gender"
                        name="genderID"
                        rules={[{ required: false, message: "Please select gender!" }]}
                      >
                        <Select placeholder="Select gender">
                          <Select.Option value={1}>ชาย</Select.Option>
                          <Select.Option value={2}>หญิง</Select.Option>

                        </Select>
                      </Form.Item>
                    </Col>

                    <Col span={24}>
                      <Form.Item
                        label="Address"
                        name="address"
                        rules={[{ required: false, message: "Required" }]}
                      >
                        <Input.TextArea rows={3} placeholder="Address" />
                      </Form.Item>
                    </Col>

                    <Col span={24}>
                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          style={{
                            width: "100%",
                            height: 48,
                            fontSize: 16,
                            borderRadius: 8,
                            background:
                              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            border: "none",
                          }}
                        >
                          Create Account
                        </Button>
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </>
  );
}
