import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { WorkspaceProvider } from "@/lib/workspace-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  // Check if user has completed onboarding (has at least one workspace)
  const user = await db.user.findUnique({
    where: { clerkId },
    include: { workspaces: { take: 1 } },
  });

  if (!user || user.workspaces.length === 0) {
    redirect("/onboarding");
  }

  return (
    <WorkspaceProvider>
      <div className="flex h-screen overflow-hidden bg-[--bg-base]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </WorkspaceProvider>
  );
}
