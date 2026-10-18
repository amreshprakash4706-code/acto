-- Atconiz 5 domain schema. user_id columns are TEXT (Better Auth / preview 'dev-user').
-- No extensions (PGLite preview cannot load them).

create table if not exists organizations (
  id text primary key,
  name text not null,
  slug text not null unique,
  brand jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id text primary key,
  display_name text,
  phone text,
  role text not null default 'USER' check (role in ('USER', 'AGENT', 'ADMIN')),
  bio text,
  agency_name text,
  license_no text,
  avatar_url text,
  org_id text references organizations(id) on delete set null,
  plan text not null default 'PRIVATE',
  preferences jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on profiles (role);
create index if not exists profiles_org_idx on profiles (org_id);

create table if not exists properties (
  id text primary key,
  title text not null,
  slug text not null unique,
  description text,
  property_type text not null,
  status text not null default 'ACTIVE',
  listing_type text not null default 'SALE' check (listing_type in ('SALE', 'RENT')),
  price numeric(18, 2) not null,
  currency text not null default 'USD',
  price_period text not null default 'sale' check (price_period in ('sale', 'month', 'year')),
  bedrooms int,
  bathrooms numeric,
  area_sqft numeric,
  plot_sqft numeric,
  year_built int,
  floor int,
  total_floors int,
  furnishing text,
  address_line1 text,
  city text not null,
  neighborhood text,
  state text,
  country text not null,
  postal_code text,
  latitude double precision,
  longitude double precision,
  amenities jsonb not null default '[]',
  features jsonb not null default '{}',
  owner_id text,
  agent_id text,
  org_id text,
  provenance text not null default 'SEED_DEVELOPMENT',
  verification_status text not null default 'unverified',
  is_featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists properties_status_idx on properties (status) where deleted_at is null;
create index if not exists properties_city_idx on properties (city, country);
create index if not exists properties_price_idx on properties (price);
create index if not exists properties_type_idx on properties (property_type);
create index if not exists properties_agent_idx on properties (agent_id);
create index if not exists properties_featured_idx on properties (is_featured) where deleted_at is null;
create index if not exists properties_listing_idx on properties (listing_type, status);

create table if not exists property_images (
  id text primary key,
  property_id text not null references properties(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  room_type text,
  created_at timestamptz not null default now()
);
create index if not exists property_images_property_idx on property_images (property_id);

create table if not exists favorites (
  id text primary key,
  user_id text not null,
  property_id text not null references properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);
create index if not exists favorites_user_idx on favorites (user_id);

create table if not exists reviews (
  id text primary key,
  property_id text not null references properties(id) on delete cascade,
  user_id text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  moderation_status text not null default 'APPROVED' check (moderation_status in ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, user_id)
);
create index if not exists reviews_property_idx on reviews (property_id);
create index if not exists reviews_user_idx on reviews (user_id);

create table if not exists viewing_requests (
  id text primary key,
  property_id text not null references properties(id) on delete cascade,
  user_id text not null,
  agent_id text,
  requested_at timestamptz not null,
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'REJECTED')),
  viewing_type text not null default 'IN_PERSON' check (viewing_type in ('IN_PERSON', 'VIRTUAL')),
  notes text,
  agent_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists viewings_user_idx on viewing_requests (user_id);
create index if not exists viewings_property_idx on viewing_requests (property_id);
create index if not exists viewings_status_idx on viewing_requests (status);
create index if not exists viewings_agent_idx on viewing_requests (agent_id);

create table if not exists contact_requests (
  id text primary key,
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  property_id text references properties(id) on delete set null,
  user_id text,
  status text not null default 'NEW' check (status in ('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM')),
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contact_status_idx on contact_requests (status);
create index if not exists contact_user_idx on contact_requests (user_id);

create table if not exists leads (
  id text primary key,
  user_id text,
  contact_id text,
  viewing_id text,
  property_id text,
  agent_id text,
  org_id text,
  source text not null default 'inquiry',
  stage text not null default 'NEW' check (stage in ('NEW', 'CONTACTED', 'QUALIFIED', 'VIEWING', 'NEGOTIATING', 'WON', 'LOST')),
  score int not null default 0,
  score_breakdown jsonb not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_agent_idx on leads (agent_id);
create index if not exists leads_stage_idx on leads (stage);
create index if not exists leads_user_idx on leads (user_id);

create table if not exists lead_notes (
  id text primary key,
  lead_id text not null references leads(id) on delete cascade,
  author_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists saved_searches (
  id text primary key,
  user_id text not null,
  name text not null,
  query jsonb not null,
  notify boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists saved_searches_user_idx on saved_searches (user_id);

create table if not exists saved_calculations (
  id text primary key,
  user_id text not null,
  type text not null,
  inputs jsonb not null,
  results jsonb not null,
  label text,
  created_at timestamptz not null default now()
);
create index if not exists saved_calcs_user_idx on saved_calculations (user_id);

create table if not exists comparisons (
  id text primary key,
  user_id text not null,
  property_ids jsonb not null,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists property_views (
  id text primary key,
  property_id text not null references properties(id) on delete cascade,
  user_id text,
  session_id text,
  created_at timestamptz not null default now()
);
create index if not exists property_views_prop_idx on property_views (property_id, created_at);
create index if not exists property_views_user_idx on property_views (user_id);

create table if not exists analytics_events (
  id text primary key,
  user_id text,
  name text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists analytics_name_idx on analytics_events (name, created_at);
create index if not exists analytics_user_idx on analytics_events (user_id);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, read_at);

create table if not exists ai_conversations (
  id text primary key,
  user_id text not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conv_user_idx on ai_conversations (user_id);

create table if not exists ai_messages (
  id text primary key,
  conversation_id text not null references ai_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_msg_conv_idx on ai_messages (conversation_id);

create table if not exists ai_usage (
  id text primary key,
  user_id text not null,
  model text,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_idx on ai_usage (user_id, created_at);

create table if not exists audit_logs (
  id text primary key,
  actor_id text,
  action text not null,
  resource text,
  resource_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_actor_idx on audit_logs (actor_id);
create index if not exists audit_action_idx on audit_logs (action, created_at);

create table if not exists offers (
  id text primary key,
  property_id text not null references properties(id) on delete cascade,
  user_id text not null,
  amount numeric(18, 2) not null,
  currency text not null default 'USD',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists offers_user_idx on offers (user_id);
create index if not exists offers_property_idx on offers (property_id);

create table if not exists feature_flags (
  key text primary key,
  enabled boolean not null default true,
  payload jsonb not null default '{}'
);

insert into feature_flags (key, enabled) values
  ('ai_studio', true),
  ('agent_crm', true),
  ('comparisons', true),
  ('viewings', true),
  ('reviews', true)
on conflict (key) do nothing;
