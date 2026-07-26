create policy "customer admins create organization metrics"
on public.performance_metrics
for insert
to authenticated
with check (
  organization_id = private.current_organization_id()
  and private.current_role() = 'customer_admin'
);
