import { Sidebar } from "@/components/Sidebar";
import { RightRail } from "@/components/RightRail";
import { TopoMobile, NavMobile } from "@/components/MobileNav";
import { ComposeModal } from "@/components/ComposeModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopoMobile />
      <div className="layout">
        <Sidebar />
        <main className="principal">{children}</main>
        <RightRail />
      </div>
      <NavMobile />
      <ComposeModal />
    </>
  );
}
