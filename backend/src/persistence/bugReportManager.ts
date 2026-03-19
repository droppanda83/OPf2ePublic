import * as fs from 'fs';
import * as path from 'path';
import type { BugReport, BugReportStatus } from 'pf2e-shared';

/**
 * Manages bug report persistence using a single JSON file.
 * All reports are stored in `<dataDir>/bug-reports.json`.
 */
export class BugReportManager {
  private filePath: string;

  constructor(dataDirectory: string = 'saves') {
    if (!fs.existsSync(dataDirectory)) {
      fs.mkdirSync(dataDirectory, { recursive: true });
    }
    this.filePath = path.join(dataDirectory, 'bug-reports.json');
    this.ensureFile();
  }

  // ─── READ / WRITE HELPERS ──────────────────────────────

  private ensureFile(): void {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  private readAll(): BugReport[] {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw) as BugReport[];
    } catch {
      return [];
    }
  }

  private writeAll(reports: BugReport[]): void {
    fs.writeFileSync(this.filePath, JSON.stringify(reports, null, 2), 'utf-8');
  }

  // ─── PUBLIC API ────────────────────────────────────────

  /**
   * Create a new bug report. Returns the full report with generated `id`, timestamps, and default status.
   */
  create(data: Omit<BugReport, 'id' | 'createdAt' | 'updatedAt' | 'status'>): BugReport {
    const reports = this.readAll();

    const now = new Date().toISOString();
    const report: BugReport = {
      ...data,
      id: this.generateId(),
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };

    reports.push(report);
    this.writeAll(reports);
    return report;
  }

  /**
   * Get a single report by ID. Returns `null` if not found.
   */
  getById(id: string): BugReport | null {
    return this.readAll().find(r => r.id === id) ?? null;
  }

  /**
   * List all reports, newest first. Optional filters.
   */
  list(filters?: { status?: BugReportStatus; category?: string; severity?: string }): BugReport[] {
    let reports = this.readAll();

    if (filters?.status) {
      reports = reports.filter(r => r.status === filters.status);
    }
    if (filters?.category) {
      reports = reports.filter(r => r.category === filters.category);
    }
    if (filters?.severity) {
      reports = reports.filter(r => r.severity === filters.severity);
    }

    return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Update an existing report. Only the provided fields are overwritten.
   * Returns the updated report, or `null` if not found.
   */
  update(id: string, patch: Partial<Omit<BugReport, 'id' | 'createdAt'>>): BugReport | null {
    const reports = this.readAll();
    const idx = reports.findIndex(r => r.id === id);
    if (idx === -1) return null;

    reports[idx] = {
      ...reports[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    this.writeAll(reports);
    return reports[idx];
  }

  /**
   * Delete a report by ID. Returns `true` if deleted, `false` if not found.
   */
  delete(id: string): boolean {
    const reports = this.readAll();
    const idx = reports.findIndex(r => r.id === id);
    if (idx === -1) return false;

    reports.splice(idx, 1);
    this.writeAll(reports);
    return true;
  }

  /**
   * Get summary statistics.
   */
  stats(): { total: number; open: number; inProgress: number; resolved: number; closed: number } {
    const reports = this.readAll();
    return {
      total: reports.length,
      open: reports.filter(r => r.status === 'open').length,
      inProgress: reports.filter(r => r.status === 'in-progress').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      closed: reports.filter(r => r.status === 'closed').length,
    };
  }

  // ─── PRIVATE ───────────────────────────────────────────

  private generateId(): string {
    return `bug_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  }
}
