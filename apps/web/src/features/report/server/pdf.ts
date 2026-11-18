import {
  PDFDocument,
  PDFName,
  PDFString,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import type { BoardKey } from "@tdoe/db";

import {
  DETAIL_HEADER,
  MEMBERS_HEADER,
  RANKING_HEADER,
  type LinkItem,
  type Report,
  type Row,
  type TeamSection,
} from "./model";

// Draws a Report (model.ts) as an A4 PDF with pdf-lib: standard fonts, so
// nothing to load from disk and it runs anywhere (Vercel included). Text the
// standard fonts cannot encode (emoji, other scripts) is dropped, accents are
// kept.

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 48;
const TOP = PAGE_H - 56;
const BOTTOM = 56;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const C = {
  ink: rgb(0.06, 0.14, 0.2),
  text: rgb(0.17, 0.22, 0.27),
  muted: rgb(0.4, 0.45, 0.5),
  faint: rgb(0.62, 0.66, 0.7),
  line: rgb(0.86, 0.89, 0.91),
  zebra: rgb(0.965, 0.975, 0.98),
  headFill: rgb(0.93, 0.96, 0.96),
  brand: rgb(0.0, 0.55, 0.5),
  brandDark: rgb(0.02, 0.2, 0.26),
  link: rgb(0.08, 0.36, 0.72),
  white: rgb(1, 1, 1),
};
const KEY_COLOR: Record<BoardKey, RGB> = {
  PROBLEMA: rgb(0.12, 0.63, 0.42),
  SOLUCAO: rgb(0.18, 0.47, 0.88),
  PARCERIAS: rgb(0.0, 0.6, 0.55),
  OPORTUNIDADES: rgb(0.58, 0.27, 0.8),
};

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };
type TextStyle = {
  font?: PDFFont;
  size?: number;
  color?: RGB;
  indent?: number;
  lineHeight?: number;
  after?: number;
};

class Writer {
  page!: PDFPage;
  y = TOP;
  private cache = new Map<string, boolean>();

  constructor(
    readonly doc: PDFDocument,
    readonly fonts: Fonts,
    private readonly runningTitle: string,
  ) {}

  // Keeps only what the font can encode (accents yes, emoji no).
  clean(text: string, font: PDFFont = this.fonts.regular): string {
    let out = "";
    for (const ch of text.replace(/\r\n?/g, "\n").replace(/\t/g, "  ")) {
      if (ch === "\n") {
        out += ch;
        continue;
      }
      const key = `${font.name}:${ch}`;
      let ok = this.cache.get(key);
      if (ok === undefined) {
        try {
          font.widthOfTextAtSize(ch, 10);
          ok = true;
        } catch {
          ok = false;
        }
        this.cache.set(key, ok);
      }
      if (ok) out += ch;
      else {
        const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
        if (base && base !== ch) out += this.clean(base, font);
      }
    }
    return out.replace(/[ ]{3,}/g, "  ");
  }

  width(text: string, font: PDFFont, size: number) {
    return font.widthOfTextAtSize(text, size);
  }

