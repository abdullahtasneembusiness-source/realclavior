-- Drift Signals (Addition B) reads existing feedback_notes — no new core table. But it
-- runs windowed, grouped queries (recurring corrections per playbook+operator, and
-- per-operator volume over recent weeks), so give those access paths real indexes.
--
-- Attribution note: a note's operator is the assignee of its run (run_id) when set, or
-- the playbook's owner for a standing note — so both run_id and the playbook+recency
-- path matter.

create index if not exists feedback_notes_run_id_idx
  on public.feedback_notes (run_id)
  where run_id is not null;

create index if not exists feedback_notes_playbook_created_idx
  on public.feedback_notes (playbook_id, created_at desc);
