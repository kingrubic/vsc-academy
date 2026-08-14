CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  activation_token TEXT,
  status TEXT NOT NULL DEFAULT 'invited',
  language_preference TEXT NOT NULL DEFAULT 'vi',
  last_login_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  program_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  registration_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  progress INTEGER NOT NULL DEFAULT 0,
  completion_status TEXT NOT NULL DEFAULT 'in_progress',
  certificate_status TEXT NOT NULL DEFAULT 'none',
  joined_at TEXT NOT NULL,
  completed_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (program_id) REFERENCES programs(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS class_meetings (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  title_vi TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  description_vi TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  meeting_number INTEGER NOT NULL DEFAULT 1,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  format TEXT,
  venue_id TEXT,
  meeting_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'upcoming',
  notes TEXT NOT NULL DEFAULT '',
  recording_url TEXT NOT NULL DEFAULT '',
  materials_released INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id)
);

CREATE TABLE IF NOT EXISTS attendance (
  enrollment_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_recorded',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  updated_by INTEGER,
  PRIMARY KEY (enrollment_id, meeting_id),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
  FOREIGN KEY (meeting_id) REFERENCES class_meetings(id)
);

CREATE TABLE IF NOT EXISTS learning_materials (
  id TEXT PRIMARY KEY,
  program_id TEXT,
  session_id TEXT,
  meeting_id TEXT,
  title_vi TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  description_vi TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'pdf',
  file_url TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  external_url TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'session',
  student_ids TEXT NOT NULL DEFAULT '[]',
  phase TEXT NOT NULL DEFAULT 'during',
  published_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  downloadable INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'published',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title_vi TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  content_vi TEXT NOT NULL DEFAULT '',
  content_en TEXT NOT NULL DEFAULT '',
  target_type TEXT NOT NULL DEFAULT 'all',
  program_id TEXT,
  session_id TEXT,
  student_id TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  published_at TEXT,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  read_at TEXT NOT NULL,
  PRIMARY KEY (announcement_id, student_id),
  FOREIGN KEY (announcement_id) REFERENCES announcements(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  certificate_code TEXT NOT NULL UNIQUE,
  student_id TEXT NOT NULL,
  enrollment_id TEXT NOT NULL,
  program_id TEXT NOT NULL,
  session_id TEXT,
  template_id TEXT,
  template_version INTEGER NOT NULL DEFAULT 1,
  student_name_snapshot TEXT NOT NULL,
  program_name_vi_snapshot TEXT NOT NULL DEFAULT '',
  program_name_en_snapshot TEXT NOT NULL DEFAULT '',
  session_name_snapshot TEXT NOT NULL DEFAULT '',
  completion_date TEXT,
  issue_date TEXT,
  status TEXT NOT NULL DEFAULT 'eligible',
  issued_by TEXT,
  issued_at TEXT,
  pdf_url TEXT NOT NULL DEFAULT '',
  verification_url TEXT NOT NULL DEFAULT '',
  qr_code_data TEXT NOT NULL DEFAULT '',
  revoked_at TEXT,
  revoked_by TEXT,
  revocation_reason TEXT NOT NULL DEFAULT '',
  replaces_certificate_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS certificate_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  program_id TEXT,
  language TEXT NOT NULL DEFAULT 'vi',
  title_vi TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  body_vi TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  footer_vi TEXT NOT NULL DEFAULT '',
  footer_en TEXT NOT NULL DEFAULT '',
  signer1_name TEXT NOT NULL DEFAULT '',
  signer1_title TEXT NOT NULL DEFAULT '',
  signer2_name TEXT NOT NULL DEFAULT '',
  signer2_title TEXT NOT NULL DEFAULT '',
  qr_position TEXT NOT NULL DEFAULT 'bottom-right',
  status TEXT NOT NULL DEFAULT 'published',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  student_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title_vi TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  body_vi TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mail_outbox (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'generic',
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_email TEXT NOT NULL DEFAULT '',
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_session ON enrollments(session_id);
CREATE INDEX IF NOT EXISTS idx_meetings_session ON class_meetings(session_id, date);
CREATE INDEX IF NOT EXISTS idx_materials_session ON learning_materials(session_id, published_at);
CREATE INDEX IF NOT EXISTS idx_announcements_pub ON announcements(published_at, status);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_unique ON enrollments(student_id, session_id);
