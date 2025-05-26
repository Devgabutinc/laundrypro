import { SupabaseClient } from '@supabase/supabase-js';

export async function up(supabase: SupabaseClient) {
  // Enable RLS
  await supabase.rpc('admin_alter_table', {
    table_name: 'discussion_reports',
    enable_rls: true,
  });

  // Policy untuk platform admin bisa melihat semua laporan
  await supabase.rpc('admin_create_policy', {
    table_name: 'discussion_reports',
    name: 'Platform admins can see all reports',
    definition: `auth.uid IN (
      SELECT id FROM profiles WHERE role = 'platform_admin'
    )`,
    action: 'SELECT',
    command: 'CREATE',
  });

  // Policy untuk user biasa bisa melihat laporan yang mereka buat
  await supabase.rpc('admin_create_policy', {
    table_name: 'discussion_reports',
    name: 'Users can see their own reports',
    definition: `auth.uid = reporter_id`,
    action: 'SELECT',
    command: 'CREATE',
  });

  // Policy untuk user biasa bisa membuat laporan
  await supabase.rpc('admin_create_policy', {
    table_name: 'discussion_reports',
    name: 'Users can create reports',
    definition: `auth.uid = reporter_id`,
    action: 'INSERT',
    command: 'CREATE',
  });
}

export async function down(supabase: SupabaseClient) {
  // Disable RLS
  await supabase.rpc('admin_alter_table', {
    table_name: 'discussion_reports',
    enable_rls: false,
  });

  // Remove all policies
  await supabase.rpc('admin_delete_policy', {
    table_name: 'discussion_reports',
    name: 'Platform admins can see all reports',
  });

  await supabase.rpc('admin_delete_policy', {
    table_name: 'discussion_reports',
    name: 'Users can see their own reports',
  });

  await supabase.rpc('admin_delete_policy', {
    table_name: 'discussion_reports',
    name: 'Users can create reports',
  });
} 