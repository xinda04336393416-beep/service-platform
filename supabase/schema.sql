-- ============================================================
-- service-platform schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- 1. workers
CREATE TABLE workers (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  phone          text        NOT NULL,
  wxwork_userid  text,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 2. service_orders
CREATE TABLE service_orders (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name         text        NOT NULL,
  customer_phone        text        NOT NULL,
  service_location_text text        NOT NULL,
  machine_model         text        NOT NULL,
  fault_description     text        NOT NULL,
  current_worker_id     uuid        REFERENCES workers(id),
  current_status        text        NOT NULL DEFAULT 'CREATED',
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- 3. service_events — event_type 枚举约束
CREATE TABLE service_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid        NOT NULL REFERENCES service_orders(id),
  worker_id    uuid        REFERENCES workers(id),
  event_type   text        NOT NULL,
  note         text,
  voice_url    text,
  eta_minutes  integer,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT event_type_values CHECK (
    event_type IN (
      'ORDER_CREATED',
      'ASSIGNED',
      'TRANSFERRED',
      'DEPARTED',
      'VOICE_NOTE',
      'COMPLETED'
    )
  )
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX ON service_orders (current_worker_id);
CREATE INDEX ON service_orders (current_status);
CREATE INDEX ON service_events (order_id);
CREATE INDEX ON service_events (worker_id);

-- ── Row Level Security (开启但暂不加 policy，后续按需添加) ───
ALTER TABLE workers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_events ENABLE ROW LEVEL SECURITY;
