import { useEffect, useState, type JSX } from "react";
import { Navigate } from "react-router-dom";
import useEcomStore from "../../store/ecom-store";
import { currentUser } from "../../api/auth";

type Props = { element: JSX.Element };

const ProtectRouteUser: React.FC<Props> = ({ element }) => {
  const [status, setStatus] = useState<"checking" | "ok" | "deny">("checking");
  const token = useEcomStore((s: any) => s.token);

  useEffect(() => {
    let alive = true;

    const verify = async () => {
      if (!token) return; // ❗️รอ token มา ไม่รีบ setStatus("deny")
      try {
        await currentUser(token);
        if (alive) setStatus("ok");
      } catch {
        if (alive) setStatus("deny");
      }
    };

    verify();

    return () => {
      alive = false;
    };
  }, [token]);

  // ❗️ตอน token ยังไม่มา ยังไม่ตัดสินใจ deny
  if (!token || status === "checking") return <div>Loading...  Login กก่อนนนนน</div>;

  if (status === "deny") return <Navigate to="/login" replace />;

  return element;
};


export default ProtectRouteUser;
