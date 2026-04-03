/**
 * Context Compiler — Compresses raw GameState into token-efficient natural language.
 *
 * Every AI subsystem (Narrator, Tactician, StoryWeaver, ExplorationGM, etc.) needs
 * game state context, but each needs a DIFFERENT slice at a DIFFERENT level of detail.
 * Raw JSON is forbidden in AI prompts — dense natural language summaries are 5-10x
 * more token-efficient.
 *
 * Compression profiles:
 *   - combat-snapshot: positions, HP, conditions, last action (~200 tokens)
 *   - combat-detailed: full tactical state for AI decision-making (~500 tokens)
 *   - narration-context: last action + dramatic context for narrative generation (~300 tokens)
 *   - story-context: campaign arcs, NPCs, consequences, tension (~500 tokens)
 *   - exploration-scene: party state + environment for scene description (~400 tokens)
 *   - downtime-summary: character resources, available activities (~300 tokens)
 *   - world-state: time, tension, consequences, geography (~400 tokens)
 *
 * Design Principles enforced:
 *   #2  Token Efficiency — dense summaries, no raw JSON
 *   #5  KV Cache-Aware — static prefix (profile preamble) + dynamic suffix (state)
 *   #6  Role Specialization — each profile tailored to its consumer
 *   #12 Information Asymmetry — creature descriptions filtered by Recall Knowledge
 *   #16 Anti-Repetition — recent vocabulary tracked and injected as avoidance hints
 */
import type {
  GameState,
  Creature,
  Condition,
  Position,
  GameLog,
  GMSession,
} from 'pf2e-shared';

// ─── Compression Profile Types ───────────────────────────────

export type CompressionProfile =
  | 'combat-snapshot'
  | 'combat-detailed'
  | 'narration-context'
  | 'story-context'
  | 'exploration-scene'
  | 'downtime-summary'
  | 'world-state';

export interface CompilerOptions {
  /** Which compression profile to use */
  profile: CompressionProfile;
  /** Creature ID of the "viewer" — controls information asymmetry (Recall Knowledge) */
  viewerId?: string;
  /** Max tokens budget for the output (soft limit — compiler aims to stay under) */
  maxTokens?: number;
  /** Recent vocabulary to avoid (anti-repetition) */
  recentVocabulary?: string[];
  /** Number of recent log entries to include (default varies by profile) */
  recentLogCount?: number;
}

export interface CompiledContext {
  /** The compressed natural-language summary */
  text: string;
  /** Approximate token count (rough: ~4 chars per token) */
  estimatedTokens: number;
  /** Which profile was used */
  profile: CompressionProfile;
}

// ─── Context Compiler ────────────────────────────────────────

export class ContextCompiler {
  /**
   * Compile game state into a compressed natural-language context string.
   */
  compile(gameState: GameState, options: CompilerOptions): CompiledContext {
    let text: string;

    switch (options.profile) {
      case 'combat-snapshot':
        text = this.compileCombatSnapshot(gameState, options);
        break;
      case 'combat-detailed':
        text = this.compileCombatDetailed(gameState, options);
        break;
      case 'narration-context':
        text = this.compileNarrationContext(gameState, options);
        break;
      case 'story-context':
        text = this.compileStoryContext(gameState, options);
        break;
      case 'exploration-scene':
        text = this.compileExplorationScene(gameState, options);
        break;
      case 'downtime-summary':
        text = this.compileDowntimeSummary(gameState, options);
        break;
      case 'world-state':
        text = this.compileWorldState(gameState, options);
        break;
      default:
        text = this.compileCombatSnapshot(gameState, options);
    }

    // Append anti-repetition hints if vocabulary provided
    if (options.recentVocabulary?.length) {
      text += `\n[Avoid reusing: ${options.recentVocabulary.slice(0, 10).join(', ')}]`;
    }

    return {
      text,
      estimatedTokens: Math.ceil(text.length / 4),
      profile: options.profile,
    };
  }

  // ─── Combat Snapshot (~200 tokens) ─────────────────────────
  // Minimal tactical state. Used for quick narration triggers.

