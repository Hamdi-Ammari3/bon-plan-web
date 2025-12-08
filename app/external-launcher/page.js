// app/external-launcher/page.js
"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ExternalLauncher() {
  const site = "https://bon-plan-web.netlify.app/";

  useEffect(() => {
    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    try {
      if (isAndroid) {
        // Android Chrome Intent (best)
        const intentURL =
          "intent://bon-plan-web.netlify.app/#Intent;scheme=https;package=com.android.chrome;end";

        window.location.href = intentURL;

        // Fallback if intent fails
        setTimeout(() => {
          window.open(site, "_blank");
        }, 700);
      } else {
        // iOS and others
        window.open(site, "_blank");

        // fallback if open is blocked
        setTimeout(() => {
          window.location.href = site;
        }, 800);
      }
    } catch (err) {
      console.warn("Redirection failed:", err);
      window.location.href = site;
    }
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>جاري فتح الموقع في المتصفح الخارجي…</h2>

        <p style={styles.text}>
          إذا لم يتم فتح المتصفح تلقائياً، انسخ الرابط التالي وافتحه يدوياً في
          Chrome أو Safari:
        </p>

        <a href={site} style={styles.link}>
          {site}
        </a>

        <div style={{ marginTop: 16 }}>
          <Link href="/" style={styles.backLink}>
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    background: "rgba(0,0,0,0.03)",
  },
  card: {
    maxWidth: 520,
    width: "100%",
    background: "#fff",
    borderRadius: 14,
    padding: 28,
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    textAlign: "center",
  },
  title: { margin: 0, fontSize: 20, fontWeight: 700, color: "#111" },
  text: { marginTop: 12, color: "#444", lineHeight: 1.6 },
  link: {
    color: "#0b63d6",
    display: "block",
    marginTop: 8,
    fontSize: 16,
    wordBreak: "break-all",
  },
  backLink: {
    color: "#666",
    fontSize: 14,
    textDecoration: "underline",
    marginTop: 20,
  },
};
