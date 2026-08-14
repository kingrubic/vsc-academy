const { now } = require("./db");
const { hashPassword, randomId } = require("./auth");

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function seedLearner(db) {
  if (db.prepare("SELECT COUNT(*) AS n FROM students").get().n) return { seeded: false };
  const ts = now();

  const sessions = db.prepare("SELECT * FROM sessions WHERE deleted_at IS NULL").all();
  const insertMeeting = db.prepare(
    `INSERT INTO class_meetings (id, session_id, title_vi, title_en, date, start_time, end_time, format, venue_id, meeting_url, status, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, ?)`,
  );
  sessions.forEach((session) => {
    const existing = db.prepare("SELECT COUNT(*) AS n FROM class_meetings WHERE session_id = ?").get(session.id).n;
    if (existing) return;
    const two = /02|2 /.test(
      db.prepare("SELECT duration_label_vi FROM programs WHERE id = ?").get(session.program_id)?.duration_label_vi || "",
    );
    const count = two ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      insertMeeting.run(
        randomId("mtg"),
        session.id,
        `Buổi ${String(i + 1).padStart(2, "0")}`,
        `Session ${String(i + 1).padStart(2, "0")}`,
        i === 0 ? session.start_date : addDays(session.start_date, session.format === "online" ? 2 : 1),
        session.start_time,
        session.end_time,
        session.format,
        session.venue_id,
        session.format === "offline" ? "" : session.meeting_url || "https://meet.google.com/vsc-class",
        i,
        ts,
        ts,
      );
    }
  });

  const studentId = "stu-demo";
  db.prepare(
    `INSERT INTO students (id, full_name, email, phone, password_hash, status, language_preference, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', 'vi', ?, ?)`,
  ).run(
    studentId,
    "Học viên Demo",
    "hoc-vien@vsc.academy",
    "0901234567",
    hashPassword("VscLearner!2026"),
    ts,
    ts,
  );

  const starter = db.prepare("SELECT * FROM sessions WHERE program_id = 'ai-starter' ORDER BY start_date LIMIT 1").get();
  const agent = db.prepare("SELECT * FROM sessions WHERE program_id = 'ai-agent-automation' ORDER BY start_date LIMIT 1").get();
  if (starter) {
    db.prepare(
      `INSERT INTO enrollments (id, student_id, program_id, session_id, status, payment_status, joined_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', 'paid', ?, ?, ?)`,
    ).run(randomId("enr"), studentId, starter.program_id, starter.id, ts, ts, ts);
  }
  if (agent) {
    db.prepare(
      `INSERT INTO enrollments (id, student_id, program_id, session_id, status, payment_status, joined_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', 'paid', ?, ?, ?)`,
    ).run(randomId("enr"), studentId, agent.program_id, agent.id, ts, ts, ts);
  }

  const starterMeeting = starter
    ? db.prepare("SELECT id FROM class_meetings WHERE session_id = ? ORDER BY sort_order LIMIT 1").get(starter.id)
    : null;

  db.prepare(
    `INSERT INTO learning_materials (id, program_id, session_id, meeting_id, title_vi, title_en, description_vi, description_en, type, external_url, visibility, phase, published_at, sort_order, downloadable, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'published', ?, ?)`,
  ).run(
    randomId("mat"),
    starter?.program_id || "ai-starter",
    starter?.id || null,
    starterMeeting?.id || null,
    "Hướng dẫn chuẩn bị buổi 01",
    "Session 01 prep guide",
    "Đọc trước buổi học để làm việc cùng AI hiệu quả hơn.",
    "Read before class so you can work with AI more effectively.",
    "pdf",
    "https://vscacademy.vn/tai-lieu-chuyen-mon.html",
    "session",
    "before",
    ts.slice(0, 10),
    0,
    ts,
    ts,
  );
  db.prepare(
    `INSERT INTO learning_materials (id, program_id, session_id, meeting_id, title_vi, title_en, description_vi, description_en, type, external_url, visibility, phase, published_at, sort_order, downloadable, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'published', ?, ?)`,
  ).run(
    randomId("mat"),
    starter?.program_id || "ai-starter",
    starter?.id || null,
    null,
    "Template mô tả bài toán",
    "Problem briefing template",
    "Mẫu dùng trong khóa để mô tả bài toán cho AI.",
    "A template for describing a problem clearly to AI.",
    "template",
    "https://vscacademy.vn/tai-lieu-chuyen-mon.html",
    "session",
    "during",
    ts.slice(0, 10),
    1,
    ts,
    ts,
  );

  db.prepare(
    `INSERT INTO announcements (id, title_vi, title_en, content_vi, content_en, target_type, session_id, priority, published_at, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'session', ?, 'important', ?, 'published', ?, ?)`,
  ).run(
    randomId("ann"),
    "Nhớ chuẩn bị máy tính trước buổi học",
    "Please have your laptop ready before class",
    "Bạn cần máy tính cá nhân, kết nối internet ổn định và tham gia đúng giờ.",
    "Please bring a laptop, a stable internet connection, and join on time.",
    starter?.id || null,
    ts,
    ts,
    ts,
  );
  db.prepare(
    `INSERT INTO announcements (id, title_vi, title_en, content_vi, content_en, target_type, priority, published_at, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'all', 'normal', ?, 'published', ?, ?)`,
  ).run(
    randomId("ann"),
    "Chào mừng bạn đến Learner Portal",
    "Welcome to the Learner Portal",
    "Đây là không gian học tập của bạn tại VSC Academy. Lịch học, tài liệu và thông báo sẽ xuất hiện tại đây.",
    "This is your VSC Academy learning space. Schedule, materials and announcements will appear here.",
    ts,
    ts,
    ts,
  );

  return { seeded: true };
}

module.exports = { seedLearner };
