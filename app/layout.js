import { Noto_Sans_Arabic } from "next/font/google";
import "./style.css";

// Arabic font
const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata = {
  title: "Bon Plan",
  description: "Best offers near you",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${notoArabic.variable}`}>
        {children}
      </body>
    </html>
  );
}