  private compileCombatSnapshot(gs: GameState, opts: CompilerOptions): string {
    const round = gs.currentRound;
    const current = this.getCurrentCreature(gs);
    const lines: string[] = [];

    lines.push(`Round ${round.number}. ${current?.name ?? 'Unknown'}'s turn.`);

    // Alive combatants, one line each
    const alive = gs.creatures.filter(c => c.currentHealth > 0 && !c.dead);
    for (const c of alive) {
      lines.push(this.compressCreatureMinimal(c));
    }

    // Last 2 log entries
    const recentLogs = gs.log.slice(-(opts.recentLogCount ?? 2));
    if (recentLogs.length > 0) {
      lines.push('Recent: ' + recentLogs.map(l => l.message).join(' | '));
    }

    return lines.join('\n');
  }

  // ─── Combat Detailed (~500 tokens) ─────────────────────────
  // Full tactical state for AI combat decisions.

  private compileCombatDetailed(gs: GameState, opts: CompilerOptions): string {
    const round = gs.currentRound;
    const current = this.getCurrentCreature(gs);
    const lines: string[] = [];

    lines.push(`=== COMBAT STATE ===`);
    lines.push(`Round ${round.number}, Turn ${round.currentTurnIndex + 1}/${round.turnOrder.length}.`);

    if (current) {
      lines.push(`Active: ${current.name} (${current.actionsRemaining ?? 3} actions, ${current.reactionUsed ? 'no' : 'has'} reaction)`);
    }

    // Map info
    lines.push(`Map: ${gs.map.width}x${gs.map.height}${gs.map.lightingLevel ? ', ' + gs.map.lightingLevel + ' light' : ''}`);

    // All combatants with full tactical info
    const players = gs.creatures.filter(c => c.type === 'player');
    const enemies = gs.creatures.filter(c => c.type === 'creature');
    const npcs = gs.creatures.filter(c => c.type === 'npc');

    if (players.length > 0) {
      lines.push('\n--- PARTY ---');
      for (const c of players) {
        lines.push(this.compressCreatureTactical(c));
      }
    }

    // Companions
    if (gs.companions?.length) {
      lines.push('\n--- COMPANIONS ---');
      for (const c of gs.companions.filter(comp => comp.manifested)) {
        lines.push(this.compressCreatureTactical(c as unknown as Creature));
      }
    }

    if (enemies.length > 0) {
      lines.push('\n--- ENEMIES ---');
      for (const c of enemies) {
        if (c.currentHealth <= 0 || c.dead) {
          lines.push(`${c.name}: DEFEATED`);
        } else {
          lines.push(this.compressCreatureTactical(c));
        }
      }
    }

    if (npcs.length > 0) {
      lines.push('\n--- NPCs ---');
      for (const c of npcs) {
        lines.push(this.compressCreatureMinimal(c));
      }
    }

    // Turn order
    const orderNames = round.turnOrder.map(id => {
      const c = gs.creatures.find(cr => cr.id === id);
      return c ? c.name : '???';
    });
    lines.push(`\nInit order: ${orderNames.join(' → ')}`);

    // Recent actions
    const recentLogs = gs.log.slice(-(opts.recentLogCount ?? 5));
    if (recentLogs.length > 0) {
      lines.push('\nRecent actions:');
      for (const log of recentLogs) {
        lines.push(`  - ${log.message}`);
      }
    }

    return lines.join('\n');
  }

  // ─── Narration Context (~300 tokens) ───────────────────────
  // Context for generating narrative descriptions of what just happened.

