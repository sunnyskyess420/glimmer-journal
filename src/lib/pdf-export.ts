/**
 * PDF export for the Glimmer Journal.
 *
 * Designed to be shared with a trauma therapist: clean, professional,
 * chronological, and faithful to the polyvagal-theory framing of the app
 * (nervous-system states, glimmers, glimmer bank, weekly reflections).
 */

import { jsPDF } from 'jspdf';
import type { GlimmerEntry, Stats } from '@/store/journal-store';
import type { WeeklyReflectionRecord } from './supabase-service';
import {
  PROMPTS,
  INTENSITY_LABELS,
  SLEEP_LABELS,
  STRESS_LABELS,
} from './constants';
import type { ZoneCheckInSummary } from './regulate-content';
import { NS_ZONES } from './regulate-content';

export interface ExportOptions {
  /** ISO date string (yyyy-mm-dd) — inclusive. Empty = no lower bound. */
  startDate?: string;
  /** ISO date string (yyyy-mm-dd) — inclusive. Empty = no upper bound. */
  endDate?: string;
  /** Include the overview/stats page. */
  includeOverview: boolean;
  /** Include all chronological daily entries. */
  includeEntries: boolean;
  /** Include the Glimmer Bank (starred entries) section. */
  includeGlimmerBank: boolean;
  /** Include weekly reflections. */
  includeWeekly: boolean;
  /** Optional one-line note the user wants to add at the top of the document. */
  note?: string;
  /** User display name or email for the cover page. */
  userName?: string;
}

interface ResolvedRange {
  start?: string;
  end?: string;
  label: string;
}

// ----- Layout constants (Letter, portrait, 50pt margins) -----
const PAGE_WIDTH = 612; // 8.5in * 72
const PAGE_HEIGHT = 792; // 11in * 72
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_FONT_SIZE = 10;
const SMALL_FONT_SIZE = 8.5;
const H1_SIZE = 22;
const H2_SIZE = 15;
const H3_SIZE = 12;
const LINE_HEIGHT = 14;
const META_ROW_HEIGHT = 18;
const ACCENT_RGB: [number, number, number] = [90, 138, 74]; // sage green — calming, clinical-neutral
const TEXT_RGB: [number, number, number] = [40, 40, 40];
const MUTED_RGB: [number, number, number] = [110, 110, 110];
const LIGHT_LINE_RGB: [number, number, number] = [210, 210, 210];
const CARD_BG_RGB: [number, number, number] = [248, 250, 246];

// ----- Date helpers -----
function formatDateLong(iso: string): string {
  // iso is yyyy-mm-dd; treat as local noon to avoid TZ drift
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return 'All entries';
  if (start && end) return `${formatDateShort(start)} – ${formatDateShort(end)}`;
  if (start) return `From ${formatDateShort(start)}`;
  return `Through ${formatDateShort(end)}`;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

// ----- jsPDF text helpers -----
function setTextColor(doc: jsPDF, rgb: [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function splitText(doc: jsPDF, text: string, fontSize: number, maxWidth: number): string[] {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text || '', maxWidth) as string[];
}

interface Cursor { y: number; }

function ensureSpace(doc: jsPDF, cursor: Cursor, needed: number) {
  if (cursor.y + needed > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    cursor.y = MARGIN;
  }
}

function writeParagraph(
  doc: jsPDF,
  cursor: Cursor,
  text: string,
  opts: {
    fontSize?: number;
    font?: 'helvetica' | 'times';
    style?: 'normal' | 'bold' | 'italic' | 'bolditalic';
    color?: [number, number, number];
    lineHeight?: number;
    indent?: number;
    gapAfter?: number;
  } = {}
) {
  const fontSize = opts.fontSize ?? BODY_FONT_SIZE;
  const font = opts.font ?? 'helvetica';
  const style = opts.style ?? 'normal';
  const color = opts.color ?? TEXT_RGB;
  const lineHeight = opts.lineHeight ?? LINE_HEIGHT;
  const indent = opts.indent ?? 0;
  const gapAfter = opts.gapAfter ?? 6;

  doc.setFont(font, style);
  doc.setFontSize(fontSize);
  setTextColor(doc, color);
  const lines = splitText(doc, text, fontSize, CONTENT_WIDTH - indent);
  for (const line of lines) {
    ensureSpace(doc, cursor, lineHeight);
    doc.text(line, MARGIN + indent, cursor.y);
    cursor.y += lineHeight;
  }
  cursor.y += gapAfter;
}

function writeSectionHeader(
  doc: jsPDF,
  cursor: Cursor,
  title: string,
  subtitle?: string
) {
  // Push to next page if too close to the bottom
  ensureSpace(doc, cursor, 60);
  // Some breathing room before the header
  if (cursor.y > MARGIN + 10) cursor.y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(H2_SIZE);
  setTextColor(doc, ACCENT_RGB);
  doc.text(title, MARGIN, cursor.y);
  cursor.y += 22;
  if (subtitle) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SMALL_FONT_SIZE);
    setTextColor(doc, MUTED_RGB);
    doc.text(subtitle, MARGIN, cursor.y);
    cursor.y += 14;
  }
  // Thin divider
  doc.setDrawColor(...LIGHT_LINE_RGB);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, cursor.y, MARGIN + CONTENT_WIDTH, cursor.y);
  cursor.y += 12;
}

