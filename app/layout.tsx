import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gemini Image MCP Server",
  description: "Gemini Image Generation MCP Server — AI画像生成をどのAIクライアントからでも",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