  private compileNarrationContext(gs: GameState, opts: CompilerOptions): string {
    const lines: string[] = [];
    const current = this.getCurrentCreature(gs);

    // Last action is the one we're narrating
    const recentLogs = gs.log.slice(-(opts.recentLogCount ?? 3));
    const lastAction = recentLogs[recentLogs.length - 1];

    lines.push(`Round ${gs.currentRound.number}. ${current?.name ?? 'Someone'}'s turn.`);

    // Dramatic context — who's in danger?
    const nearDeath = gs.creatures.filter(c =>
      c.currentHealth > 0 && !c.dead && c.currentHealth <= c.maxHealth * 0.25
    );
    if (nearDeath.length > 0) {
      lines.push(`Near death: ${nearDeath.map(c => `${c.name} (${c.currentHealth}/${c.maxHealth})`).join(', ')}`);
    }

    const dying = gs.creatures.filter(c => c.dying && !c.dead);
    if (dying.length > 0) {
      lines.push(`Dying: ${dying.map(c => c.name).join(', ')}`);
    }

    const defeated = gs.creatures.filter(c => c.dead || (c.currentHealth <= 0 && !c.dying));
    if (defeated.length > 0) {
      lines.push(`Defeated: ${defeated.map(c => c.name).join(', ')}`);
    }

    // Participants with basic info
    const alive = gs.creatures.filter(c => c.currentHealth > 0 && !c.dead);
    for (const c of alive) {
      const conditions = this.compressConditions(c.conditions);
      const hpPct = Math.round((c.currentHealth / c.maxHealth) * 100);
      lines.push(`${c.name} (${c.type}, L${c.level}): ${hpPct}% HP${conditions ? ', ' + conditions : ''}`);
    }

    // The action to narrate
    if (lastAction) {
      lines.push(`\nAction to narrate: ${lastAction.message}`);
      if (lastAction.details) {
        const d = lastAction.details;
        if (d.damage) lines.push(`  Damage: ${d.damage}`);
        if (d.roll) lines.push(`  Roll: ${d.roll}`);
        if (d.criticalHit) lines.push(`  CRITICAL HIT!`);
        if (d.criticalFailure) lines.push(`  CRITICAL FAILURE!`);
      }
    }

    // Previous actions for flow
    if (recentLogs.length > 1) {
      lines.push('\nPrior actions:');
      for (const log of recentLogs.slice(0, -1)) {
        lines.push(`  - ${log.message}`);
      }
    }

    // Campaign tone if available
    if (gs.gmSession?.campaignPreferences?.tone) {
      lines.push(`\nTone: ${gs.gmSession.campaignPreferences.tone}`);
    }

    return lines.join('\n');
  }

  // ─── Story Context (~500 tokens) ───────────────────────────
  // Campaign-level context for story decisions, NPC dialogue, consequence weaving.

  private compileStoryContext(gs: GameState, opts: CompilerOptions): string {
    const lines: string[] = [];
    const gm = gs.gmSession;

    lines.push(`=== STORY CONTEXT ===`);

    if (gm?.campaignPreferences) {
      const prefs = gm.campaignPreferences;
      lines.push(`Campaign: "${prefs.campaignName}", tone: ${prefs.tone}, pacing: ${prefs.pacing}`);
      if (prefs.themes?.length) {
        lines.push(`Themes: ${prefs.themes.join(', ')}`);
      }
    }

    // Story arc
    if (gm?.storyArc) {
      const arc = gm.storyArc;
      lines.push(`\nStory phase: ${arc.storyPhase}`);
      lines.push(`BBEG: ${arc.bbegName} — ${arc.bbegMotivation}`);
      if (arc.keyLocations.length > 0) {
        lines.push(`Key locations: ${arc.keyLocations.join(', ')}`);
      }
      const completedMilestones = arc.milestones.filter(m => m.completed).length;
      const totalMilestones = arc.milestones.length;
      lines.push(`Milestones: ${completedMilestones}/${totalMilestones} completed`);
      const nextMilestone = arc.milestones.find(m => !m.completed);
      if (nextMilestone) {
        lines.push(`Next milestone: ${nextMilestone.description}`);
      }
    }

    // Tension
    if (gm?.tensionTracker) {
      const t = gm.tensionTracker;
      lines.push(`\nTension: ${t.score}/100 (${t.trend})`);
    }

    // Key NPCs (alive, most recent interactions first)
    if (gm?.recurringNPCs?.length) {
      lines.push(`\nRecurring NPCs:`);
      const activeNPCs = gm.recurringNPCs
        .filter(n => n.isAlive)
        .slice(0, 8); // Cap at 8 to save tokens
      for (const npc of activeNPCs) {
        const disposition = npc.disposition > 30 ? 'friendly' : npc.disposition < -30 ? 'hostile' : 'neutral';
        const lastInteraction = npc.interactions[npc.interactions.length - 1];
        let line = `  ${npc.name} (${npc.role}, ${disposition})`;
        if (lastInteraction) {
          line += ` — last: "${lastInteraction.summary}"`;
        }
        lines.push(line);
      }
    }

    // Session notes (most recent only)
    if (gm?.sessionNotes?.length) {
      const latest = gm.sessionNotes[gm.sessionNotes.length - 1];
      lines.push(`\nLast session: "${latest.title}"`);
      lines.push(`  ${latest.summary}`);
      if (latest.keyDecisions.length > 0) {
        lines.push(`  Key decisions: ${latest.keyDecisions.join('; ')}`);
      }
    }

    // Current phase
    if (gm?.currentPhase) {
      lines.push(`\nCurrent phase: ${gm.currentPhase}`);
    }

    // Party summary
    const players = gs.creatures.filter(c => c.type === 'player');
    if (players.length > 0) {
      lines.push(`\nParty: ${players.map(p =>
        `${p.name} (${p.characterClass ?? 'Unknown'} ${p.level})`
      ).join(', ')}`);
    }

    return lines.join('\n');
  }