// ----- Cover page -----
function renderCover(
  doc: jsPDF,
  cursor: Cursor,
  opts: {
    userName?: string;
    rangeLabel: string;
    note?: string;
  }
) {
  // Top accent band
  doc.setFillColor(...ACCENT_RGB);
  doc.rect(0, 0, PAGE_WIDTH, 6, 'F');

  // Title
  cursor.y = 160;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(H1_SIZE);
  setTextColor(doc, TEXT_RGB);
  doc.text('Glimmer Journal', MARGIN, cursor.y);

  // Subtitle
  cursor.y += 32;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  setTextColor(doc, MUTED_RGB);
  doc.text('A personal record of micro-moments of safety', MARGIN, cursor.y);

  // For line
  cursor.y += 36;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  setTextColor(doc, TEXT_RGB);
  const forWhom = opts.userName ? `Prepared for ${opts.userName}` : 'Prepared for you';
  doc.text(forWhom, MARGIN, cursor.y);

  cursor.y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SMALL_FONT_SIZE);
  setTextColor(doc, MUTED_RGB);
  doc.text('For review with your trauma therapist', MARGIN, cursor.y);

  // Date range
  cursor.y += 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setTextColor(doc, TEXT_RGB);
  doc.text('Date range', MARGIN, cursor.y);
  cursor.y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(BODY_FONT_SIZE);
  setTextColor(doc, MUTED_RGB);
  doc.text(opts.rangeLabel, MARGIN, cursor.y);

  // Generated on
  cursor.y += 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setTextColor(doc, TEXT_RGB);
  doc.text('Generated on', MARGIN, cursor.y);
  cursor.y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(BODY_FONT_SIZE);
  setTextColor(doc, MUTED_RGB);
  const genDate = new Date().toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
  doc.text(genDate, MARGIN, cursor.y);

  // Optional note
  if (opts.note && opts.note.trim()) {
    cursor.y += 32;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setTextColor(doc, TEXT_RGB);
    doc.text('Note', MARGIN, cursor.y);
    cursor.y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(BODY_FONT_SIZE);
    setTextColor(doc, MUTED_RGB);
    const noteLines = splitText(doc, opts.note.trim(), BODY_FONT_SIZE, CONTENT_WIDTH);
    for (const line of noteLines) {
      doc.text(line, MARGIN, cursor.y);
      cursor.y += LINE_HEIGHT;
    }
  }

  // Footer — what glimmers are
  cursor.y = PAGE_HEIGHT - MARGIN - 60;
  doc.setDrawColor(...LIGHT_LINE_RGB);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, cursor.y, MARGIN + CONTENT_WIDTH, cursor.y);
  cursor.y += 14;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(SMALL_FONT_SIZE);
  setTextColor(doc, MUTED_RGB);
  const about = 'A "glimmer" is a small cue of safety — a moment when your nervous system briefly recognizes that you are okay. ' +
    'Tracking these moments is a polyvagal-theory–informed practice (Deb Dana) that helps widen your window of tolerance over time.';
  const aboutLines = splitText(doc, about, SMALL_FONT_SIZE, CONTENT_WIDTH);
  for (const line of aboutLines) {
    doc.text(line, MARGIN, cursor.y);
    cursor.y += 11;
  }
}

