const fs = require("fs");
const PDFDocument = require("pdfkit");
const { programShortName } = require("./convex-db");
const V = require("./validate");

const NAVY = "#10213a";
const NAVY_DEEP = "#0b1324";
const BLUE = "#1769ff";
const INK = "#12203a";
const MUTED = "#5b6b82";
const LINE = "#dbe3ee";
const PAPER = "#f3f6fb";
const WHITE = "#ffffff";

const SESSION_LABEL = {
  open: "Đang mở",
  full: "Đã đầy",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

function firstExisting(paths) {
  return paths.find((item) => item && fs.existsSync(item)) || "";
}

const FONT_REG = firstExisting([
  "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
]);
const FONT_BOLD = firstExisting([
  "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  FONT_REG,
]);

function fmtDate(value) {
  const day = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "—";
  return day.split("-").reverse().join("/");
}

function fmtStamp(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function dateStamp(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "report";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function fmtInt(n) {
  return Number(n || 0).toLocaleString("vi-VN");
}

function classEnrollmentRows({ sessions = [], programs = [], registrations = [] } = {}) {
  const regsBySession = new Map();
  for (const row of registrations) {
    const key = String(row.session_id || "");
    if (!key) continue;
    const list = regsBySession.get(key) || [];
    list.push(row);
    regsBySession.set(key, list);
  }

  return [...sessions]
    .sort((a, b) => {
      const dates = String(b.start_date || "").localeCompare(String(a.start_date || ""));
      if (dates) return dates;
      return String(a.session_name || "").localeCompare(String(b.session_name || ""), "vi");
    })
    .map((session) => {
      const program = programs.find((p) => String(p.id) === String(session.program_id));
      const regs = regsBySession.get(String(session.id)) || [];
      let registered = 0;
      let transferred = 0;
      let pending = 0;
      let cancelled = 0;
      for (const row of regs) {
        const status = V.normalizeRegStatus(row.status) || String(row.status || "");
        if (status === "cancelled") {
          cancelled += 1;
          continue;
        }
        if (status === "confirmed") transferred += 1;
        else pending += 1;
        registered += 1;
      }
      const statusKey = V.normalizeSessionStatus(session.status) || "open";
      return {
        id: session.id,
        className: session.session_name || session.slug || session.id || "—",
        programName: programShortName(program) || session.program_id || "—",
        startDate: session.start_date || "",
        status: statusKey,
        statusLabel: SESSION_LABEL[statusKey] || statusKey,
        registered,
        transferred,
        pending,
        cancelled,
      };
    });
}

function summarizeRows(rows) {
  return rows.reduce(
    (acc, row) => {
      acc.classes += 1;
      acc.registered += row.registered;
      acc.transferred += row.transferred;
      acc.pending += row.pending;
      acc.cancelled += row.cancelled;
      return acc;
    },
    { classes: 0, registered: 0, transferred: 0, pending: 0, cancelled: 0 },
  );
}

function filename(generatedAt) {
  return `vsc-bao-cao-lop-${dateStamp(generatedAt)}.pdf`;
}

function registerFonts(doc) {
  const regular = FONT_REG ? "vsc-report" : "Helvetica";
  const bold = FONT_BOLD ? "vsc-report-bold" : "Helvetica-Bold";
  if (FONT_REG) doc.registerFont(regular, FONT_REG);
  if (FONT_BOLD) doc.registerFont(bold, FONT_BOLD);
  return { regular, bold };
}

function drawKpi(doc, fonts, x, y, w, h, value, label) {
  doc.save();
  doc.roundedRect(x, y, w, h, 4).fill(WHITE);
  doc.roundedRect(x, y, w, h, 4).lineWidth(0.8).strokeColor(LINE).stroke();
  doc.rect(x, y, 3, h).fill(BLUE);
  doc.fillColor(NAVY).font(fonts.bold).fontSize(18).text(String(value), x + 14, y + 12, {
    width: w - 22,
    lineBreak: false,
  });
  doc.fillColor(MUTED).font(fonts.regular).fontSize(8).text(label.toUpperCase(), x + 14, y + 36, {
    width: w - 22,
    characterSpacing: 0.4,
  });
  doc.restore();
}

function tableLayout(contentWidth) {
  const cols = [
    { key: "className", label: "Lớp học", width: contentWidth * 0.28, align: "left" },
    { key: "programName", label: "Khóa", width: contentWidth * 0.18, align: "left" },
    { key: "startDate", label: "Khai giảng", width: contentWidth * 0.12, align: "left" },
    { key: "statusLabel", label: "Trạng thái", width: contentWidth * 0.12, align: "left" },
    { key: "registered", label: "Đăng ký", width: contentWidth * 0.1, align: "right" },
    { key: "transferred", label: "Đã CK", width: contentWidth * 0.1, align: "right" },
    { key: "pending", label: "Chờ CK", width: contentWidth * 0.1, align: "right" },
  ];
  return cols;
}

function cellText(row, key) {
  if (key === "startDate") return fmtDate(row.startDate);
  if (key === "registered" || key === "transferred" || key === "pending") return fmtInt(row[key]);
  return String(row[key] || "—");
}

function drawTableHeader(doc, fonts, cols, x, y, rowH) {
  doc.save();
  doc.rect(x, y, cols.reduce((sum, col) => sum + col.width, 0), rowH).fill(NAVY);
  let cx = x;
  doc.fillColor(WHITE).font(fonts.bold).fontSize(8);
  for (const col of cols) {
    doc.text(col.label.toUpperCase(), cx + 8, y + 8, {
      width: col.width - 16,
      align: col.align,
      characterSpacing: 0.35,
    });
    cx += col.width;
  }
  doc.restore();
  return y + rowH;
}

function drawTableRow(doc, fonts, cols, x, y, rowH, row, stripe) {
  const width = cols.reduce((sum, col) => sum + col.width, 0);
  doc.save();
  if (stripe) doc.rect(x, y, width, rowH).fill(PAPER);
  doc.moveTo(x, y + rowH).lineTo(x + width, y + rowH).strokeColor(LINE).lineWidth(0.5).stroke();
  let cx = x;
  doc.fillColor(INK).font(fonts.regular).fontSize(8.5);
  for (const col of cols) {
    const numeric = col.key === "transferred" || col.key === "registered" || col.key === "pending";
    if (col.key === "transferred") doc.fillColor(BLUE).font(fonts.bold);
    else if (numeric) doc.fillColor(NAVY).font(fonts.bold);
    else doc.fillColor(INK).font(fonts.regular);
    doc.text(cellText(row, col.key), cx + 8, y + 8, {
      width: col.width - 16,
      align: col.align,
      lineBreak: false,
      ellipsis: true,
    });
    cx += col.width;
  }
  doc.restore();
  return y + rowH;
}

function drawTotals(doc, fonts, cols, x, y, rowH, totals) {
  const width = cols.reduce((sum, col) => sum + col.width, 0);
  doc.save();
  doc.rect(x, y, width, rowH).fill(NAVY_DEEP);
  const fake = {
    className: "Tổng",
    programName: `${fmtInt(totals.classes)} lớp`,
    startDate: "",
    statusLabel: "",
    registered: totals.registered,
    transferred: totals.transferred,
    pending: totals.pending,
  };
  let cx = x;
  doc.fillColor(WHITE).font(fonts.bold).fontSize(8.5);
  for (const col of cols) {
    const text =
      col.key === "startDate" || col.key === "statusLabel"
        ? ""
        : col.key === "className"
          ? "Tổng"
          : col.key === "programName"
            ? fake.programName
            : cellText(fake, col.key);
    doc.text(text, cx + 8, y + 8, { width: col.width - 16, align: col.align, lineBreak: false });
    cx += col.width;
  }
  doc.restore();
  return y + rowH;
}

function renderPdf({ sessions, programs, registrations, generatedAt } = {}) {
  const rows = classEnrollmentRows({ sessions, programs, registrations });
  const totals = summarizeRows(rows);
  const stamped = generatedAt || new Date().toISOString();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "portrait", margin: 0, bufferPages: true });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const fonts = registerFonts(doc);
    const W = doc.page.width;
    const H = doc.page.height;
    const margin = 40;
    const contentW = W - margin * 2;
    const cols = tableLayout(contentW);
    const headerH = 96;
    const kpiH = 62;
    const rowH = 26;
    const footerY = H - 36;

    function paintChrome() {
      doc.save();
      doc.rect(0, 0, W, headerH).fill(NAVY);
      doc.rect(0, headerH - 3, W, 3).fill(BLUE);
      doc.fillColor("#64dcff").font(fonts.bold).fontSize(8).text("VSC ACADEMY", margin, 22, {
        characterSpacing: 2.4,
      });
      doc.fillColor(WHITE).font(fonts.bold).fontSize(18).text("Báo cáo đăng ký theo lớp", margin, 40, {
        width: contentW - 160,
      });
      doc.fillColor("#c5d2e5").font(fonts.regular).fontSize(9).text(`Xuất lúc ${fmtStamp(stamped)}`, margin, 66, {
        width: contentW,
      });
      doc.fillColor("#c5d2e5").font(fonts.regular).fontSize(8).text("Nội bộ", W - margin - 80, 22, {
        width: 80,
        align: "right",
      });
      doc.restore();
    }

    function ensureSpace(y, needed) {
      if (y + needed <= footerY - 8) return y;
      doc.addPage();
      paintChrome();
      return headerH + 24;
    }

    paintChrome();
    let y = headerH + 24;
    const gap = 10;
    const kpiW = (contentW - gap * 3) / 4;
    drawKpi(doc, fonts, margin, y, kpiW, kpiH, fmtInt(totals.classes), "Số lớp");
    drawKpi(doc, fonts, margin + kpiW + gap, y, kpiW, kpiH, fmtInt(totals.registered), "Đăng ký");
    drawKpi(doc, fonts, margin + (kpiW + gap) * 2, y, kpiW, kpiH, fmtInt(totals.transferred), "Đã chuyển khoản");
    drawKpi(doc, fonts, margin + (kpiW + gap) * 3, y, kpiW, kpiH, fmtInt(totals.pending), "Chờ thanh toán");
    y += kpiH + 22;

    y = ensureSpace(y, rowH * 2);
    y = drawTableHeader(doc, fonts, cols, margin, y, rowH);
    if (!rows.length) {
      doc.fillColor(MUTED).font(fonts.regular).fontSize(10).text("Chưa có lớp học.", margin + 8, y + 14, {
        width: contentW - 16,
      });
      y += 40;
    } else {
      rows.forEach((row, i) => {
        y = ensureSpace(y, rowH);
        if (y === headerH + 24) y = drawTableHeader(doc, fonts, cols, margin, y, rowH);
        y = drawTableRow(doc, fonts, cols, margin, y, rowH, row, i % 2 === 1);
      });
      y = ensureSpace(y, rowH);
      if (y === headerH + 24) y = drawTableHeader(doc, fonts, cols, margin, y, rowH);
      y = drawTotals(doc, fonts, cols, margin, y, rowH, totals);
    }

    y = ensureSpace(y, 48);
    doc.fillColor(MUTED).font(fonts.regular).fontSize(8).text(
      "Đăng ký = hồ sơ chưa hủy. Đã chuyển khoản = trạng thái Đã xác nhận (đã đối soát thanh toán). Chờ CK = còn chờ chuyển khoản.",
      margin,
      y + 14,
      { width: contentW, lineGap: 2 },
    );

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(range.start + i);
      doc.save();
      doc.moveTo(margin, footerY).lineTo(W - margin, footerY).strokeColor(LINE).lineWidth(0.6).stroke();
      doc.fillColor(MUTED).font(fonts.regular).fontSize(8);
      doc.text("VSC Academy  ·  Báo cáo nội bộ", margin, footerY + 8, { width: contentW / 2 });
      doc.text(`Trang ${i + 1} / ${range.count}`, margin, footerY + 8, { width: contentW, align: "right" });
      doc.restore();
    }

    doc.end();
  });
}

module.exports = {
  classEnrollmentRows,
  summarizeRows,
  filename,
  fmtDate,
  renderPdf,
  SESSION_LABEL,
};
