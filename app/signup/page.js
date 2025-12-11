"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { IoArrowBack } from "react-icons/io5";

export default function Signup() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Email regex
  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      alert("الرجاء ملء جميع الحقول.");
      return;
    }

    if(name.length < 3) {
      alert("يجب ان يحتوي الاسم على 3 احرف على الاقل");
      return;
    }

    if(name.length > 15) {
      alert("يجب أن لا يتجاوز الإسم 15 حرفا.");
      return;
    }

    if (!isValidEmail(email)) {
      alert("الرجاء إدخال بريد إلكتروني صحيح.");
      return;
    }

    if (password.length < 6) {
      alert("يجب أن تكون كلمة المرور 6 أحرف على الأقل.");
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        "https://us-central1-waffer-741af.cloudfunctions.net/api/signup",
        { username: name, email, password }
      );

      setLoading(false);

      // redirect to verify page
      router.push(`/verify?email=${email}`);

    } catch (err) {
      setLoading(false);

      let message = err.response?.data?.error || "حدث خطأ أثناء إنشاء الحساب.";

      if (message === "Email already exists") {
        message = "البريد الإلكتروني مستخدم مسبقاً.";
      }

      alert(message);
    }
  };

  return (
    <div className="login-container">

      <div className="login-card">
        <button
          className="back-btn"
          onClick={() => router.push("/")}
        >
          <IoArrowBack color="#fff" size={20}/>
        </button>

        <h1 className="login-title">إنشاء حساب جديد</h1>

        {/* Full name */}
        <label className="login-label">الإسم الكامل</label>
        <input
          className="login-input"
          placeholder="الإسم الكامل"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Email */}
        <label className="login-label">البريد الإلكتروني</label>
        <input
          className="login-input"
          placeholder="example@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <label className="login-label">كلمة المرور</label>

        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            className="password-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <span
            className="password-icon"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FiEye /> : <FiEyeOff />}
          </span>
        </div>

        {/* Signup Button */}
        <button
          className={`login-btn ${loading ? "disabled" : ""}`}
          onClick={handleSignup}
          disabled={loading}
        >
          {loading ? "جاري التحميل..." : "إنشاء الحساب"}
        </button>

        {/* Login Link */}
        <button
          className="register-link"
          onClick={() => router.push("/login")}
        >
          لديك حساب بالفعل؟ تسجيل الدخول
        </button>

      </div>
    </div>
  );
}