// ----- Overview / Stats page -----
function renderOverview(
  doc: jsPDF,
  cursor: Cursor,
  stats: Stats | null,
  filteredEntries: GlimmerEntry[],
  rangeLabel: string
) {
  doc.addPage();
  cursor.y = MARGIN;
  writeSectionHeader(doc, cursor, 'Overview', rangeLabel);

  // Summary card
  const cardX = MARGIN;
  const cardY = cursor.y;
  const cardH = 70;
  doc.setFillColor(...CARD_BG_RGB);
  doc.setDrawColor(...LIGHT_LINE_RGB);
  doc.setLineWidth(0.5);
  doc.roundedRect(cardX, cardY, CONTENT_WIDTH, cardH, 6, 6, 'FD');
  cursor.y = cardY + 18;

  const totalEntries = filteredEntries.length;
  const starred = filteredEntries.filter((e) => e.starred).length;
  const withIntensity = filteredEntries.filter((e) => e.intensity > 0);
  const avgIntensity = withIntensity.length > 0
    ? (withIntensity.reduce((s, e) => s + e.intensity, 0) / withIntensity.length).toFixed(1)
    : '—';
  const uniqueDays = new Set(filteredEntries.map((e) => e.date)).size;

  const stats2x2: { label: string; value: string }[] = [
    { label: 'Entries in this report', value: String(totalEntries) },
    { label: 'Days journaled', value: String(uniqueDays) },
    { label: 'Starred (Glimmer Bank)', value: String(starred) },
    { label: 'Avg. intensity (1–5)', value: avgIntensity },
  ];

  const colW = CONTENT_WIDTH / 2;
  stats2x2.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = cardX + 20 + col * colW;
    const y = cardY + 22 + row * 26;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setTextColor(doc, ACCENT_RGB);
    doc.text(s.value, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(SMALL_FONT_SIZE);
    setTextColor(doc, MUTED_RGB);
    doc.text(s.label, x, y + 12);
  });
  cursor.y = cardY + cardH + 18;

  // Nervous-system state distribution
  const stateCounts: Record<string, number> = {};
  filteredEntries.forEach((e) => {
    const s = e.postState;
    if (s) stateCounts[s] = (stateCounts[s] || 0) + 1;
  });
  const stateEntries = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
  if (stateEntries.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(H3_SIZE);
    setTextColor(doc, TEXT_RGB);
    ensureSpace(doc, cursor, 24);
    doc.text('Post-glimmer nervous-system state', MARGIN, cursor.y);
    cursor.y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(BODY_FONT_SIZE);
    const maxState = stateEntries[0][1];
    stateEntries.forEach(([state, count]) => {
      ensureSpace(doc, cursor, 20);
      // Truncate label if too long
      const label = state.length > 16 ? state.substring(0, 15) + '...' : state;
      doc.setFont('helvetica', 'bold');
      setTextColor(doc, TEXT_RGB);
      doc.text(label, MARGIN, cursor.y);
      // bar
      const barX = MARGIN + 110;
      const barMax = CONTENT_WIDTH - 110 - 30;
      const barW = (count / maxState) * barMax;
      doc.setFillColor(...LIGHT_LINE_RGB);
      doc.rect(barX, cursor.y - 8, barMax, 8, 'F');
      doc.setFillColor(...ACCENT_RGB);
      doc.rect(barX, cursor.y - 8, Math.max(barW, 2), 8, 'F');
      doc.setFont('helvetica', 'normal');
      setTextColor(doc, MUTED_RGB);
      doc.text(String(count), barX + barMax + 8, cursor.y);
      cursor.y += 18;
    });
    cursor.y += 10;
  }

  // State shifts (pre -> post)
  const shifts: Record<string, number> = {};
  filteredEntries.forEach((e) => {
    if (e.preState && e.postState && e.preState !== e.postState) {
      const key = `${e.preState}  →  ${e.postState}`;
      shifts[key] = (shifts[key] || 0) + 1;
    }
  });
  const shiftEntries = Object.entries(shifts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (shiftEntries.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(H3_SIZE);
    setTextColor(doc, TEXT_RGB);
    ensureSpace(doc, cursor, 24);
    doc.text('Most common state shifts', MARGIN, cursor.y);
    cursor.y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(BODY_FONT_SIZE);
    setTextColor(doc, MUTED_RGB);
    shiftEntries.forEach(([shift, count]) => {
      ensureSpace(doc, cursor, 18);
      const shiftLine = `${shift}  —  ${count}×`;
      const shiftLines = splitText(doc, shiftLine, BODY_FONT_SIZE, CONTENT_WIDTH);
      shiftLines.forEach((line) => {
        ensureSpace(doc, cursor, 14);
        doc.text(line, MARGIN, cursor.y);
        cursor.y += 14;
      });
      cursor.y += 2;
    });
    cursor.y += 10;
  }

  // Top tags
  const tagCounts: Record<string, number> = {};
  filteredEntries.forEach((e) => {
    try {
      const tags = JSON.parse(e.tags || '[]') as string[];
      tags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    } catch { /* ignore */ }
  });
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (topTags.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(H3_SIZE);
    setTextColor(doc, TEXT_RGB);
    ensureSpace(doc, cursor, 24);
    doc.text('Top context tags', MARGIN, cursor.y);
    cursor.y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(BODY_FONT_SIZE);
    setTextColor(doc, MUTED_RGB);
    const tagsLine = topTags.map(([t, c]) => `${t} (${c})`).join('   |   ');
    const tagLines = splitText(doc, tagsLine, BODY_FONT_SIZE, CONTENT_WIDTH);
    tagLines.forEach((line) => {
      ensureSpace(doc, cursor, 16);
      doc.text(line, MARGIN, cursor.y);
      cursor.y += 16;
    });
  }

  // Reference the global stats (streak) if available
  if (stats && stats.streak > 0) {
    cursor.y += 12;
    ensureSpace(doc, cursor, 20);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SMALL_FONT_SIZE);
    setTextColor(doc, MUTED_RGB);
    doc.text(`All-time current streak: ${stats.streak} day${stats.streak === 1 ? '' : 's'}.`, MARGIN, cursor.y);
  }
}

