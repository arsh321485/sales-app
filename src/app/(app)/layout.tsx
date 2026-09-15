import { Sidebar } from "@/components/sidebar";
import { isManagerRole, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={{
          id: user.id,
          name: user.name,
          role: user.role,
          teamName: user.teamName,
          isManager: isManagerRole(user.role),
        }}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden px-6 py-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
