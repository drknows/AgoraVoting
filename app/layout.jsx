export const metadata = {
  title: "Agora — Secure Democratic Voting Platform",
  description: "Government-grade secure voting with multiple ballot methods, cryptographic receipts, and full audit trail.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#08090b" }}>
        {children}
      </body>
    </html>
  );
}