// ----- Single entry card -----
function renderEntry(
  doc: jsPDF,
  cursor: Cursor,
  entry: GlimmerEntry,
  options: { compact?: boolean } = {}
) {
  const compact = options.compact ?? false;

  // We pre-measure the card height by simulating the layout, then draw the
  // background + left accent bar FIRST, then write the text on top.

  const cardX = MARGIN;
  const cardW = CONTENT_WIDTH;
  const padLeft = 18;     // text indent inside the card (also room for accent bar)
  const padRight = 14;
  const innerW = cardW - padLeft - padRight;

  // --- Measurement pass (no drawing) ---
  let measureY = 0;
  measureY += 16; // top padding
  // Header row (date + label + star) — single line
  measureY += 16;
  // Prompt (italic, small)
  measureY += splitTextHeight(doc, PROMPTS[entry.promptIndex] || entry.promptLabel, SMALL_FONT_SIZE, innerW) * 12;
  measureY += 6;
  // Response (body)
  measureY += splitTextHeight(doc, entry.response, BODY_FONT_SIZE, innerW) * LINE_HEIGHT;
  measureY += 10;
  if (!compact) {
    // Metadata grid: 3 rows × 2 cols
    measureY += Math.ceil(6 / 2) * META_ROW_HEIGHT + 6;
    // Tags
    let tags: string[] = [];
    try { tags = JSON.parse(entry.tags || '[]') as string[]; } catch { /* ignore */ }
    if (tags.length > 0) {
      measureY += 4; // separator gap
      const tagsStr = tags.join('  ·  ');
      measureY += splitTextHeight(doc, tagsStr, SMALL_FONT_SIZE, innerW - 30) * 12;
      measureY += 6;
    }
  }
  measureY += 10; // bottom padding

  const cardH = measureY;

  // Page-break if needed
  ensureSpace(doc, cursor, cardH + 8);

  // --- Draw card background + accent bar ---
  const startY = cursor.y;
  doc.setFillColor(...CARD_BG_RGB);
  doc.setDrawColor(...LIGHT_LINE_RGB);
  doc.setLineWidth(0.5);
  doc.roundedRect(cardX, startY, cardW, cardH, 6, 6, 'FD');
  // Left accent bar (sage green) — like a clinical document marker
  doc.setFillColor(...ACCENT_RGB);
  doc.roundedRect(cardX, startY, 4, cardH, 2, 2, 'F');

  // --- Write content ---
  cursor.y = startY + 16;

  // Header line: date + prompt label + star
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(BODY_FONT_SIZE);
  setTextColor(doc, TEXT_RGB);
  const dateStr = formatDateLong(entry.date);
  // Measure date width BEFORE changing font (date is rendered at 10pt bold)
  const dateTextWidth = doc.getTextWidth(dateStr);
  doc.text(dateStr, cardX + padLeft, cursor.y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SMALL_FONT_SIZE);
  setTextColor(doc, ACCENT_RGB);
  const labelX = cardX + padLeft + dateTextWidth + 14;
  doc.text(`-  ${entry.promptLabel}`, labelX, cursor.y);

  if (entry.starred) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(BODY_FONT_SIZE);
    setTextColor(doc, ACCENT_RGB);
    const starText = '* Starred';
    const starX = cardX + cardW - padRight - doc.getTextWidth(starText);
    doc.text(starText, starX, cursor.y);
  }
  cursor.y += 16;

  // Prompt question (italic)
  const promptText = PROMPTS[entry.promptIndex] || entry.promptLabel;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(SMALL_FONT_SIZE);
  setTextColor(doc, MUTED_RGB);
  const promptLines = splitText(doc, promptText, SMALL_FONT_SIZE, innerW);
  promptLines.forEach((line) => {
    doc.text(line, cardX + padLeft, cursor.y);
    cursor.y += 12;
  });
  cursor.y += 6;

  // The response (the actual glimmer)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(BODY_FONT_SIZE);
  setTextColor(doc, TEXT_RGB);
  const responseLines = splitText(doc, entry.response, BODY_FONT_SIZE, innerW);
  responseLines.forEach((line) => {
    doc.text(line, cardX + padLeft, cursor.y);
    cursor.y += LINE_HEIGHT;
  });

  // Optional "what was happening" note — rendered in italic muted text
  // right under the response, indented to match.
  if (entry.note) {
    cursor.y += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SMALL_FONT_SIZE);
    setTextColor(doc, MUTED_RGB);
    const noteLines = splitText(doc, `· ${entry.note}`, SMALL_FONT_SIZE, innerW - 16);
    noteLines.forEach((line) => {
      doc.text(line, cardX + padLeft + 8, cursor.y);
      cursor.y += 12;
    });
    setTextColor(doc, TEXT_RGB);
  }
  cursor.y += 10;

  if (!compact) {
    // Metadata grid: two columns of key/value
    const metaX = cardX + padLeft;
    const metaColW = innerW / 2;

    const rows: { label: string; value: string }[] = [];
    const stateLine = [entry.preState, entry.postState].filter(Boolean).join('  →  ');
    rows.push({ label: 'Nervous system', value: stateLine || '—' });
    rows.push({ label: 'Intensity', value: entry.intensity > 0 ? `${entry.intensity}/5  ${INTENSITY_LABELS[entry.intensity - 1] || ''}` : '—' });
    rows.push({ label: 'Body location', value: entry.bodyLocation || '—' });
    rows.push({ label: 'Duration', value: entry.duration || '—' });
    rows.push({ label: 'Sleep quality', value: entry.sleepQuality > 0 ? `${entry.sleepQuality}/5  ${SLEEP_LABELS[entry.sleepQuality - 1] || ''}` : '—' });
    rows.push({ label: 'Stress level', value: entry.stressLevel > 0 ? `${entry.stressLevel}/5  ${STRESS_LABELS[entry.stressLevel - 1] || ''}` : '—' });

    rows.forEach((row, i) => {
      const col = i % 2;
      const rowIdx = Math.floor(i / 2);
      const x = metaX + col * metaColW;
      const y = cursor.y + rowIdx * META_ROW_HEIGHT;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SMALL_FONT_SIZE);
      setTextColor(doc, MUTED_RGB);
      doc.text(`${row.label}:`, x, y);
      doc.setFont('helvetica', 'normal');
      setTextColor(doc, TEXT_RGB);
      // Fixed label column width for clean alignment
      const labelW = 72;
      const valueX = x + labelW;
      const valueMaxW = metaColW - labelW;
      const valueLines = splitText(doc, row.value, SMALL_FONT_SIZE, valueMaxW);
      doc.text(valueLines[0] || '—', valueX, y);
    });
    cursor.y += Math.ceil(rows.length / 2) * META_ROW_HEIGHT + 6;

    // Tags — separated by a subtle divider
    let tags: string[] = [];
    try { tags = JSON.parse(entry.tags || '[]') as string[]; } catch { /* ignore */ }
    if (tags.length > 0) {
      // Subtle separator line
      cursor.y += 2;
      doc.setDrawColor(...LIGHT_LINE_RGB);
      doc.setLineWidth(0.3);
      doc.line(metaX, cursor.y, metaX + innerW, cursor.y);
      cursor.y += 6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SMALL_FONT_SIZE);
      setTextColor(doc, MUTED_RGB);
      doc.text('Tags:', metaX, cursor.y);
      doc.setFont('helvetica', 'normal');
      setTextColor(doc, TEXT_RGB);
      const tagsStr = tags.join('  |  ');
      const tagsLines = splitText(doc, tagsStr, SMALL_FONT_SIZE, innerW - doc.getTextWidth('Tags: '));
      tagsLines.forEach((line, i) => {
        if (i === 0) {
          doc.text(line, metaX + doc.getTextWidth('Tags: '), cursor.y);
        } else {
          doc.text(line, metaX, cursor.y);
        }
        cursor.y += 12;
      });
      cursor.y += 2;
    }
  }

  // Move cursor to bottom of card + gap
  cursor.y = startY + cardH + 10;
}

