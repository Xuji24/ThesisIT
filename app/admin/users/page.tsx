import { createClient } from '@/lib/supabase/server';
import UsersTable from '@/components/admin/UsersTable';

export const metadata = { title: 'Admin — Users — ThesisIT' };

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at, last_seen_at')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-xl font-heading font-bold text-ink-primary mb-1">Users</h1>
      <p className="text-sm text-ink-muted mb-6">
        {users?.length ?? 0} account{users?.length === 1 ? '' : 's'}.
      </p>

      <UsersTable data={users ?? []} />
    </div>
  );
}
