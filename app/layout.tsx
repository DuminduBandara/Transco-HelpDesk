import type { Metadata } from "next";
import ThemeRegistry from "@/components/ThemeRegistry";
import AuthProvider from "@/components/AuthProvider";
import NotistackProvider from "@/components/NotistackProvider";

export const metadata: Metadata = {
  title: "IT Help Desk",
  description: "Internal IT support ticketing system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ThemeRegistry>
            <NotistackProvider>{children}</NotistackProvider>
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}