// Helper: how many lines a block of text will occupy at a given font size/width
function splitTextHeight(doc: jsPDF, text: string, fontSize: number, maxWidth: number): number {
  return splitText(doc, text, fontSize, maxWidth).length;
}

// ----- Daily entries (chronological, grouped by date) -----
function renderDailyEntries(
  doc: jsPDF,
  cursor: Cursor,
  entries: GlimmerEntry[],
  rangeLabel: string
) {
  if (entries.length === 0) return;
  doc.addPage();
  cursor.y = MARGIN;
  writeSectionHeader(doc, cursor, 'Daily Entries', `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}  ·  ${rangeLabel}`);

  // Sort oldest → newest so reading flows chronologically
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  let currentDate = '';
  sorted.forEach((entry) => {
    if (entry.date !== currentDate) {
      currentDate = entry.date;
      // Date divider
      ensureSpace(doc, cursor, 30);
      cursor.y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(H3_SIZE);
      setTextColor(doc, ACCENT_RGB);
      doc.text(formatDateLong(entry.date), MARGIN, cursor.y);
      cursor.y += 16;
      doc.setDrawColor(...LIGHT_LINE_RGB);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, cursor.y, MARGIN + CONTENT_WIDTH, cursor.y);
      cursor.y += 12;
    }
    renderEntry(doc, cursor, entry);
  });
}

// ----- Glimmer Bank (starred entries) -----
function renderGlimmerBank(
  doc: jsPDF,
  cursor: Cursor,
  entries: GlimmerEntry[],
  rangeLabel: string
) {
  const starred = entries.filter((e) => e.starred);
  if (starred.length === 0) return;
  doc.addPage();
  cursor.y = MARGIN;
  writeSectionHeader(doc, cursor, 'Glimmer Bank', `${starred.length} starred entr${starred.length === 1 ? 'y' : 'ies'}  ·  ${rangeLabel}`);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(SMALL_FONT_SIZE);
  setTextColor(doc, MUTED_RGB);
  const intro = 'The Glimmer Bank is your curated list of moments that reliably help you feel safe. ' +
    'These are the entries you have starred — your go-to reference for cues of safety.';
  const introLines = splitText(doc, intro, SMALL_FONT_SIZE, CONTENT_WIDTH);
  introLines.forEach((line) => {
    doc.text(line, MARGIN, cursor.y);
    cursor.y += 14;
  });
  cursor.y += 10;

  const sorted = [...starred].sort((a, b) => b.date.localeCompare(a.date));
  sorted.forEach((entry) => renderEntry(doc, cursor, entry, { compact: true }));
}