  // Splits into lines that fit `maxWidth`; breaks words longer than a line.
  wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of this.clean(text, font).split("\n")) {
      if (!paragraph.trim()) {
        lines.push("");
        continue;
      }
      let line = "";
      for (const word of paragraph.split(/ +/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (this.width(candidate, font, size) <= maxWidth) {
          line = candidate;
          continue;
        }
        if (line) lines.push(line);
        if (this.width(word, font, size) <= maxWidth) {
          line = word;
          continue;
        }
        // A long word (a URL, say): cut it by characters.
        let chunk = "";
        for (const ch of word) {
          if (this.width(chunk + ch, font, size) > maxWidth && chunk) {
            lines.push(chunk);
            chunk = ch;
          } else chunk += ch;
        }
        line = chunk;
      }
      lines.push(line);
    }
    // No trailing blank lines.
    while (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
    return lines;
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = TOP;
    // Running header: thin brand rule and the event name.
    this.page.drawRectangle({
      x: 0,
      y: PAGE_H - 6,
      width: PAGE_W,
      height: 6,
      color: C.brand,
    });
    const header = this.clean(this.runningTitle, this.fonts.regular);
    this.page.drawText(header, {
      x: MARGIN_X,
      y: PAGE_H - 30,
      size: 8,
      font: this.fonts.regular,
      color: C.faint,
    });
  }

  ensure(height: number) {
    if (this.y - height < BOTTOM) this.newPage();
  }

  gap(h: number) {
    this.y -= h;
  }

  text(content: string, style: TextStyle = {}) {
    const font = style.font ?? this.fonts.regular;
    const size = style.size ?? 10;
    const lh = style.lineHeight ?? size * 1.38;
    const indent = style.indent ?? 0;
    for (const line of this.wrap(content, font, size, CONTENT_W - indent)) {
      this.ensure(lh);
      this.y -= lh;
      if (line) {
        this.page.drawText(line, {
          x: MARGIN_X + indent,
          y: this.y + (lh - size) / 2 + 1,
          size,
          font,
          color: style.color ?? C.text,
        });
      }
    }
    this.y -= style.after ?? 0;
  }

  // Section title with a colored bar.
  heading(title: string, color: RGB = C.brand) {
    this.ensure(44);
    this.gap(16);
    this.page.drawRectangle({
      x: MARGIN_X,
      y: this.y - 14,
      width: 3,
      height: 14,
      color,
    });
    this.page.drawText(this.clean(title, this.fonts.bold), {
      x: MARGIN_X + 10,
      y: this.y - 11.5,
      size: 12,
      font: this.fonts.bold,
      color: C.ink,
    });
    this.y -= 22;
  }

  subheading(title: string, color: RGB) {
    this.ensure(34);
    this.gap(8);
    this.page.drawRectangle({
      x: MARGIN_X,
      y: this.y - 10,
      width: 8,
      height: 8,
      color,
    });
    this.page.drawText(this.clean(title, this.fonts.bold), {
      x: MARGIN_X + 14,
      y: this.y - 9.5,
      size: 10.5,
      font: this.fonts.bold,
      color,
    });
    this.y -= 18;
  }

  // Label / value pairs in two columns.
  rows(rows: Row[], labelWidth = 150) {
    const size = 9.5;
    const lh = size * 1.45;
    for (const [label, value] of rows) {
      const lines = this.wrap(
        value || "—",
        this.fonts.regular,
        size,
        CONTENT_W - labelWidth,
      );
      this.ensure(lh * Math.min(lines.length, 3) + 2);
      const top = this.y;
      this.page.drawText(this.clean(label, this.fonts.bold), {
        x: MARGIN_X,
        y: top - lh + 3,
        size,
        font: this.fonts.bold,
        color: C.muted,
      });
      for (const line of lines) {
        this.ensure(lh);
        this.y -= lh;
        this.page.drawText(line, {
          x: MARGIN_X + labelWidth,
          y: this.y + 3,
          size,
          font: this.fonts.regular,
          color: C.text,
        });
      }
      this.y -= 2;
    }
  }

  // Clickable links, one per line.
  links(items: LinkItem[], labelWidth = 150) {
    const size = 9.5;
    const lh = size * 1.45;
    for (const item of items) {
      const lines = this.wrap(
        item.url,
        this.fonts.regular,
        size,
        CONTENT_W - labelWidth,
      );
      this.ensure(lh + 2);
      this.page.drawText(this.clean(item.label, this.fonts.bold), {
        x: MARGIN_X,
        y: this.y - lh + 3,
        size,
        font: this.fonts.bold,
        color: C.muted,
      });
      for (const line of lines) {
        this.ensure(lh);
        this.y -= lh;
        const x = MARGIN_X + labelWidth;
        this.page.drawText(line, {
          x,
          y: this.y + 3,
          size,
          font: this.fonts.regular,
          color: C.link,
        });
        const w = this.width(line, this.fonts.regular, size);
        this.page.drawLine({
          start: { x, y: this.y + 2 },
          end: { x: x + w, y: this.y + 2 },
          thickness: 0.4,
          color: C.link,
        });
        this.addLink(item.url, x, this.y + 1, w, size + 2);
      }
      this.y -= 2;
    }
  }

  private addLink(url: string, x: number, y: number, w: number, h: number) {
    if (!/^https?:\/\//i.test(url)) return;
    const annot = this.doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, y, x + w, y + h],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    });
    const ref = this.doc.context.register(annot);
    this.page.node.addAnnot(ref);
  }

  // Table with a filled header, zebra rows and wrapped cells; repeats the
  // header after a page break.
  table(
    header: string[],
    rows: string[][],
    widths: number[],
    opts: { align?: ("left" | "center" | "right")[]; size?: number } = {},
  ) {
    const size = opts.size ?? 8.8;
    const lh = size * 1.35;
    const pad = 5;
    const total = widths.reduce((a, b) => a + b, 0);
    const cols = widths.map((w) => (w / total) * CONTENT_W);
    const align = opts.align ?? header.map(() => "left" as const);

    const drawRow = (
      cells: string[],
      kind: "head" | "body",
      zebra: boolean,
    ) => {
      const font = kind === "head" ? this.fonts.bold : this.fonts.regular;
      const wrapped = cells.map((cell, i) =>
        this.wrap(cell || "—", font, size, cols[i]! - pad * 2),
      );
      const height = Math.max(...wrapped.map((l) => l.length)) * lh + pad * 1.4;
      if (this.y - height < BOTTOM) {
        this.newPage();
        if (kind === "body") drawRow(header, "head", false);
      }
      const fill = kind === "head" ? C.headFill : zebra ? C.zebra : null;
      if (fill) {
        this.page.drawRectangle({
          x: MARGIN_X,
          y: this.y - height,
          width: CONTENT_W,
          height,
          color: fill,
        });
      }
      let x = MARGIN_X;
      wrapped.forEach((lines, i) => {
        lines.forEach((line, n) => {
          const w = this.width(line, font, size);
          const cx =
            align[i] === "right"
              ? x + cols[i]! - pad - w
              : align[i] === "center"
                ? x + (cols[i]! - w) / 2
                : x + pad;
          this.page.drawText(line, {
            x: cx,
            y: this.y - pad - (n + 1) * lh + 3,
            size,
            font,
            color: kind === "head" ? C.ink : C.text,
          });
        });
        x += cols[i]!;
      });
      this.y -= height;
      this.page.drawLine({
        start: { x: MARGIN_X, y: this.y },
        end: { x: MARGIN_X + CONTENT_W, y: this.y },
        thickness: 0.5,
        color: C.line,
      });
    };

    this.ensure(lh * 3);
    drawRow(header, "head", false);
    rows.forEach((row, i) => drawRow(row, "body", i % 2 === 1));
    this.gap(10);
  }

  // Small boxes with a big number (the summary of the whole event).
  stats(items: { label: string; value: string }[]) {
    const h = 54;
    const gapX = 10;
    const w = (CONTENT_W - gapX * (items.length - 1)) / items.length;
    this.ensure(h + 10);
    items.forEach((item, i) => {
      const x = MARGIN_X + i * (w + gapX);
      this.page.drawRectangle({
        x,
        y: this.y - h,
        width: w,
        height: h,
        color: C.headFill,
        borderColor: C.line,
        borderWidth: 0.6,
      });
      this.page.drawText(item.value, {
        x: x + 10,
        y: this.y - 28,
        size: 20,
        font: this.fonts.bold,
        color: C.brandDark,
      });
      this.page.drawText(this.clean(item.label), {
        x: x + 10,
        y: this.y - 44,
        size: 8.5,
        font: this.fonts.regular,
        color: C.muted,
      });
    });
    this.y -= h + 6;
  }

  // Colored band with the team's name at the top of its section.
  teamBanner(team: TeamSection) {
    const h = 58;
    this.ensure(h + 20);
    this.page.drawRectangle({
      x: MARGIN_X,
      y: this.y - h,
      width: CONTENT_W,
      height: h,
      color: C.brandDark,
    });
    const name = this.wrap(team.name, this.fonts.bold, 17, CONTENT_W - 130)[0];
    this.page.drawText(name ?? "", {
      x: MARGIN_X + 16,
      y: this.y - 27,
      size: 17,
      font: this.fonts.bold,
      color: C.white,
    });
    this.page.drawText(`Equipo ${team.index} de ${team.total}`, {
      x: MARGIN_X + 16,
      y: this.y - 45,
      size: 9,
      font: this.fonts.regular,
      color: rgb(0.75, 0.88, 0.88),
    });
    const pos = `#${team.position}`;
    this.page.drawText(pos, {
      x: MARGIN_X + CONTENT_W - 16 - this.width(pos, this.fonts.bold, 22),
      y: this.y - 30,
      size: 22,
      font: this.fonts.bold,
      color: C.white,
    });
    const lbl = "posición";
    this.page.drawText(lbl, {
      x: MARGIN_X + CONTENT_W - 16 - this.width(lbl, this.fonts.regular, 8),
      y: this.y - 45,
      size: 8,
      font: this.fonts.regular,
      color: rgb(0.75, 0.88, 0.88),
    });
    this.y -= h + 6;
  }

  footer(generatedAt: string) {
    const pages = this.doc.getPages();
    pages.forEach((page, i) => {
      page.drawLine({
        start: { x: MARGIN_X, y: 38 },
        end: { x: PAGE_W - MARGIN_X, y: 38 },
        thickness: 0.5,
        color: C.line,
      });
      page.drawText(
        this.clean(`Tabuleiro do Empreendedor · Generado el ${generatedAt}`),
        {
          x: MARGIN_X,
          y: 26,
          size: 7.5,
          font: this.fonts.regular,
          color: C.faint,
        },
      );
      const label = `Página ${i + 1} de ${pages.length}`;
      page.drawText(label, {
        x: PAGE_W - MARGIN_X - this.width(label, this.fonts.regular, 7.5),
        y: 26,
        size: 7.5,
        font: this.fonts.regular,
        color: C.faint,
      });
    });
  }
}

