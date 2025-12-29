import "../globals.css";

export default function ResetPasswordLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 h-full min-h-[calc(100vh-80px)]">
      {/* Content area - full width without sidebar */}
      <div className="flex-grow overflow-auto">
        {children}
      </div>
    </div>
  );
} 