// ----- Weekly reflections -----
function renderWeekly(
  doc: jsPDF,
  cursor: Cursor,
  reflections: WeeklyReflectionRecord[],
  rangeLabel: string
) {
  if (reflections.length === 0) return;
  doc.addPage();
  cursor.y = MARGIN;
  writeSectionHeader(doc, cursor, 'Weekly Reflections', `${reflections.length} week${reflections.length === 1 ? '' : 's'}  ·  ${rangeLabel}`);

  const WEEKLY_PROMPTS = [
    'This week I noticed my body felt safest when…',
    'I felt most disconnected or activated on…',
    'One thing I want to do more of next week to feel safe…',
  ];

  reflections.forEach((ref) => {
    ensureSpace(doc, cursor, 80);
    // Week header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(H3_SIZE);
    setTextColor(doc, ACCENT_RGB);
    doc.text(formatWeekRange(ref.weekStart), MARGIN, cursor.y);
    cursor.y += 16;
    doc.setDrawColor(...LIGHT_LINE_RGB);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, cursor.y, MARGIN + CONTENT_WIDTH, cursor.y);
    cursor.y += 14;

    ref.responses.forEach((response, idx) => {
      if (idx >= WEEKLY_PROMPTS.length) return;
      const prompt = WEEKLY_PROMPTS[idx];
      // Prompt
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(SMALL_FONT_SIZE);
      setTextColor(doc, MUTED_RGB);
      const promptLines = splitText(doc, prompt, SMALL_FONT_SIZE, CONTENT_WIDTH);
      promptLines.forEach((line) => {
        ensureSpace(doc, cursor, 14);
        doc.text(line, MARGIN, cursor.y);
        cursor.y += 13;
      });
      cursor.y += 6;
      // Response
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(BODY_FONT_SIZE);
      setTextColor(doc, TEXT_RGB);
      const responseLines = splitText(doc, response || '—', BODY_FONT_SIZE, CONTENT_WIDTH - 16);
      responseLines.forEach((line) => {
        ensureSpace(doc, cursor, LINE_HEIGHT);
        doc.text(line, MARGIN + 16, cursor.y);
        cursor.y += LINE_HEIGHT;
      });
      cursor.y += 14;
    });
    cursor.y += 10;
  });
}

// ----- Footer with page numbers -----
function addPageNumbers(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Footer line
    doc.setDrawColor(...LIGHT_LINE_RGB);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, PAGE_HEIGHT - 28, MARGIN + CONTENT_WIDTH, PAGE_HEIGHT - 28);
    // Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(SMALL_FONT_SIZE);
    setTextColor(doc, MUTED_RGB);
    doc.text('Glimmer Journal', MARGIN, PAGE_HEIGHT - 16);
    doc.text(`Page ${i} of ${pageCount}`, MARGIN + CONTENT_WIDTH, PAGE_HEIGHT - 16, { align: 'right' });
  }
}

// ----- Public API -----
export interface ExportResult {
  success: boolean;
  error?: string;
}

