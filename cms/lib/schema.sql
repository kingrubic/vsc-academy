PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'EDITOR')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS venues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address_vi TEXT NOT NULL DEFAULT '',
  address_en TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  map_url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER,
  updated_by INTEGER
);

CREATE TABLE IF NOT EXISTS instructors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  academic_title TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  company_role TEXT NOT NULL DEFAULT '',
  bio_vi TEXT NOT NULL DEFAULT '',
  bio_en TEXT NOT NULL DEFAULT '',
  expertise_vi TEXT NOT NULL DEFAULT '',
  expertise_en TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  website TEXT NOT NULL DEFAULT '',
  social_links TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER,
  updated_by INTEGER
);

CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  slug_vi TEXT NOT NULL UNIQUE,
  slug_en TEXT NOT NULL UNIQUE,
  level_key TEXT NOT NULL DEFAULT 'beginner',
  price_amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'VND',
  format TEXT NOT NULL DEFAULT 'online',
  duration_label_vi TEXT NOT NULL DEFAULT '',
  duration_label_en TEXT NOT NULL DEFAULT '',
  session_count INTEGER,
  total_duration_vi TEXT NOT NULL DEFAULT '',
  total_duration_en TEXT NOT NULL DEFAULT '',
  capacity_min INTEGER,
  capacity_max INTEGER,
  class_size_label_vi TEXT NOT NULL DEFAULT '',
  class_size_label_en TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  featured INTEGER NOT NULL DEFAULT 0,
  primary_instructor_id TEXT,
  primary_platform TEXT NOT NULL DEFAULT '',
  venue_default_id TEXT,
  thumbnail TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  practice_badge_vi TEXT NOT NULL DEFAULT '',
  practice_badge_en TEXT NOT NULL DEFAULT '',
  schedule_label_vi TEXT NOT NULL DEFAULT '',
  schedule_label_en TEXT NOT NULL DEFAULT '',
  support_label_vi TEXT NOT NULL DEFAULT '',
  support_label_en TEXT NOT NULL DEFAULT '',
  location_online TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status_vi TEXT NOT NULL DEFAULT 'draft',
  status_en TEXT NOT NULL DEFAULT 'not_created',
  content_vi TEXT NOT NULL DEFAULT '{}',
  content_en TEXT NOT NULL DEFAULT '{}',
  seo_vi TEXT NOT NULL DEFAULT '{}',
  seo_en TEXT NOT NULL DEFAULT '{}',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER,
  updated_by INTEGER,
  FOREIGN KEY (primary_instructor_id) REFERENCES instructors(id),
  FOREIGN KEY (venue_default_id) REFERENCES venues(id)
);

CREATE TABLE IF NOT EXISTS program_instructors (
  program_id TEXT NOT NULL,
  instructor_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'instructor',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (program_id, instructor_id),
  FOREIGN KEY (program_id) REFERENCES programs(id),
  FOREIGN KEY (instructor_id) REFERENCES instructors(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  session_name TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT,
  days_of_week TEXT NOT NULL DEFAULT '',
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  format TEXT,
  venue_id TEXT,
  online_platform TEXT NOT NULL DEFAULT '',
  meeting_url TEXT NOT NULL DEFAULT '',
  price_override INTEGER,
  capacity INTEGER,
  registered_count INTEGER NOT NULL DEFAULT 0,
  remaining_seats INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  type TEXT NOT NULL DEFAULT 'course',
  registration_open_date TEXT,
  registration_close_date TEXT,
  notes TEXT NOT NULL DEFAULT '',
  description_vi TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER,
  updated_by INTEGER,
  FOREIGN KEY (program_id) REFERENCES programs(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  job_role TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  program_id TEXT,
  session_id TEXT,
  amount INTEGER,
  currency TEXT NOT NULL DEFAULT 'VND',
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT '',
  utm TEXT NOT NULL DEFAULT '{}',
  ai_level TEXT NOT NULL DEFAULT '',
  goal TEXT NOT NULL DEFAULT '',
  consent_privacy INTEGER NOT NULL DEFAULT 0,
  consent_marketing INTEGER NOT NULL DEFAULT 0,
  invoice TEXT NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '[]',
  locale TEXT NOT NULL DEFAULT 'vi',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER,
  updated_by INTEGER,
  FOREIGN KEY (program_id) REFERENCES programs(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  slug_vi TEXT NOT NULL UNIQUE,
  slug_en TEXT NOT NULL DEFAULT '',
  title_vi TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  excerpt_vi TEXT NOT NULL DEFAULT '',
  excerpt_en TEXT NOT NULL DEFAULT '',
  content_vi TEXT NOT NULL DEFAULT '',
  content_en TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  author_id TEXT NOT NULL DEFAULT 'vsc-editorial',
  content_type TEXT NOT NULL DEFAULT 'knowledge',
  published_at TEXT,
  reading_time INTEGER,
  status_vi TEXT NOT NULL DEFAULT 'draft',
  status_en TEXT NOT NULL DEFAULT 'not_created',
  featured INTEGER NOT NULL DEFAULT 0,
  seo TEXT NOT NULL DEFAULT '{}',
  noindex INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER,
  updated_by INTEGER
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_vi TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  description_vi TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'guide',
  cover_image TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  external_url TEXT NOT NULL DEFAULT '',
  access_type TEXT NOT NULL DEFAULT 'public',
  published_at TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  featured INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  gated INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER,
  updated_by INTEGER
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  url TEXT NOT NULL,
  alt_vi TEXT NOT NULL DEFAULT '',
  alt_en TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  created_by INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sessions_program ON sessions(program_id, start_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status, created_at);
CREATE INDEX IF NOT EXISTS idx_registrations_session ON registrations(session_id);
CREATE INDEX IF NOT EXISTS idx_insights_status ON insights(status_vi, published_at);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status, published_at);
