import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { DoctorAuthProvider } from "@/lib/doctor-auth-context";
import { ThemeProvider } from "@/lib/theme-provider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Health Passport AI — Your Medical History, Anytime, Anywhere",
  description:
    "An AI-powered digital health passport that securely stores medical records, generates AI summaries, and provides instant emergency access via QR.",
  keywords: ["health passport", "medical records", "AI summary", "OCR", "QR health", "emergency access"],
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <DoctorAuthProvider>{children}</DoctorAuthProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
