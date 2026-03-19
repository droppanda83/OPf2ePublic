import { AIProviders } from './providers';
import { GameEngine } from '../game/engine';
import { AITurnResponse, Creature, GameState } from 'pf2e-shared';
import { TacticalAI, AIDifficulty } from './tacticalAI';

const DEFAULT_OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-5').trim();

export class AIManager {
  private providers: AIProviders;
  private tacticalAI: TacticalAI;
  /** When true, skip remote AI calls entirely — set after quota/auth failures */
  private _useLocalOnly = false;
  /** Timestamp of last quota/auth failure. Retry remote after 5 minutes. */
  private _localOnlySince = 0;

  constructor(providers: AIProviders, difficulty: AIDifficulty = 'normal') {
    this.providers = providers;
    this.tacticalAI = new TacticalAI(difficulty);
  }

  setDifficulty(difficulty: AIDifficulty): void {
    this.tacticalAI.setDifficulty(difficulty);
  }

  /**
   * Decide a full turn of actions for the current NPC.
   * Returns an array of AITurnResponse (one per action).
   * If GPT/Claude is available, uses it with structured output.
   * Otherwise, falls back to the local tactical AI.
   */
  async decideTurn(gameId: string, gameEngine: GameEngine): Promise<AITurnResponse[]> {
    const gameState = gameEngine.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');

    const currentCreatureIndex = gameState.currentRound.currentTurnIndex;
    const currentCreatureId = gameState.currentRound.turnOrder[currentCreatureIndex];
    const currentCreature = gameState.creatures.find((c) => c.id === currentCreatureId);

    if (!currentCreature || (currentCreature.type !== 'npc' && currentCreature.type !== 'creature')) {
      throw new Error('Not an NPC turn');
    }

    // If we hit a quota/auth failure recently, skip remote AI for 5 minutes
    if (this._useLocalOnly && Date.now() - this._localOnlySince < 5 * 60 * 1000) {
      return this.tacticalAI.decideTurn(gameState, currentCreature);
    }
    this._useLocalOnly = false; // Reset after 5 min

    // If no AI provider, use local tactical AI
    if (!this.providers.hasAny) {
      return this.tacticalAI.decideTurn(gameState, currentCreature);
    }

    // Try AI with structured output
    try {
      const result = await this.decideWithAI(gameState, currentCreature);
      if (result && result.length > 0) return result;
    } catch (error: any) {
      // If it's a quota/billing/auth error, stop retrying for a while
      const status = error?.status ?? error?.statusCode ?? 0;
      const code = error?.code ?? '';
      if (status === 429 || status === 401 || status === 403 || code === 'insufficient_quota') {
        console.warn(`⚠️ AI provider returned ${status} (${code}) — switching to local tactical AI for 5 minutes`);
        this._useLocalOnly = true;
        this._localOnlySince = Date.now();
      } else {
        console.warn('AI API call failed, using tactical fallback:', error?.message || error);
      }
    }

    // Fallback to local tactical AI
    return this.tacticalAI.decideTurn(gameState, currentCreature);
  }

  /**
   * Legacy single-action API for backward compatibility.
   */
  async decideSingleAction(gameId: string, gameEngine: GameEngine): Promise<AITurnResponse> {
    const actions = await this.decideTurn(gameId, gameEngine);
    return actions[0];
  }

  // ─── AI Integration with Structured Output ──────────────

  /** Resolve which model to use: per-game preference > env default */
  private resolveModel(gameState: GameState): string {
    const preferred = gameState.gmSession?.campaignPreferences?.aiModel?.trim();
    return preferred && preferred.length > 0 ? preferred : DEFAULT_OPENAI_MODEL;
  }