export async function exportJournalToPdf(
  entries: GlimmerEntry[],
  stats: Stats | null,
  reflections: WeeklyReflectionRecord[],
  options: ExportOptions
): Promise<ExportResult> {
  try {
    // Filter entries by date range
    const filtered = entries.filter((e) => {
      if (options.startDate && e.date < options.startDate) return false;
      if (options.endDate && e.date > options.endDate) return false;
      return true;
    });

    // Filter reflections by date range (using week_start)
    const filteredReflections = reflections.filter((r) => {
      if (options.startDate && r.weekStart < options.startDate) return false;
      if (options.endDate && r.weekStart > options.endDate) return false;
      return true;
    });

    const rangeLabel = formatDateRange(options.startDate, options.endDate);

    const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
    const cursor: Cursor = { y: MARGIN };

    // Cover page
    renderCover(doc, cursor, {
      userName: options.userName,
      rangeLabel,
      note: options.note,
    });

    if (options.includeOverview) {
      renderOverview(doc, cursor, stats, filtered, rangeLabel);
    }

    if (options.includeEntries) {
      renderDailyEntries(doc, cursor, filtered, rangeLabel);
    }

    if (options.includeGlimmerBank) {
      renderGlimmerBank(doc, cursor, filtered, rangeLabel);
    }

    if (options.includeWeekly) {
      renderWeekly(doc, cursor, filteredReflections, rangeLabel);
    }

    addPageNumbers(doc);

    // Filename: glimmer-journal_YYYY-MM-DD_range.pdf
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const rangeSlug = options.startDate || options.endDate
      ? `_${(options.startDate || '').replace(/-/g, '')}-${(options.endDate || '').replace(/-/g, '')}`
      : '';
    const filename = `glimmer-journal_${todayStr}${rangeSlug}.pdf`;
    doc.save(filename);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================================
// Focused week export — "Share this week with my therapist"
// ============================================================================
//
// A focused PDF of one Monday-anchored week only: cover → check-in summary
// (with notes) → daily entries for the week → weekly reflection. Designed
// to be emailed ahead of a session or pulled up on a tablet during one.
// Smaller and more focused than the full `exportJournalToPdf` report.

export interface WeekExportOptions {
  /** Monday-anchored week start, `yyyy-mm-dd`. */
  weekStart: string;
  /** Optional user name/email for the cover. */
  userName?: string;
  /** Optional one-line note the user wants to add at the top. */
  note?: string;
  /** Zone check-in summary for this week (with notes). Optional but
      recommended — provides the richer nervous-system view. */
  checkInSummary?: ZoneCheckInSummary | null;
  /** Weekly reflection answers (3 strings) if any. */
  reflection?: string[] | null;
}

function formatDateLongLocal(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTimeLocal(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Render the "Check-in summary" section: total count, per-zone bars,
// and day-by-day list of check-ins with optional notes. This mirrors
// the on-screen CheckInSummary component but in PDF form.
function renderWeekCheckInSummary(
  doc: jsPDF,
  cursor: Cursor,
  summary: ZoneCheckInSummary,
  weekStart: string
) {
  doc.addPage();
  cursor.y = MARGIN;
  writeSectionHeader(doc, cursor, 'Check-in Summary', formatWeekRange(weekStart));

  // Top line: total + "mostly in X"
  const topZoneName = (() => {
    if (!summary.topZone) return null;
    const match = NS_ZONES.find((nz) => nz.id === summary.topZone);
    return match ? match.name.toLowerCase() : null;
  })();

  writeParagraph(doc, cursor, `You checked in ${summary.total} ${summary.total === 1 ? 'time' : 'times'} this week${topZoneName ? ` \u2014 mostly in ${topZoneName}` : ''}.`, {
    fontSize: BODY_FONT_SIZE,
    style: 'normal',
    gapAfter: 10,
  });

  // Per-zone bars (matching the on-screen 3-column view)
  const barLabelX = MARGIN;
  const barX = MARGIN + 90;
  const barMax = CONTENT_WIDTH - 90 - 30;
  const maxCount = Math.max(summary.byZone.hyper, summary.byZone.window, summary.byZone.hypo, 1);
  NS_ZONES.forEach((z) => {
    const count = summary.byZone[z.id] ?? 0;
    const barW = (count / maxCount) * barMax;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(BODY_FONT_SIZE);
    setTextColor(doc, TEXT_RGB);
    doc.text(z.name.toLowerCase(), barLabelX, cursor.y);
    doc.setFillColor(...LIGHT_LINE_RGB);
    doc.rect(barX, cursor.y - 8, barMax, 8, 'F');
    doc.setFillColor(...ACCENT_RGB);
    doc.rect(barX, cursor.y - 8, Math.max(barW, 2), 8, 'F');
    doc.setFont('helvetica', 'normal');
    setTextColor(doc, MUTED_RGB);
    doc.text(String(count), barX + barMax + 8, cursor.y);
    cursor.y += 18;
  });
  cursor.y += 8;

  // Day-by-day check-ins (with notes) — the richer, therapist-reviewable view.
  const daysWithEntries = summary.days.filter((d) => d.entries.length > 0);
  if (daysWithEntries.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(H3_SIZE);
    setTextColor(doc, TEXT_RGB);
    ensureSpace(doc, cursor, 24);
    doc.text('Check-ins by day', MARGIN, cursor.y);
    cursor.y += 18;

    daysWithEntries.forEach((day) => {
      ensureSpace(doc, cursor, 22 + day.entries.length * 14);
      // Day header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(BODY_FONT_SIZE);
      setTextColor(doc, TEXT_RGB);
      doc.text(formatDateLongLocal(day.date), MARGIN, cursor.y);
      cursor.y += 16;

      // Each check-in entry — zone + time + note (if any)
      day.entries.forEach((entry) => {
        ensureSpace(doc, cursor, 16);
        const zone = NS_ZONES.find((nz) => nz.id === entry.zone);
        const zoneName = zone ? zone.name.toLowerCase() : entry.zone;
        const timeStr = formatTimeLocal(entry.ts);

        doc.setFont('helvetica', 'bold');
        setTextColor(doc, ACCENT_RGB);
        doc.text(zoneName, MARGIN + 12, cursor.y);
        const zoneWidth = doc.getTextWidth(zoneName);

        doc.setFont('helvetica', 'normal');
        setTextColor(doc, MUTED_RGB);
        doc.text(`  ${timeStr}`, MARGIN + 12 + zoneWidth, cursor.y);
        const timeWidth = doc.getTextWidth(`  ${timeStr}`);

        if (entry.note) {
          doc.setFont('helvetica', 'italic');
          setTextColor(doc, TEXT_RGB);
          const noteLines = splitText(doc, entry.note, BODY_FONT_SIZE, CONTENT_WIDTH - 12 - zoneWidth - timeWidth - 8);
          noteLines.forEach((line, i) => {
            if (i > 0) {
              cursor.y += LINE_HEIGHT;
              ensureSpace(doc, cursor, LINE_HEIGHT);
            }
            doc.text(line, MARGIN + 12 + zoneWidth + timeWidth + 8, cursor.y);
          });
        }
        cursor.y += 14;
      });
      cursor.y += 6;
    });
  }
}

// Render just the entries for the given week (filtered by caller).
function renderWeekEntries(
  doc: jsPDF,
  cursor: Cursor,
  entries: GlimmerEntry[],
  weekStart: string
) {
  if (entries.length === 0) return;
  doc.addPage();
  cursor.y = MARGIN;
  writeSectionHeader(doc, cursor, 'Daily Entries', `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}  ·  ${formatWeekRange(weekStart)}`);

  // Sort chronologically (oldest first) — matches the on-screen chronological order.
  const sorted = [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.promptIndex - b.promptIndex;
  });
  sorted.forEach((entry) => {
    renderEntry(doc, cursor, entry, { compact: false });
    cursor.y += 6;
  });
}

// Render just the weekly reflection for the given week.
function renderWeekReflection(
  doc: jsPDF,
  cursor: Cursor,
  responses: string[],
  weekStart: string
) {
  // Treat empty/all-blank responses as "no reflection this week."
  const hasAnyContent = responses.some((r) => r && r.trim().length > 0);
  if (!hasAnyContent) return;

  doc.addPage();
  cursor.y = MARGIN;
  writeSectionHeader(doc, cursor, 'Weekly Reflection', formatWeekRange(weekStart));

  const WEEKLY_PROMPTS = [
    'This week I noticed my body felt safest when\u2026',
    'I felt most disconnected or activated on\u2026',
    'One thing I want to do more of next week to feel safe\u2026',
  ];

  responses.forEach((response, idx) => {
    if (idx >= WEEKLY_PROMPTS.length) return;
    const prompt = WEEKLY_PROMPTS[idx];
    // Prompt
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(SMALL_FONT_SIZE);
    setTextColor(doc, MUTED_RGB);
    const promptLines = splitText(doc, prompt, SMALL_FONT_SIZE, CONTENT_WIDTH);
    promptLines.forEach((line) => {
      ensureSpace(doc, cursor, 14);
      doc.text(line, MARGIN, cursor.y);
      cursor.y += 13;
    });
    cursor.y += 6;
    // Response
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(BODY_FONT_SIZE);
    setTextColor(doc, TEXT_RGB);
    const responseLines = splitText(doc, response || '\u2014', BODY_FONT_SIZE, CONTENT_WIDTH - 16);
    responseLines.forEach((line) => {
      ensureSpace(doc, cursor, LINE_HEIGHT);
      doc.text(line, MARGIN + 16, cursor.y);
      cursor.y += LINE_HEIGHT;
    });
    cursor.y += 14;
  });
}

export async function exportWeekToPdf(
  allEntries: GlimmerEntry[],
  options: WeekExportOptions
): Promise<ExportResult> {
  try {
    // Compute the week's date range from weekStart (Monday-anchored).
    const start = new Date(options.weekStart + 'T12:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startStr = options.weekStart;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

    // Filter entries to this week only.
    const weekEntries = allEntries.filter((e) => e.date >= startStr && e.date <= endStr);

    const rangeLabel = formatWeekRange(options.weekStart);
    const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
    const cursor: Cursor = { y: MARGIN };

    // Cover page — focused wording for the per-week export.
    renderCover(doc, cursor, {
      userName: options.userName,
      rangeLabel,
      note: options.note,
    });

    // Override the default "For review with your trauma therapist" subtitle
    // by adding a focused subtitle line after the cover content. Actually
    // we'll let the cover's existing "For review with your trauma therapist"
    // line stay — it's accurate.

    // 1. Check-in summary (with notes) — the nervous-system shape of the week.
    if (options.checkInSummary && options.checkInSummary.total > 0) {
      renderWeekCheckInSummary(doc, cursor, options.checkInSummary, options.weekStart);
    }

    // 2. Daily entries for the week.
    renderWeekEntries(doc, cursor, weekEntries, options.weekStart);

    // 3. Weekly reflection for the week.
    if (options.reflection) {
      renderWeekReflection(doc, cursor, options.reflection, options.weekStart);
    }

    addPageNumbers(doc);

    // Filename: glimmer-week_YYYY-MM-DD_weekstart.pdf
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const weekSlug = options.weekStart.replace(/-/g, '');
    const filename = `glimmer-week_${todayStr}_${weekSlug}.pdf`;
    doc.save(filename);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