function drawTeam(w: Writer, team: TeamSection) {
  w.teamBanner(team);

  w.heading("Datos generales");
  w.rows(team.general);

  w.heading("Integrantes");
  if (team.members.length === 0) {
    w.text("El equipo no tiene integrantes.", {
      color: C.muted,
      font: w.fonts.italic,
    });
  } else {
    w.table(MEMBERS_HEADER, team.members, [3, 1.6, 2.4, 2.2]);
  }

  w.heading("Avance por clave");
  w.table(
    ["Clave", "Estado", "Fases concluidas"],
    team.keys.map((k) => [k.label, k.status, k.done]),
    [2, 2, 2],
  );

  w.heading("Propuesta del equipo");
  for (const key of team.proposal) {
    const color = KEY_COLOR[key.key];
    w.subheading(key.label, color);
    for (const phase of key.phases) {
      w.ensure(56);
      w.text(phase.title, {
        font: w.fonts.bold,
        size: 9.8,
        color: C.ink,
        indent: 14,
      });
      if (phase.question) {
        w.text(phase.question, {
          font: w.fonts.italic,
          size: 8.8,
          color: C.muted,
          indent: 14,
          after: 2,
        });
      }
      if (phase.answer) {
        w.text(phase.answer, { size: 9.5, indent: 14, after: 1 });
        w.text(phase.meta, { size: 7.8, color: C.faint, indent: 14, after: 6 });
      } else {
        w.text("Sin respuesta.", {
          font: w.fonts.italic,
          size: 9,
          color: C.faint,
          indent: 14,
          after: 6,
        });
      }
    }
  }

  w.heading("Entrega del proyecto");
  if (!team.delivery.delivered && team.delivery.files.length === 0) {
    w.text("El equipo no registró una entrega.", {
      color: C.muted,
      font: w.fonts.italic,
    });
  } else {
    w.rows(team.delivery.rows);
    w.links(team.delivery.links);
    if (team.delivery.files.length > 0) {
      w.rows([["Archivos", team.delivery.files.join("\n")]]);
      w.text(
        "Los archivos se descargan desde la tarjeta del equipo en el panel del organizador.",
        { size: 7.8, color: C.faint, after: 2 },
      );
    }
    if (team.delivery.description) {
      w.rows([["Descripción", team.delivery.description]]);
    }
  }

  w.heading("Evaluación de los jueces");
  if (team.evaluation.count === 0) {
    w.text("Ningún juez ha calificado a este equipo.", {
      color: C.muted,
      font: w.fonts.italic,
    });
  } else {
    w.rows([
      ["Calificaciones", String(team.evaluation.count)],
      ["Promedio general", `${team.evaluation.average} / 5`],
    ]);
    w.gap(4);
    w.text("Promedio por criterio (escala 1 a 5)", {
      font: w.fonts.bold,
      size: 9,
      color: C.muted,
      after: 2,
    });
    w.table(["Criterio", "Promedio"], team.evaluation.byCriterion, [3, 1], {
      align: ["left", "right"],
    });
    w.text("Calificación de cada juez", {
      font: w.fonts.bold,
      size: 9,
      color: C.muted,
      after: 2,
    });
    w.table(
      DETAIL_HEADER,
      team.evaluation.detail,
      [2.6, 1.2, 1.2, 1.2, 1.2, 1.4, 1.2],
      {
        align: [
          "left",
          "center",
          "center",
          "center",
          "center",
          "center",
          "right",
        ],
        size: 8.3,
      },
    );
    if (team.evaluation.comments.length > 0) {
      w.text("Comentarios", {
        font: w.fonts.bold,
        size: 9,
        color: C.muted,
        after: 2,
      });
      for (const c of team.evaluation.comments) {
        w.text(`${c.mentor} · ${c.when}`, {
          font: w.fonts.bold,
          size: 8.8,
          color: C.ink,
        });
        w.text(c.text, { size: 9.2, after: 6 });
      }
    }
  }
}

