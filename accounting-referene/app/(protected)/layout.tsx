import "../globals.css";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
