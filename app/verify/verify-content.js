"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { IoArrowBack } from "react-icons/io5";

export default function VerifyComponent() {
  const router = useRouter();
  const params = useSearchParams();

  const email = params.get("email");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!email) {
      alert("البريد الإلكتروني غير موجود.");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.get(
        "https://us-central1-waffer-741af.cloudfunctions.net/api/checkVerified",
        { params: { email } }
      );

      const user = res.data;

      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userName", user.username || "");

      setLoading(false);
      router.push("/");

    } catch (err) {
      setLoading(false);
      let message = err.response?.data.error || "حدث خطأ أثناء تأكيد الحساب.";
      if (message === "Email not verified yet") message = "يرجى تأكيد بريدك الإلكتروني.";
      alert(message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">

        <button className="back-btn" onClick={() => router.push("/signup")}>
          <IoArrowBack color="#fff" size={20} />
        </button>

        <h1 className="login-title">تأكيد الحساب</h1>

        <p className="login-subtitle">تم إرسال رابط تفعيل إلى بريدك:</p>
        <p className="login-email">{email}</p>

        <button
          className={`login-btn ${loading ? "disabled" : ""}`}
          onClick={handleVerify}
          disabled={loading}
        >
          {loading ? "جاري التحقق..." : "لقد أكدت بريدي، المتابعة"}
        </button>
      </div>
    </div>
  );
}