  private async decideWithAI(
    gameState: GameState,
    creature: Creature
  ): Promise<AITurnResponse[]> {
    if (!this.providers.hasAny) return [];

    const context = this.buildStructuredContext(gameState, creature);
    const actionsRemaining = creature.actionsRemaining ?? 3;
    const model = this.resolveModel(gameState);

    const result = await this.providers.chatComplete({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a tactical combat AI for Pathfinder 2e Remaster. You control a creature in an encounter.

RULES:
- Each turn has ${actionsRemaining} action(s) remaining.
- Multiple Attack Penalty (MAP): 2nd attack -5 (-4 agile), 3rd attack -10 (-8 agile).
- Speed determines max Stride distance (in feet; 5ft = 1 square).
- Damage is determined by the creature's weapon dice, NOT by a formula you generate.
- Available actions are listed below. Only use actions from this list.

VALID ACTION TYPES:
- "strike": Melee or ranged attack. Specify targetId and optionally weaponId.
- "stride": Move to a position. Specify targetPosition {x, y}. Max distance = Speed/5 squares.
- "step": 5ft step (1 square, doesn't provoke). Specify targetPosition.
- "raise-shield": +2 AC until next turn (requires equipped shield). No target needed.
- "demoralize": Intimidation vs Will DC. Specify targetId. Does NOT have Attack trait (no MAP).
- "trip": Athletics vs Reflex DC. Specify targetId. Has Attack trait (uses MAP). Target falls prone.
- "grapple": Athletics vs Fortitude DC. Specify targetId. Has Attack trait. Target is grabbed.
- "shove": Athletics vs Fortitude DC. Specify targetId. Has Attack trait.
- "take-cover": +2 circumstance AC. No target needed.
- Spell IDs: Cast a spell by its ID (e.g., "fireball", "heal"). Specify targetId or targetPosition.

TACTICAL PRIORITIES:
1. Focus fire on wounded enemies (< 50% HP)
2. Avoid 3+ attacks (MAP -10 is rarely worth it)
3. Use Demoralize as 3rd action (no MAP penalty, applies frightened)
4. Position for flanking when possible (opposite side of ally)
5. Raise Shield as last action if shield equipped
6. Use healing when below 30% HP

Respond ONLY with a JSON array of actions for this turn:
[
  { "actionId": "stride", "targetPosition": {"x": 5, "y": 3}, "reasoning": "..." },
  { "actionId": "strike", "targetId": "player-1", "weaponId": "longsword", "reasoning": "..." },
  { "actionId": "raise-shield", "reasoning": "..." }
]

Each action must have: actionId (string), reasoning (string).
Optional: targetId, targetPosition, weaponId, spellId.

${context}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const responseText = result.content;

    // Try to extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Try single object
      const singleMatch = responseText.match(/\{[\s\S]*\}/);
      if (!singleMatch) return [];

      const actionData = JSON.parse(singleMatch[0]);
      return [this.parseGPTAction(creature, actionData)];
    }

    const actionsData = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(actionsData)) return [];

    return actionsData
      .slice(0, actionsRemaining) // Don't exceed available actions
      .map((a: any) => this.parseGPTAction(creature, a));
  }

  private parseGPTAction(creature: Creature, actionData: any): AITurnResponse {
    return {
      action: {
        id: crypto.randomUUID(),
        creatureId: creature.id,
        actionId: actionData.actionId || actionData.action || 'strike',
        targetId: actionData.targetId,
        targetPosition: actionData.targetPosition,
        result: 'pending',
        details: {
          weaponId: actionData.weaponId,
          spellId: actionData.spellId,
        },
      },
      reasoning: actionData.reasoning || 'AI tactical decision.',
    };
  }

  // ─── Structured Game Context for GPT ────────────────────────────

  private buildStructuredContext(gameState: GameState, creature: Creature): string {
    // Creature stats
    const weapons = creature.weaponInventory || [];
    const weaponInfo = weapons.length > 0
      ? weapons.map(slot => {
          const w = slot.weapon;
          return `  - ${w.display} (${w.attackType}, id="${w.id}"): +${w.attackBonus ?? '?'} to hit, ${w.damageDice}${w.damageBonus ? `+${w.damageBonus}` : ''} ${w.damageType}${w.traits?.length ? ` [${w.traits.join(', ')}]` : ''}`;
        }).join('\n')
      : '  - Unarmed: +0 to hit';

    const skills = (creature.skills || [])
      .filter(s => s.bonus >= 5) // Only show meaningful skills
      .map(s => `${s.name} +${s.bonus}`)
      .join(', ');

    const conditions = (creature.conditions || [])
      .map(c => `${c.name}${c.value ? ` ${c.value}` : ''}`)
      .join(', ') || 'none';

    const spellInfo = creature.spellcasters?.length
      ? `- Spellcaster: ${creature.spellcasters.map(t => t.tradition).join(', ')}`
      : '';

    const shieldInfo = creature.equippedShield
      ? `- Shield: ${creature.equippedShield} (${creature.shieldRaised ? 'RAISED' : 'lowered'})`
      : '';

    // Other combatants
    const othersInfo = gameState.creatures
      .filter(c => c.id !== creature.id && c.currentHealth > 0 && !c.dead)
      .map(c => {
        const dist = Math.abs(c.positions.x - creature.positions.x) +
                     Math.abs(c.positions.y - creature.positions.y);
        const relation = c.type === creature.type ? 'ALLY' : 'ENEMY';
        const conds = (c.conditions || []).map(cn => cn.name).join(', ');
        return `- ${c.name} [${relation}] (id="${c.id}"): ${c.currentHealth}/${c.maxHealth} HP, AC ${c.armorClass}, at (${c.positions.x},${c.positions.y}), ${dist}sq away${conds ? `, conditions: ${conds}` : ''}`;
      })
      .join('\n');

    // Ally positions for flanking context
    const allies = gameState.creatures.filter(c =>
      c.id !== creature.id && c.type === creature.type && c.currentHealth > 0 && !c.dead
    );
    const flankingHint = allies.length > 0
      ? `\nFLANKING TIP: Your allies are at ${allies.map(a => `(${a.positions.x},${a.positions.y})`).join(', ')}. Moving to the opposite side of an enemy from an ally grants off-guard (-2 AC).`
      : '';

    return `
CURRENT CREATURE: ${creature.name} (id="${creature.id}")
- HP: ${creature.currentHealth}/${creature.maxHealth} (${Math.round(creature.currentHealth / creature.maxHealth * 100)}%)
- AC: ${creature.armorClass}
- Speed: ${creature.speed} ft (${Math.floor(creature.speed / 5)} squares per Stride)
- Position: (${creature.positions.x}, ${creature.positions.y})
- Actions remaining: ${creature.actionsRemaining ?? 3}
- Attacks made this turn: ${creature.attacksMadeThisTurn ?? 0}
${shieldInfo}
- Conditions: ${conditions}
- Weapons:
${weaponInfo}
${skills ? `- Key Skills: ${skills}` : ''}
${spellInfo}

OTHER COMBATANTS:
${othersInfo}
${flankingHint}
Map size: ${gameState.map.width}x${gameState.map.height}
`;
  }
}
