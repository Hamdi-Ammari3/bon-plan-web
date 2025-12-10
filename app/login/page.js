"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { IoArrowBack } from "react-icons/io5";

export default function Login() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            alert("الرجاء ملء جميع الحقول.");
            return;
        }

        try {
            setLoading(true);

            const res = await axios.post(
                "https://us-central1-waffer-741af.cloudfunctions.net/api/login",
                { email, password }
            );

            localStorage.setItem("userEmail", res.data.user.email);
            localStorage.setItem("userName", res.data.user.username || "");

            router.push("/");
        } catch (err) {
            let msg = err.response?.data?.error || "حدث خطأ أثناء تسجيل الدخول.";

            if (msg === "Email not found") msg = "البريد الإلكتروني غير مسجل.";
            if (msg === "Incorrect password") msg = "كلمة المرور غير صحيحة.";
            if (msg === "Email not verified") msg = "يرجى تأكيد بريدك الإلكتروني.";

            alert(msg);
        } finally {
            setLoading(false);
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

                <h1 className="login-title">تسجيل الدخول</h1>

                {/* Email */}
                <label className="login-label">البريد الإلكتروني</label>
                <input
                    type="email"
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

                {/* Login Button */}
                <button
                    className={`login-btn ${loading ? "disabled" : ""}`}
                    onClick={handleLogin}
                    disabled={loading}
                >
                    {loading ? "جاري التحميل..." : "تسجيل الدخول"}
                </button>

                {/* Go to Register */}
                <button
                    className="register-link"
                    onClick={() => router.push("/signup")}
                >
                 ليس لديك حساب؟ إنشاء حساب جديد
                </button>

            </div>
        </div>
    );
}
