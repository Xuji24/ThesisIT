import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth/getSessionProfile';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import AdminSidebarNav from '@/components/shell/AdminSidebarNav';
import AdminBreadcrumb from '@/components/shell/AdminBreadcrumb';

/**
 * Defense in depth: proxy.ts already blocks non-admins from reaching any
 * /admin/** route, but a layout-level check is cheap insurance against a
 * middleware matcher edge case ever letting a request through unchecked.
 * Fails closed identically to the middleware — no session or no ADMIN role
 * both redirect away, no exceptions.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <SidebarProvider>
      <AdminSidebarNav email={profile.email} fullName={profile.fullName} />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line-hairline bg-surface-card px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <AdminBreadcrumb />
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
