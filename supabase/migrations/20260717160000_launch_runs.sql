-- Launch Mode (Phase 5). Runs spawned by a launch carry a back-reference to it, so the
-- live launch dashboard can compute progress (runs done / total) and surface what's
-- overdue or due next — without guessing which runs belong to which launch.
--
-- Additive and nullable: hand-off runs (the vast majority) simply leave launch_id null,
-- and existing runs/run_steps RLS already governs the row — nothing new to grant or
-- police. on delete set null keeps a launch's runs alive if the launch is later removed.

alter table runs
  add column if not exists launch_id uuid references launches (id) on delete set null;

create index if not exists runs_launch_id_idx on runs (launch_id);