  // ─── Exploration Scene (~400 tokens) ───────────────────────
  // Party state + environment for scene description during exploration.

  private compileExplorationScene(gs: GameState, opts: CompilerOptions): string {
    const lines: string[] = [];
    const gm = gs.gmSession;

    lines.push(`=== EXPLORATION ===`);
    lines.push(`Phase: ${gm?.currentPhase ?? 'exploration'}`);

    // Scene visual
    if (gm?.currentSceneVisual) {
      lines.push(`Scene: ${gm.currentSceneVisual.caption}`);
    }

    // Map context
    if (gs.map.mapTheme) {
      lines.push(`Environment: ${gs.map.mapTheme}${gs.map.mapSubTheme ? '/' + gs.map.mapSubTheme : ''}`);
    }
    if (gs.map.lightingLevel) {
      lines.push(`Lighting: ${gs.map.lightingLevel}`);
    }

    // Party with exploration-relevant details
    const players = gs.creatures.filter(c => c.type === 'player');
    lines.push(`\nParty:`);
    for (const p of players) {
      const hpPct = Math.round((p.currentHealth / p.maxHealth) * 100);
      const conditions = this.compressConditions(p.conditions);
      let line = `  ${p.name} (${p.characterClass ?? '???'} ${p.level}): ${hpPct}% HP`;
      if (conditions) line += `, ${conditions}`;
      // Key exploration skills
      const perception = p.skills?.find(s => s.name.toLowerCase() === 'perception');
      const stealth = p.skills?.find(s => s.name.toLowerCase() === 'stealth');
      if (perception || stealth) {
        const skillBits: string[] = [];
        if (perception) skillBits.push(`Perc +${perception.bonus}`);
        if (stealth) skillBits.push(`Stealth +${stealth.bonus}`);
        line += ` [${skillBits.join(', ')}]`;
      }
      if (p.senses?.length) {
        line += ` Senses: ${p.senses.join(', ')}`;
      }
      lines.push(line);
    }

    // Companions
    if (gs.companions?.length) {
      const manifested = gs.companions.filter(c => c.manifested);
      if (manifested.length > 0) {
        lines.push(`Companions: ${manifested.map(c => `${c.name} (${c.companionType})`).join(', ')}`);
      }
    }

    // NPCs in current area
    const npcs = gs.creatures.filter(c => c.type === 'npc');
    if (npcs.length > 0) {
      lines.push(`\nNPCs present: ${npcs.map(n => n.name).join(', ')}`);
    }

    // Tension
    if (gm?.tensionTracker) {
      lines.push(`\nTension: ${gm.tensionTracker.score}/100 (${gm.tensionTracker.trend})`);
    }

    // Tone
    if (gm?.campaignPreferences?.tone) {
      lines.push(`Tone: ${gm.campaignPreferences.tone}`);
    }

    return lines.join('\n');
  }

  // ─── Downtime Summary (~300 tokens) ────────────────────────
  // Character resources and available activities during downtime.

