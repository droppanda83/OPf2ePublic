/**
 * Campaign Map Tracker — Tracks which maps have been used in a campaign
 * so the GM can revisit locations and avoid unnecessary repetition.
 */

export interface CampaignMapUsage {
  /** The map ID from the Foundry catalog */
  mapId: string;
  /** Campaign/session identifier */
  campaignId: string;
  /** When the map was used (ISO timestamp) */
  usedAt: string;
  /** Narrative context when the map was introduced */
  narrativeContext?: string;
  /** Custom name the GM gave this location (e.g., "The Barrow of King Aldric") */
  locationName?: string;
  /** GM notes about what happened here */
  gmNotes?: string;
  /** Whether this location was marked as revisitable */
  revisitable: boolean;
  /** Encounter level when this map was used */
  encounterLevel?: number;
  /** Party members present */
  partyMembers?: string[];
}

export interface CampaignMapHistory {
  campaignId: string;
  /** All maps used in this campaign, ordered by usage time */
  usages: CampaignMapUsage[];
}

/**
 * In-memory campaign map tracker.
 * In a production system this would persist to a database;
 * for now it keeps history in memory per server session.
 */
export class CampaignMapTracker {
  private histories: Map<string, CampaignMapHistory> = new Map();

  /** Record that a map was used in a campaign */
  recordUsage(usage: CampaignMapUsage): void {
    let history = this.histories.get(usage.campaignId);
    if (!history) {
      history = { campaignId: usage.campaignId, usages: [] };
      this.histories.set(usage.campaignId, history);
    }
    history.usages.push(usage);
  }

  /** Get the full map history for a campaign */
  getHistory(campaignId: string): CampaignMapUsage[] {
    return this.histories.get(campaignId)?.usages || [];
  }

  /** Get the IDs of all maps used in a campaign (for exclusion / de-duping) */
  getUsedMapIds(campaignId: string): string[] {
    return [...new Set(this.getHistory(campaignId).map(u => u.mapId))];
  }

  /** Check if a map has been used in the campaign */
  hasUsedMap(campaignId: string, mapId: string): boolean {
    return this.getHistory(campaignId).some(u => u.mapId === mapId);
  }

  /** Get all revisitable locations in a campaign */
  getRevisitableLocations(campaignId: string): CampaignMapUsage[] {
    return this.getHistory(campaignId).filter(u => u.revisitable);
  }

  /** Find a previous usage by location name (fuzzy match) */
  findByLocationName(campaignId: string, name: string): CampaignMapUsage | undefined {
    const lower = name.toLowerCase();
    return this.getHistory(campaignId).find(u =>
      u.locationName?.toLowerCase().includes(lower)
    );
  }

  /** Get a summary suitable for feeding to the AI GM */
  getAiSummary(campaignId: string): string {
    const usages = this.getHistory(campaignId);
    if (usages.length === 0) return 'No maps have been used in this campaign yet.';

    const lines = ['Previously visited locations in this campaign:'];
    for (const u of usages) {
      const name = u.locationName || u.mapId;
      const revisit = u.revisitable ? ' [revisitable]' : '';
      const notes = u.gmNotes ? ` — ${u.gmNotes}` : '';
      lines.push(`- ${name} (${u.usedAt})${revisit}${notes}`);
    }
    return lines.join('\n');
  }

  /** Export all data (for save/load) */
  exportAll(): Record<string, CampaignMapHistory> {
    const result: Record<string, CampaignMapHistory> = {};
    for (const [id, history] of this.histories) {
      result[id] = history;
    }
    return result;
  }

  /** Import saved data */
  importAll(data: Record<string, CampaignMapHistory>): void {
    this.histories.clear();
    for (const [id, history] of Object.entries(data)) {
      this.histories.set(id, history);
    }
  }
}

/** Singleton tracker instance */
export const campaignMapTracker = new CampaignMapTracker();