export async function renderReportPdf(report: Report): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${report.title} — ${report.eventName}`);
  doc.setAuthor("Tabuleiro do Empreendedor");
  doc.setSubject(report.subtitle);
  doc.setCreator("Tabuleiro do Empreendedor");
  doc.setProducer("Tabuleiro do Empreendedor");
  doc.setLanguage("es-MX");
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
  };
  const w = new Writer(doc, fonts, `${report.eventName} · ${report.title}`);

  // Cover: title, event information, summary and ranking.
  w.newPage();
  w.text("TABULEIRO DO EMPREENDEDOR", {
    font: fonts.bold,
    size: 8.5,
    color: C.brand,
    after: 2,
  });
  w.text(report.title, {
    font: fonts.bold,
    size: 24,
    color: C.ink,
    lineHeight: 30,
  });
  w.text(report.subtitle, { size: 13, color: C.muted, after: 8 });

  w.heading("Información del evento");
  w.rows(report.eventInfo, 110);
  if (report.scenario) {
    w.rows([["Contexto", report.scenario]], 110);
  }

  if (report.stats) {
    w.heading("Resumen");
    w.stats(report.stats);
  }

  if (report.ranking) {
    w.heading("Posiciones");
    w.text(
      "Ordenado por el promedio de los jueces; en empate, por fases concluidas y puntos.",
      { size: 8, color: C.muted, after: 4 },
    );
    if (report.ranking.length === 0) {
      w.text("Todavía no hay equipos en este evento.", {
        font: fonts.italic,
        color: C.muted,
      });
    } else {
      w.table(
        RANKING_HEADER,
        report.ranking,
        [0.6, 3.4, 1.3, 1, 1, 1, 1, 0.9, 1.2],
        {
          align: [
            "center",
            "left",
            "center",
            "center",
            "center",
            "center",
            "center",
            "center",
            "right",
          ],
          size: 8.3,
        },
      );
    }
  }

  for (const [i, team] of report.teams.entries()) {
    // Whole event: each team starts a page. One team: right after the cover.
    if (report.ranking || i > 0) w.newPage();
    else w.gap(10);
    drawTeam(w, team);
  }

  w.footer(report.generatedAt);
  // Open with the document outline hidden and pages fitting the window.
  doc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseNone"));
  return doc.save();
}