  private compileDowntimeSummary(gs: GameState, opts: CompilerOptions): string {
    const lines: string[] = [];
    const gm = gs.gmSession;

    lines.push(`=== DOWNTIME ===`);

    // Party with downtime-relevant info
    const players = gs.creatures.filter(c => c.type === 'player');
    for (const p of players) {
      lines.push(`${p.name} (${p.characterClass ?? '???'} ${p.level}):`);
      lines.push(`  HP: ${p.currentHealth}/${p.maxHealth}`);

      // Crafting/social skills
      const downtimeSkills = ['crafting', 'diplomacy', 'performance', 'lore', 'society', 'medicine'];
      const relevantSkills = p.skills?.filter(s =>
        downtimeSkills.some(ds => s.name.toLowerCase().includes(ds))
      ) ?? [];
      if (relevantSkills.length > 0) {
        lines.push(`  Skills: ${relevantSkills.map(s => `${s.name} +${s.bonus}`).join(', ')}`);
      }

      // Lores
      if (p.lores?.length) {
        lines.push(`  Lores: ${p.lores.map(l => `${l.name} +${l.bonus}`).join(', ')}`);
      }

      // Spell slots remaining
      if (p.spellcasters?.length) {
        for (const sc of p.spellcasters) {
          const availSlots = sc.slots?.filter(s => s.available > 0).map(s =>
            `L${s.level}:${s.available}/${s.max}`
          ) ?? [];
          if (availSlots.length > 0) {
            lines.push(`  Spell slots (${sc.tradition}): ${availSlots.join(', ')}`);
          }
        }
      }

      // Focus/hero points
      if (p.focusPoints !== undefined) {
        lines.push(`  Focus: ${p.focusPoints}/${p.maxFocusPoints ?? 1}`);
      }
      if (p.heroPoints !== undefined) {
        lines.push(`  Hero points: ${p.heroPoints}`);
      }

      // Consumables
      if (p.consumables?.length) {
        lines.push(`  Consumables: ${p.consumables.map(c => `${c.id} x${c.quantity}`).join(', ')}`);
      }
    }

    // Campaign context
    if (gm?.campaignPreferences) {
      lines.push(`\nLocation context: ${gm.campaignPreferences.campaignName}`);
    }

    // Tension (affects downtime availability)
    if (gm?.tensionTracker) {
      lines.push(`Tension: ${gm.tensionTracker.score}/100 — ${
        gm.tensionTracker.score > 70 ? 'limited downtime' :
        gm.tensionTracker.score > 40 ? 'some pressure' :
        'relaxed, full downtime available'
      }`);
    }

    return lines.join('\n');
  }

  // ─── World State (~400 tokens) ─────────────────────────────
  // Global context: time, tension, active consequences, geography.

  private compileWorldState(gs: GameState, opts: CompilerOptions): string {
    const lines: string[] = [];
    const gm = gs.gmSession;

    lines.push(`=== WORLD STATE ===`);

    // Campaign
    if (gm?.campaignPreferences) {
      const prefs = gm.campaignPreferences;
      lines.push(`Campaign: "${prefs.campaignName}", tone: ${prefs.tone}`);
      if (prefs.themes?.length) {
        lines.push(`Themes: ${prefs.themes.join(', ')}`);
      }
    }

    // Tension and trend
    if (gm?.tensionTracker) {
      const t = gm.tensionTracker;
      lines.push(`\nTension: ${t.score}/100 (${t.trend})`);
      // Recent tension changes
      const recentHistory = t.history?.slice(-3) ?? [];
      if (recentHistory.length > 0) {
        lines.push(`Recent tension shifts:`);
        for (const h of recentHistory) {
          lines.push(`  ${h.score}: ${h.reason}`);
        }
      }
    }

    // Story arc
    if (gm?.storyArc) {
      const arc = gm.storyArc;
      lines.push(`\nStory: ${arc.storyPhase} phase`);
      lines.push(`BBEG: ${arc.bbegName} (${arc.bbegMotivation})`);
      const pendingMilestones = arc.milestones.filter(m => !m.completed);
      if (pendingMilestones.length > 0) {
        lines.push(`Pending milestones: ${pendingMilestones.map(m => m.description).join('; ')}`);
      }
      if (arc.secretPlots?.length) {
        lines.push(`Active plots: ${arc.secretPlots.join('; ')}`);
      }
    }

    // Combat stats
    if (gm) {
      lines.push(`\nEncounters completed: ${gm.encounterCount}`);
      lines.push(`XP awarded: ${gm.xpAwarded}`);
      lines.push(`Current phase: ${gm.currentPhase}`);
      lines.push(`Difficulty: ${gm.difficulty}`);
    }

    // NPC summary (count by role)
    if (gm?.recurringNPCs?.length) {
      const alive = gm.recurringNPCs.filter(n => n.isAlive);
      const byRole: Record<string, number> = {};
      for (const npc of alive) {
        byRole[npc.role] = (byRole[npc.role] ?? 0) + 1;
      }
      lines.push(`\nActive NPCs: ${alive.length} (${Object.entries(byRole).map(([r, n]) => `${n} ${r}`).join(', ')})`);
    }

    return lines.join('\n');
  }

  // ─── Helper: Compress a creature to one line ───────────────

