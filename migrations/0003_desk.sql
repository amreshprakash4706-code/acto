-- Advisor threads, offer follow-ups, and agent tasks. No extensions.

create table if not exists threads (
  id text primary key,
  property_id text references properties(id) on delete cascade,
  buyer_id text not null,
  agent_id text,
  subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists threads_buyer_idx on threads (buyer_id, updated_at desc);
create index if not exists threads_agent_idx on threads (agent_id, updated_at desc);
create unique index if not exists threads_buyer_property_uidx
  on threads (buyer_id, property_id)
  where property_id is not null;

create table if not exists thread_messages (
  id text primary key,
  thread_id text not null references threads(id) on delete cascade,
  author_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists thread_messages_idx on thread_messages (thread_id, created_at);

create table if not exists tasks (
  id text primary key,
  assignee_id text not null,
  created_by text,
  lead_id text,
  viewing_id text,
  property_id text,
  offer_id text,
  title text not null,
  body text,
  kind text not null default 'follow_up',
  status text not null default 'OPEN' check (status in ('OPEN', 'DONE', 'CANCELLED')),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_assignee_idx on tasks (assignee_id, status, created_at desc);
create unique index if not exists tasks_viewing_kind_uidx on tasks (viewing_id, kind) where viewing_id is not null;
create unique index if not exists tasks_offer_kind_uidx on tasks (offer_id, kind) where offer_id is not null;
