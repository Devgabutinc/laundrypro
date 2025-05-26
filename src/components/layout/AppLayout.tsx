import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="max-w-screen-sm mx-auto w-full min-h-screen flex flex-col bg-background">
        <AppHeader />
        <div className="flex-1 flex flex-row w-full">
          <AppSidebar />
          <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-auto w-full">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