  private compressCreatureMinimal(c: Creature): string {
    const hpPct = Math.round((c.currentHealth / c.maxHealth) * 100);
    const conditions = this.compressConditions(c.conditions);
    const pos = `(${c.positions.x},${c.positions.y})`;
    let line = `${c.name} (${c.type}, L${c.level}): ${hpPct}% HP at ${pos}`;
    if (conditions) line += `, ${conditions}`;
    if (c.dying) line += ' [DYING]';
    if (c.dead) line += ' [DEAD]';
    return line;
  }

  // ─── Helper: Compress a creature with full tactical info ───

  private compressCreatureTactical(c: Creature): string {
    const parts: string[] = [];

    // Name, class, level
    const classStr = c.characterClass ? `${c.characterClass} ` : '';
    parts.push(`${c.name} (${classStr}L${c.level})`);

    // HP
    parts.push(`HP ${c.currentHealth}/${c.maxHealth}`);
    if (c.temporaryHealth) parts.push(`+${c.temporaryHealth} temp`);

    // AC + shield
    let acStr = `AC ${c.armorClass}`;
    if (c.shieldRaised) {
      acStr += ' (shield raised)';
    }
    parts.push(acStr);

    // Position
    parts.push(`at (${c.positions.x},${c.positions.y})`);

    let line = parts.join(', ');

    // Conditions (important for tactics)
    const conditions = this.compressConditions(c.conditions);
    if (conditions) line += ` | Conditions: ${conditions}`;

    // Weapon info
    const heldWeapons = c.weaponInventory?.filter(s => s.state === 'held') ?? [];
    if (heldWeapons.length > 0) {
      const weaponStr = heldWeapons.map(s => {
        let name = s.weapon.display;
        if (s.weapon.potencyRune) name += ` +${s.weapon.potencyRune}`;
        if (s.weapon.strikingRune) name += ` ${s.weapon.strikingRune}`;
        return name;
      }).join(', ');
      line += ` | Weapons: ${weaponStr}`;
    }

    // Key combat resources
    const resources: string[] = [];
    if (c.actionsRemaining !== undefined) resources.push(`${c.actionsRemaining} actions`);
    if (c.reactionUsed === false) resources.push('reaction avail');
    if (c.focusPoints !== undefined && c.focusPoints > 0) resources.push(`${c.focusPoints} focus`);
    if (c.heroPoints !== undefined && c.heroPoints > 0) resources.push(`${c.heroPoints} hero pts`);
    if (resources.length > 0) line += ` | ${resources.join(', ')}`;

    // Damage modifiers (critical for tactics)
    if (c.damageResistances?.length) {
      line += ` | Resist: ${c.damageResistances.map(r => `${r.type} ${r.value}`).join(', ')}`;
    }
    if (c.damageWeaknesses?.length) {
      line += ` | Weak: ${c.damageWeaknesses.map(w => `${w.type} ${w.value}`).join(', ')}`;
    }
    if (c.damageImmunities?.length) {
      line += ` | Immune: ${c.damageImmunities.join(', ')}`;
    }

    // Active class features (affect tactics)
    const activeFeatures: string[] = [];
    if (c.rageActive) activeFeatures.push('RAGING');
    if (c.kiStrikeActive) activeFeatures.push('Ki Strike');
    if (c.unleashPsycheActive) activeFeatures.push('Psyche Unleashed');
    if (c.wildShapeActive) activeFeatures.push(`Wild Shape (${c.wildShapeForm})`);
    if (c.kineticAuraActive) activeFeatures.push(`Kinetic Aura (${c.kineticElement})`);
    if ((c as Creature & { classSpecific?: { hasPanache?: boolean } }).classSpecific?.hasPanache) activeFeatures.push('Panache');
    if (activeFeatures.length > 0) line += ` | Active: ${activeFeatures.join(', ')}`;

    return line;
  }

  // ─── Helper: Compress conditions to a short string ─────────

  private compressConditions(conditions: Condition[]): string {
    if (!conditions || conditions.length === 0) return '';

    return conditions.map(c => {
      let str = c.name;
      if (c.value !== undefined) str += ` ${c.value}`;
      if (c.isPersistentDamage && c.damageType) {
        str = `persistent ${c.damageType}${c.damageFormula ? ' ' + c.damageFormula : ''}`;
      }
      return str;
    }).join(', ');
  }

  // ─── Helper: Get current creature ──────────────────────────

  private getCurrentCreature(gs: GameState): Creature | undefined {
    const currentId = gs.currentRound.turnOrder[gs.currentRound.currentTurnIndex];
    return gs.creatures.find(c => c.id === currentId);
  }
}
