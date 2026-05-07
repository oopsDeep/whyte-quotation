import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminLayoutWrapper from "@/components/admin/AdminLayoutWrapper";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  return (
    <AdminLayoutWrapper>
      {children}
    </AdminLayoutWrapper>
  );
}
