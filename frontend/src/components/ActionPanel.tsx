import React, { useMemo, useState } from 'react';
import { getSpell, resolveSpellId } from '../utils/spellsWrapper';
import { WEAPON_CATALOG } from '../../../shared/weapons';
import { getShield } from '../../../shared/shields';
import './ActionPanel.css';
import type { GameState, Creature, GroundObject } from '../../../shared/types';
import { PF2eActionDiamond, PF2eReactionIcon, PF2eHeroPoints, ActionCostIcon } from './ActionIcons';
import WeaponPicker from './WeaponPicker';
import WeaponManager from './WeaponManager';
import SpellstrikeSelector from './SpellstrikeSelector';

interface Action {
  id: string;
  name: string;
  cost: number;
  description: string;
  icon: string;
  requiresTarget?: boolean;
  range?: number;
  aoe?: boolean;
  aoeRadius?: number;
  weaponId?: string;
  targetId?: string;
  readyActionId?: string;
  itemId?: string;
  spellId?: string;
  usesD20?: boolean;
  movementType?: 'walk' | 'teleport';
}

interface ActionRequirementCheckResult {
  ok: boolean;
  unknown?: boolean;
}

type ActionRequirementCheck = (creature: any) => ActionRequirementCheckResult;

interface ActionRequirement {
  id: string;
  label: string;
  check: ActionRequirementCheck;
}

interface ActionDefinition extends Action {
  category: 'combat' | 'explore' | 'downtime';
  requirements?: ActionRequirement[];
  tags?: string[];
  unique?: boolean;
}

interface ActionPanelProps {
  currentCreature: Creature;
  selectedAction: Action | null;
  selectedTarget: string | null;
  movementInfo: {
    costMap: Map<string, number>;
    maxDistance: number;
  } | null;
  actionPoints: number;
  gameState?: GameState;
  onSelectAction: (action: Action) => void;
  onConfirmAction: () => void;
  onCancel: () => void;
  onEndTurn: () => void;
  heroPointSpend: number;
  onHeroPointSpendChange: (value: number) => void;
  loading: boolean;
}

// Icon components extracted to ActionIcons.tsx (C.2)

const ActionPanel: React.FC<ActionPanelProps> = ({
  currentCreature,
  selectedAction,
  selectedTarget,
  movementInfo,
  actionPoints,
  gameState,
  onSelectAction,
  onConfirmAction,
  onCancel,
  onEndTurn,
  heroPointSpend,
  onHeroPointSpendChange,
  loading
}) => {
  const [activeActionTab, setActiveActionTab] = useState<'combat' | 'explore' | 'downtime'>('combat');
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [spellsMenuOpen, setSpellsMenuOpen] = useState(false);
  const [specialMenuOpen, setSpecialMenuOpen] = useState(false);
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [weaponPickerOpen, setWeaponPickerOpen] = useState(false);
  const [weaponManageOpen, setWeaponManageOpen] = useState(false);
  const [spellstrikeModalOpen, setSpellstrikeModalOpen] = useState(false);
  const heroPoints = Math.max(0, Math.min(currentCreature?.heroPoints ?? 1, 3));
  const reactionUsed = currentCreature?.reactionUsed === true;

  // Get available weapons from creature's weapon inventory
  const weaponInventory = currentCreature?.weaponInventory ?? [];
  const heldWeapons = weaponInventory.filter((s: any) => s.state === 'held' || s.weapon?.isNatural);
  const stowedWeapons = weaponInventory.filter((s: any) => s.state === 'stowed');
  const droppedWeapons = weaponInventory.filter((s: any) => s.state === 'dropped');

  // Build fallback weapon list for creatures without weaponInventory
  const fallbackWeapons: any[] = useMemo(() => {
    if (weaponInventory.length > 0) return [];
    if (!currentCreature) return [];
    // Build a synthetic entry from legacy weapon fields
    if (currentCreature.weaponDisplay) {
      return [{
        weapon: {
          id: '__legacy__',
          display: currentCreature.weaponDisplay,
          attackType: 'melee' as const,
          attackBonus: currentCreature.pbAttackBonus,
          damageDice: currentCreature.weaponDamageDice || '1d4',
          damageBonus: currentCreature.weaponDamageBonus,
          damageType: currentCreature.weaponDamageType || 'bludgeoning',
          hands: 1,
          isNatural: false,
        },
        state: 'held',
      }];
    }
    // Absolute fallback: unarmed strike
    return [{
      weapon: {
        id: '__unarmed__',
        display: 'Unarmed Strike',
        attackType: 'melee' as const,
        attackBonus: currentCreature.pbAttackBonus,
        damageDice: '1d4',
        damageBonus: 0,
        damageType: 'bludgeoning',
        hands: 0,
        isNatural: true,
      },
      state: 'held',
    }];
  }, [weaponInventory.length, currentCreature]);

  // Combined list of pickable weapons for the Strike picker
  const pickableWeapons = heldWeapons.length > 0 ? heldWeapons : fallbackWeapons;
  const creatureAttackBonus = currentCreature?.pbAttackBonus;

  // Calculate hands in use
  const getHandsInUse = () => {
    return heldWeapons
      .filter((s: any) => !s.weapon?.isNatural)
      .reduce((sum: number, s: any) => sum + (s.weapon?.hands || 1), 0);
  };

  const handsInUse = getHandsInUse();
  const handsAvailable = 2 - handsInUse;

  const selectedMovementCost = useMemo(() => {
    if (!movementInfo || !selectedAction || (selectedAction.id !== 'move' && selectedAction.id !== 'stride' && selectedAction.id !== 'step')) {
      return null;
    }
    if (!selectedTarget) {
      return null;
    }
    const match = /^(-?\d+)-(-?\d+)$/.exec(selectedTarget);
    if (!match) {
      return null;
    }
    const key = `${match[1]},${match[2]}`;
    const cost = movementInfo.costMap.get(key);
    if (cost === undefined) {
      return null;
    }
    return cost;
  }, [movementInfo, selectedAction, selectedTarget]);

  if (!currentCreature) {
    return <div className="action-panel empty">Waiting for turn...</div>;
  }

  // Handle dying creatures - show death save button
  if (currentCreature.dying) {
    return (
      <div className="action-panel">
        <h3>💀 Death Saves</h3>
        <div style={{
          padding: '15px',
          background: '#2a1a1a',
          borderRadius: '4px',
          marginBottom: '10px',
          border: '2px solid #ff4444'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#ff4444' }}>
            {currentCreature.name} is DYING!
          </div>
          <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '10px' }}>
            {currentCreature.name} is unconscious. They must make a recovery check each turn.
          </div>
          <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '15px' }}>
            <div>💀 Dying: {(currentCreature as any).conditions?.find((c: Creature) => c.name === 'dying')?.value ?? 1} / 4</div>
            {currentCreature.wounded > 0 && <div>🩹 Wounded: {currentCreature.wounded}</div>}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '6px' }}>Hero Points (click to spend)</div>
            <PF2eHeroPoints
              count={heroPoints}
              selectedSpend={heroPointSpend}
              onSelectSpend={onHeroPointSpendChange}
            />
          </div>
          <button
            onClick={() => {
              // Create a "death-save" action (recovery check)
              const deathSaveAction: Action = {
                id: 'death-save',
                name: 'Recovery Check',
                cost: 0,
                description: `Flat check vs DC ${10 + ((currentCreature as any).conditions?.find((c: Creature) => c.name === 'dying')?.value ?? 1)}`,
                icon: '💀',
                requiresTarget: false,
                usesD20: true
              };
              onSelectAction(deathSaveAction);
              onConfirmAction();
            }}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              background: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            💀 Make Recovery Check
          </button>
        </div>
        <button
          onClick={onEndTurn}
          disabled={loading || !currentCreature.deathSaveMadeThisTurn}
          style={{
            width: '100%',
            padding: '10px',
            background: currentCreature.deathSaveMadeThisTurn ? '#4CAF50' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: currentCreature.deathSaveMadeThisTurn ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            fontSize: '14px',
            marginTop: '10px'
          }}
          title={!currentCreature.deathSaveMadeThisTurn ? 'Must make a death save first!' : ''}
        >
          {currentCreature.deathSaveMadeThisTurn ? 'End Turn' : '⚠ Must Make Death Save First'}
        </button>
      </div>
    );
  }

  const hasWeaponTrait = (creature: any, trait: string): ActionRequirementCheckResult => {
    if (!creature) {
      return { ok: false, unknown: true };
    }
    const traits = Array.isArray(creature.weaponTraits)
      ? creature.weaponTraits
      : (WEAPON_CATALOG[creature.equippedWeapon || '']?.traits ?? null);
    if (Array.isArray(traits)) {
      return { ok: traits.includes(trait) };
    }
    if (creature.equippedWeapon) {
      return { ok: false, unknown: true };
    }
    return { ok: false };
  };

  const getHandsUsed = (creature: any): number => {
    if (!creature) {
      return 0;
    }
    const weaponHands = WEAPON_CATALOG[creature.equippedWeapon || '']?.hands;
    const shieldHands = creature.equippedShield ? getShield(creature.equippedShield)?.hands : 0;
    const safeWeaponHands = Number.isFinite(weaponHands) ? (weaponHands as number) : (creature.equippedWeapon ? 2 : 0);
    const safeShieldHands = Number.isFinite(shieldHands) ? (shieldHands as number) : (creature.equippedShield ? 1 : 0);
    return safeWeaponHands + safeShieldHands;
  };

  const hasFreeHand = (creature: any): boolean => getHandsUsed(creature) < 2;

  const requirement = (id: string, label: string, check: ActionRequirementCheck): ActionRequirement => ({
    id,
    label,
    check
  });

  const reqShield = requirement('shield', 'Shield equipped', (creature) => ({ ok: !!creature?.equippedShield }));
  const reqShieldRaised = requirement('shield-raised', 'Shield raised', (creature) => ({ ok: !!creature?.shieldRaised }));
  const reqShieldNotRaised = requirement('shield-not-raised', 'Shield not raised', (creature) => ({ ok: !creature?.shieldRaised }));
  const reqFreeHand = requirement('free-hand', 'Free hand', (creature) => ({ ok: hasFreeHand(creature) }));
  const reqGrappleTraitOrFreeHand = requirement('grapple-or-free-hand', 'Free hand or Grapple weapon', (creature) => {
    if (hasFreeHand(creature)) {
      return { ok: true };
    }
    const traitCheck = hasWeaponTrait(creature, 'grapple');
    if (traitCheck.unknown) {
      return { ok: true, unknown: true };
    }
    return { ok: traitCheck.ok };
  });
  const reqTripTraitOrFreeHand = requirement('trip-or-free-hand', 'Free hand or Trip weapon', (creature) => {
    if (hasFreeHand(creature)) {
      return { ok: true };
    }
    const traitCheck = hasWeaponTrait(creature, 'trip');
    if (traitCheck.unknown) {
      return { ok: true, unknown: true };
    }
    return { ok: traitCheck.ok };
  });
  const reqDisarmTraitOrFreeHand = requirement('disarm-or-free-hand', 'Free hand or Disarm weapon', (creature) => {
    if (hasFreeHand(creature)) {
      return { ok: true };
    }
    const traitCheck = hasWeaponTrait(creature, 'disarm');
    if (traitCheck.unknown) {
      return { ok: true, unknown: true };
    }
    return { ok: traitCheck.ok };
  });
  const reqShoveTraitOrFreeHand = requirement('shove-or-free-hand', 'Free hand or Shove weapon', (creature) => {
    if (hasFreeHand(creature)) {
      return { ok: true };
    }
    const traitCheck = hasWeaponTrait(creature, 'shove');
    if (traitCheck.unknown) {
      return { ok: true, unknown: true };
    }
    return { ok: traitCheck.ok };
  });

  const READY_ACTION_OPTIONS = [
    { id: 'strike', label: 'Strike' },
    { id: 'raise-shield', label: 'Raise Shield' },
    { id: 'shield-block', label: 'Shield Block' },
    { id: 'hide', label: 'Hide' },
    { id: 'seek', label: 'Seek' },
  ];
  const reqProne = requirement('prone', 'Must be prone', (creature) => ({
    ok: creature?.conditions?.some((c: Creature) => c.name === 'prone') || false
  }));
  const reqNotActed = requirement('not-acted', 'Must not have acted yet', (creature) => ({
    ok: actionPoints >= 3 && (creature?.attacksMadeThisTurn ?? 0) === 0
  }));
  const reqFlourish = requirement('flourish', 'Only one Flourish per turn', (creature) => ({
    ok: !creature?.flourishUsedThisTurn
  }));
  const reqHasStowedWeapons = requirement('has-stowed', 'Has stowed weapons', (creature) => ({
    ok: (creature?.weaponInventory ?? []).some((s: any) => s.state === 'stowed')
  }));
  const reqHasHeldWeapons = requirement('has-held', 'Has held weapons', (creature) => ({
    ok: (creature?.weaponInventory ?? []).some((s: any) => s.state === 'held' && !s.weapon?.isNatural)
  }));

  const actions: ActionDefinition[] = [
    {
      id: 'strike',
      name: 'Strike',
      cost: 1,
      description: 'Make a melee or ranged attack',
      icon: '⚔️',
      requiresTarget: true,
      range: 1,
      category: 'combat',
      usesD20: true
    },
    {
      id: 'stride',
      name: 'Stride',
      cost: 1,
      description: 'Move up to your Speed',
      icon: '👣',
      requiresTarget: true,
      range: 0, // Set dynamically based on creature speed in CombatInterface
      category: 'combat',
      movementType: 'walk' as const
    },
    {
      id: 'step',
      name: 'Step',
      cost: 1,
      description: 'Step 5 feet without triggering reactions',
      icon: '🦶',
      requiresTarget: true,
      range: 1,
      category: 'combat',
      movementType: 'walk' as const
    },
    {
      id: 'stand',
      name: 'Stand',
      cost: 1,
      description: 'Stand up from prone',
      icon: '🧍',
      requiresTarget: false,
      category: 'combat',
      requirements: [reqProne]
    },
    {
      id: 'raise-shield',
      name: 'Raise Shield',
      cost: 1,
      description: 'Gain shield AC bonus and use shield Hardness',
      icon: '🛡️',
      requiresTarget: false,
      category: 'combat',
      requirements: [reqShield, reqShieldNotRaised]
    },
    {
      id: 'lower-shield',
      name: 'Lower Shield',
      cost: 0,
      description: 'Lower your raised shield (free action)',
      icon: '⬇️',
      requiresTarget: false,
      category: 'combat',
      requirements: [reqShield, reqShieldRaised]
    },
    {
      id: 'take-cover',
      name: 'Take Cover',
      cost: 1,
      description: 'Gain +2 AC with cover; requires cover',
      icon: '🪵',
      requiresTarget: false,
      category: 'combat'
    },
    {
      id: 'aid',
      name: 'Aid',
      cost: 1,
      description: 'Prepare to help an ally on their next action',
      icon: '🤝',
      requiresTarget: true,
      category: 'combat'
    },
    {
      id: 'recall-knowledge',
      name: 'Recall Knowledge',
      cost: 1,
      description: 'Attempt to remember helpful information',
      icon: '🧠',
      requiresTarget: false,
      category: 'combat'
    },
    {
      id: 'demoralize',
      name: 'Demoralize',
      cost: 1,
      description: 'Intimidate a foe to inflict frightened',
      icon: '😈',
      requiresTarget: true,
      category: 'combat',
      usesD20: true
    },
    {
      id: 'feint',
      name: 'Feint',
      cost: 1,
      description: 'Deceive a foe to make them off-guard',
      icon: '🎭',
      requiresTarget: true,
      category: 'combat',
      usesD20: true
    },
    {
      id: 'grapple',
      name: 'Grapple',
      cost: 1,
      description: 'Grab a target with Athletics',
      icon: '🪢',
      requiresTarget: true,
      category: 'combat',
      usesD20: true,
      requirements: [reqGrappleTraitOrFreeHand]
    },
    {
      id: 'trip',
      name: 'Trip',
      cost: 1,
      description: 'Knock a target prone',
      icon: '🧗',
      requiresTarget: true,
      category: 'combat',
      usesD20: true,
      requirements: [reqTripTraitOrFreeHand]
    },
    {
      id: 'shove',
      name: 'Shove',
      cost: 1,
      description: 'Push a target back',
      icon: '💥',
      requiresTarget: true,
      category: 'combat',
      usesD20: true,
      requirements: [reqShoveTraitOrFreeHand]
    },
    {
      id: 'disarm',
      name: 'Disarm',
      cost: 1,
      description: 'Attempt to disarm a target',
      icon: '🗡️',
      requiresTarget: true,
      category: 'combat',
      usesD20: true,
      requirements: [reqDisarmTraitOrFreeHand]
    },
    {
      id: 'battle-medicine',
      name: 'Battle Medicine',
      cost: 1,
      description: 'Heal an ally with Medicine (once per day per creature)',
      icon: '🩹',
      requiresTarget: true,
      category: 'combat',
      usesD20: true
    },
    {
      id: 'tumble-through',
      name: 'Tumble Through',
      cost: 1,
      description: 'Move through an enemy\'s space with Acrobatics',
      icon: '🤸',
      requiresTarget: true,
      category: 'combat',
      usesD20: true
    },
    {
      id: 'escape',
      name: 'Escape',
      cost: 1,
      description: 'Break free from grabbed/restrained using Athletics or Acrobatics',
      icon: '🦶',
      requiresTarget: false,
      category: 'combat',
      usesD20: true
    },
    {
      id: 'hide',
      name: 'Hide',
      cost: 1,
      description: 'Become hidden with Stealth (requires cover or concealment)',
      icon: '🫥',
      requiresTarget: false,
      category: 'combat',
      usesD20: true
    },
    {
      id: 'sneak',
      name: 'Sneak',
      cost: 1,
      description: 'Move while hidden with Stealth',
      icon: '🥷',
      requiresTarget: false,
      category: 'combat',
      usesD20: true
    },
    {
      id: 'recall-knowledge',
      name: 'Recall Knowledge',
      cost: 1,
      description: 'Identify creature weakness or abilities (once per creature)',
      icon: '📖',
      requiresTarget: true,
      category: 'combat',
      usesD20: true
    },
    {
      id: 'seek',
      name: 'Seek',
      cost: 1,
      description: 'Search for hidden creatures with Perception',
      icon: '🔍',
      requiresTarget: false,
      category: 'combat',
      usesD20: true
    },
    {
      id: 'crawl',
      name: 'Crawl',
      cost: 1,
      description: 'Move 5ft while prone (does not trigger reactions)',
      icon: '🦞',
      requiresTarget: true,
      category: 'combat',
      movementType: 'walk' as const,
      range: 1
    },
    {
      id: 'aid',
      name: 'Aid',
      cost: 0,
      description: 'Grant +1 bonus to ally\'s action (prepare as reaction)',
      icon: '🤝',
      requiresTarget: true,
      category: 'combat',
      usesD20: true
    },
    {
      id: 'ready',
      name: 'Ready',
      cost: 2,
      description: 'Prepare a reaction to a trigger',
      icon: '⏳',
      requiresTarget: false,
      category: 'combat',
      readyActionId: 'strike'
    },
    {
      id: 'delay',
      name: 'Delay',
      cost: 0,
      description: 'Wait and take your turn later in the round',
      icon: '⏸️',
      requiresTarget: false,
      category: 'combat'
    },
    {
      id: 'pick-up-weapon',
      name: 'Pick Up Weapon',
      cost: 1,
      description: 'Pick up a dropped weapon',
      icon: '📦',
      requiresTarget: true,
      category: 'combat'
    },
    {
      id: 'interact',
      name: 'Interact',
      cost: 1,
      description: 'Manipulate an object or environment',
      icon: '👐',
      requiresTarget: false,
      category: 'combat'
    },
    {
      id: 'use-item',
      name: 'Use Item',
      cost: 1,
      description: 'Activate a consumable item (potion, elixir, scroll)',
      icon: '💊',
      requiresTarget: false,
      category: 'combat',
      usesD20: false
    },
    {
      id: 'escape',
      name: 'Escape',
      cost: 1,
      description: 'Escape from being grabbed or restrained',
      icon: '🏃',
      requiresTarget: false,
      category: 'combat'
    },
    {
      id: 'seek',
      name: 'Seek',
      cost: 1,
      description: 'Search for hidden creatures or objects',
      icon: '🔍',
      requiresTarget: false,
      category: 'combat'
    },
    {
      id: 'hide',
      name: 'Hide',
      cost: 1,
      description: 'Hide from enemies',
      icon: '🫥',
      requiresTarget: false,
      category: 'combat'
    },
    {
      id: 'sneak',
      name: 'Sneak',
      cost: 1,
      description: 'Move stealthily while hidden',
      icon: '🕵️',
      requiresTarget: true,
      range: 6.5,
      category: 'combat'
    },
    {
      id: 'avoid-notice',
      name: 'Avoid Notice',
      cost: 1,
      description: 'Move stealthily while exploring',
      icon: '🌫️',
      requiresTarget: false,
      category: 'explore'
    },
    {
      id: 'detect-magic',
      name: 'Detect Magic',
      cost: 1,
      description: 'Sense magical auras',
      icon: '✨',
      requiresTarget: false,
      category: 'explore'
    },
    {
      id: 'follow-the-expert',
      name: 'Follow the Expert',
      cost: 1,
      description: 'Follow an ally to gain their expertise',
      icon: '🧭',
      requiresTarget: true,
      category: 'explore'
    },
    {
      id: 'investigate',
      name: 'Investigate',
      cost: 1,
      description: 'Search for clues while exploring',
      icon: '📝',
      requiresTarget: false,
      category: 'explore'
    },
    {
      id: 'scout',
      name: 'Scout',
      cost: 1,
      description: 'Look for danger and grant initiative bonus',
      icon: '👀',
      requiresTarget: false,
      category: 'explore'
    },
    {
      id: 'search',
      name: 'Search',
      cost: 1,
      description: 'Search an area for hidden things',
      icon: '🗝️',
      requiresTarget: false,
      category: 'explore'
    },
    {
      id: 'track',
      name: 'Track',
      cost: 1,
      description: 'Follow tracks',
      icon: '👣',
      requiresTarget: false,
      category: 'explore'
    },
    {
      id: 'earn-income',
      name: 'Earn Income',
      cost: 1,
      description: 'Make a living using a skill',
      icon: '💰',
      requiresTarget: false,
      category: 'downtime'
    },
    {
      id: 'craft',
      name: 'Craft',
      cost: 1,
      description: 'Craft an item during downtime',
      icon: '🛠️',
      requiresTarget: false,
      category: 'downtime'
    },
    {
      id: 'treat-wounds',
      name: 'Treat Wounds',
      cost: 1,
      description: 'Heal a creature with Medicine',
      icon: '🩹',
      requiresTarget: true,
      category: 'downtime'
    },
    {
      id: 'retrain',
      name: 'Retrain',
      cost: 1,
      description: 'Replace a feat, skill, or ability',
      icon: '🔄',
      requiresTarget: false,
      category: 'downtime'
    },
    {
      id: 'subsist',
      name: 'Subsist',
      cost: 1,
      description: 'Hunt or forage for food',
      icon: '🍞',
      requiresTarget: false,
      category: 'downtime'
    },
    {
      id: 'long-term-rest',
      name: 'Long-Term Rest',
      cost: 1,
      description: 'Recover over a full day of rest',
      icon: '🛌',
      requiresTarget: false,
      category: 'downtime'
    }
  ];

  // Build spell list from creature's repertoire
  // Handle spells as either array or space-separated string
  let creatureSpellIds: string[] = [];
  if (Array.isArray(currentCreature.spells)) {
    creatureSpellIds = currentCreature.spells;
  } else if (typeof currentCreature.spells === 'string' && currentCreature.spells) {
    creatureSpellIds = (currentCreature.spells as unknown as string).split(' ').filter((s: string) => s.length > 0);
  }

  // Also pull spells from the modern spellcasters[] system (if creature.spells is empty)
  if (creatureSpellIds.length === 0 && Array.isArray(currentCreature.spellcasters)) {
    const spellcasterIds = new Set<string>();
    for (const tradition of currentCreature.spellcasters) {
      if (Array.isArray(tradition.spells)) {
        for (const castable of tradition.spells) {
          const id = resolveSpellId(castable.name);
          spellcasterIds.add(id);
        }
      }
    }
    creatureSpellIds = Array.from(spellcasterIds);
  }

  // Also include focus spells (psi cantrips, conflux spells, etc.)
  if (Array.isArray(currentCreature.focusSpells)) {
    const existingIds = new Set(creatureSpellIds);
    for (const fs of currentCreature.focusSpells) {
      const id = resolveSpellId(fs.name);
      if (!existingIds.has(id)) {
        creatureSpellIds.push(id);
        existingIds.add(id);
      }
    }
  }
  
  const spells = creatureSpellIds
    .map((spellId: string): ActionDefinition | null => {
      const spell = getSpell(spellId);
      if (!spell) return null;

      // ── Warp Step: movement spell ──────────────────────────
      // PF2e: +5ft status bonus to Speed (or +10ft with Unbound Step),
      // then Stride twice. Implemented as a single movement action
      // with range = 2 × boosted speed.
      if (spell.id === 'warp-step') {
        const creatureSpeed = currentCreature?.speed ?? 25;
        const hasUnboundStep = (currentCreature?.specials ?? []).some(
          (s: string) => typeof s === 'string' && s.toLowerCase().includes('unbound step')
        );
        const speedBonusFeet = hasUnboundStep ? 10 : 5;
        const boostedSpeedFeet = creatureSpeed + speedBonusFeet;
        const totalRangeSquares = (boostedSpeedFeet * 2) / 5; // 2 Strides at boosted speed
        return {
          id: spell.id,
          name: spell.name,
          cost: spell.cost,
          description: `+${speedBonusFeet}ft Speed${hasUnboundStep ? ' (Unbound Step)' : ''}, Stride twice (${boostedSpeedFeet * 2}ft)`,
          icon: spell.icon || '✨',
          requiresTarget: true,
          range: totalRangeSquares,
          movementType: 'walk' as const,
          category: 'combat',
          tags: ['Spell']
        };
      }

      // Self-targeting spells (range 0, single target) don't require a target selection
      // e.g., Shield, True Strike — they just apply to the caster
      const isSelfTarget = spell.targetType === 'single' && spell.range === 0;
      const requiresTarget = spell.targetType === 'single' && !isSelfTarget;
      return {
        id: spell.id,
        name: spell.name,
        cost: spell.cost,
        description: spell.description,
        icon: spell.icon || '✨',
        requiresTarget,
        range: spell.range,
        aoe: spell.targetType === 'aoe',
        aoeRadius: spell.aoeRadius,
        category: 'combat',
        tags: ['Spell']
      };
    })
    .filter((s): s is ActionDefinition => s !== null);

  const hasFeat = (needle: string): boolean => {
    const featList = currentCreature?.feats ?? [];
    return featList.some((feat: any) =>
      typeof feat?.name === 'string' && feat.name.toLowerCase().includes(needle.toLowerCase())
    );
  };

  const className = (currentCreature?.characterClass ?? '').toLowerCase();
  const uniqueActions: ActionDefinition[] = [];

  if (className.includes('magus') || hasFeat('spellstrike')) {
    uniqueActions.push({
      id: 'spellstrike',
      name: 'Spellstrike',
      cost: 2,
      description: 'Deliver a spell through a weapon Strike',
      icon: '✨⚔️',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'recharge-spellstrike',
      name: 'Recharge Spellstrike',
      cost: 1,
      description: 'Recharge your Spellstrike after using it',
      icon: '🔄✨',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'arcane-cascade',
      name: 'Arcane Cascade',
      cost: 1,
      description: 'Enter stance to empower melee Strikes',
      icon: '🌀',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  if (className.includes('thaumaturge') || hasFeat('exploit vulnerability')) {
    uniqueActions.push({
      id: 'exploit-vulnerability',
      name: 'Exploit Vulnerability',
      cost: 1,
      description: 'Identify and exploit a foe’s weakness',
      icon: '🧿',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
  }

  if (className.includes('barbarian') || hasFeat('rage')) {
    uniqueActions.push({
      id: 'rage',
      name: 'Rage',
      cost: 1,
      description: 'Enter a rage for extra damage (+2 melee damage, -1 AC)',
      icon: '🔥',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'end-rage',
      name: 'End Rage',
      cost: 0,
      description: 'End your rage (fatigued for 1 round)',
      icon: '💨',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  if (className.includes('monk') || hasFeat('flurry of blows')) {
    uniqueActions.push({
      id: 'flurry-of-blows',
      name: 'Flurry of Blows',
      cost: 1,
      description: 'Make two unarmed Strikes for one action',
      icon: '🥋',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
  }

  if (className.includes('monk') && hasFeat('stunning fist')) {
    uniqueActions.push({
      id: 'stunning-fist',
      name: 'Stunning Fist',
      cost: 0,
      description: 'Free action: if your Flurry of Blows critically hit, target must Fort save or be stunned',
      icon: '💫',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
  }

  if (className.includes('ranger') || hasFeat('hunt prey')) {
    uniqueActions.push({
      id: 'hunt-prey',
      name: 'Hunt Prey',
      cost: 1,
      description: 'Designate a target as your prey for hunter\'s edge bonuses',
      icon: '🎯',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
  }

  if (className.includes('champion')) {
    uniqueActions.push({
      id: 'champion-reaction',
      name: 'Champion\'s Reaction',
      cost: 0,
      description: 'Reaction: Retributive Strike (Paladin), Liberating Step (Liberator), or Glimpse of Redemption (Redeemer)',
      icon: '🛡️⚡',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'lay-on-hands',
      name: 'Lay on Hands',
      cost: 1,
      description: 'Focus spell: heal an ally or deal vitality damage to undead',
      icon: '✋✨',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
  }

  if (className.includes('psychic') || hasFeat('unleash psyche')) {
    uniqueActions.push({
      id: 'unleash-psyche',
      name: 'Unleash Psyche',
      cost: 2,
      description: 'Unleash your full psychic potential (+2 spell damage, lasts 2 rounds, then stupefied 1)',
      icon: '🧠💥',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  if (className.includes('kineticist')) {
    uniqueActions.push({
      id: 'channel-elements',
      name: 'Channel Elements',
      cost: 1,
      description: 'Activate your kinetic aura (10-ft emanation). Can include a 1-action Elemental Blast or stance impulse.',
      icon: '🌀🔥',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'elemental-blast',
      name: 'Elemental Blast',
      cost: 1,
      description: '1-action: Make an impulse attack with your kinetic element',
      icon: '🔥💨',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'elemental-blast-2',
      name: 'Elemental Blast (2-action)',
      cost: 2,
      description: '2-action: Make an impulse attack with CON added to damage',
      icon: '🔥🔥',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'dismiss-aura',
      name: 'Dismiss Aura',
      cost: 0,
      description: 'Dismiss your kinetic aura (free action)',
      icon: '❌🌀',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  // ── Druid Class Actions ──
  if (className.includes('druid')) {
    uniqueActions.push({
      id: 'wild-shape',
      name: 'Wild Shape',
      cost: 2,
      description: 'Transform into a battle form (polymorph). Your stats are replaced by the battle form\'s stats for 10 rounds.',
      icon: '🐻🌿',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'revert-form',
      name: 'Revert Form',
      cost: 1,
      description: 'End your wild shape early and return to your normal form.',
      icon: '🧑🌿',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  // ── Bard Class Actions ──
  if (className.includes('bard')) {
    uniqueActions.push({
      id: 'courageous-anthem',
      name: 'Courageous Anthem',
      cost: 1,
      description: 'Composition cantrip: Allies within 60 feet gain a +1 status bonus to attack rolls, damage rolls, and saves against fear until the start of your next turn.',
      icon: '🎵⚔️',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'end-courageous-anthem',
      name: 'End Anthem',
      cost: 0,
      description: 'End your active Courageous Anthem composition (free action).',
      icon: '🔇🎵',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'counter-performance',
      name: 'Counter Performance',
      cost: 0,
      description: 'Reaction (1 FP): An ally within 60 feet can use your Performance check in place of their saving throw against an auditory or visual effect.',
      icon: '🎵🛡️',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  if (className.includes('investigator') || hasFeat('devise a stratagem')) {
    uniqueActions.push({
      id: 'devise-a-stratagem',
      name: 'Devise a Stratagem',
      cost: 1,
      description: 'Roll a d20 to use in place of your attack roll for a Strike against this foe this turn',
      icon: '🧮',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
  }

  // ── Guardian Class Actions ──
  if (className.includes('guardian')) {
    uniqueActions.push({
      id: 'taunt',
      name: 'Taunt',
      cost: 1,
      description: 'Force an enemy to focus on you. They take penalties for attacking others.',
      icon: '🛡️📢',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'intercept-strike',
      name: 'Intercept Strike',
      cost: 0,
      description: 'Reaction: Redirect attack targeting adjacent ally to yourself.',
      icon: '🛡️⚡',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
  }

  // ── Swashbuckler Class Actions ──
  if (className.includes('swashbuckler')) {
    uniqueActions.push({
      id: 'gain-panache',
      name: 'Gain Panache',
      cost: 0,
      description: 'Gain Panache via style-specific action (+5 Speed, enables Finishers).',
      icon: '⚔️✨',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'finisher',
      name: 'Confident Finisher',
      cost: 1,
      description: 'Strike consuming Panache for double Precise Strike damage.',
      icon: '⚔️🎯',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
  }

  // ── Commander Class Actions ──
  if (className.includes('commander')) {
    uniqueActions.push({
      id: 'commanders-order',
      name: "Commander's Order",
      cost: 1,
      description: 'Issue an order to an ally, granting them a reaction to Strike or Step.',
      icon: '📢⚔️',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
  }

  // ── Gunslinger Class Actions ──
  if (className.includes('gunslinger')) {
    uniqueActions.push({
      id: 'slingers-reload',
      name: "Slinger's Reload",
      cost: 1,
      description: 'Reload your firearm/crossbow with a Way-specific bonus action.',
      icon: '🔫🔄',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  // ── Inventor Class Actions ──
  if (className.includes('inventor')) {
    uniqueActions.push({
      id: 'overdrive',
      name: 'Overdrive',
      cost: 1,
      description: 'Crafting check to boost your innovation, adding extra damage to Strikes.',
      icon: '⚙️🔥',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'explode',
      name: 'Explode',
      cost: 2,
      description: 'Unstable: Your innovation explodes dealing fire damage in a 20-foot emanation.',
      icon: '💥⚙️',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  // ── Oracle Class Actions ──
  if (className.includes('oracle')) {
    uniqueActions.push({
      id: 'revelation-spell',
      name: 'Revelation Spell',
      cost: 1,
      description: 'Cast a revelation spell (1 Focus Point). Advances your Oracular Curse.',
      icon: '✨🔮',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  // ── Alchemist Class Actions ──
  if (className.includes('alchemist')) {
    uniqueActions.push({
      id: 'quick-alchemy',
      name: 'Quick Alchemy',
      cost: 1,
      description: 'Spend 1 infused reagent to create an alchemical item on the fly.',
      icon: '⚗️⚡',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  // ── Exemplar Class Actions ──
  if (className.includes('exemplar')) {
    uniqueActions.push({
      id: 'shift-immanence',
      name: 'Shift Immanence',
      cost: 0,
      description: 'Free action: Move your immanence to a different ikon.',
      icon: '✦🔄',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'spark-transcendence',
      name: 'Spark Transcendence',
      cost: 0,
      description: 'Free action: Activate your current ikon\'s powerful transcendence effect.',
      icon: '🌟✦',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  // ── Summoner Class Actions ──
  if (className.includes('summoner')) {
    uniqueActions.push({
      id: 'manifest-eidolon',
      name: 'Manifest Eidolon',
      cost: 3,
      description: 'Summon your Eidolon to an adjacent space (3 actions).',
      icon: '✨🤝',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
    uniqueActions.push({
      id: 'act-together',
      name: 'Act Together',
      cost: 0,
      description: 'You and your Eidolon act in concert — one takes 1 action, the other takes 1-2.',
      icon: '🤝⚔️',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  // ── Rogue Class Actions & Feats ──
  if (className.includes('rogue') || hasFeat('quick draw')) {
    uniqueActions.push({
      id: 'quick-draw',
      name: 'Quick Draw',
      cost: 1,
      description: 'Draw a weapon and Strike in one motion',
      icon: '⚡⚔️',
      requiresTarget: true,
      category: 'combat',
      unique: true,
      usesD20: true
    });
  }

  if (hasFeat('skirmish strike')) {
    uniqueActions.push({
      id: 'skirmish-strike',
      name: 'Skirmish Strike',
      cost: 1,
      description: 'Step and Strike, or Strike and Step',
      icon: '🏃⚔️',
      requiresTarget: true,
      category: 'combat',
      unique: true,
      usesD20: true
    });
  }

  if (hasFeat('battle assessment')) {
    uniqueActions.push({
      id: 'battle-assessment',
      name: 'Battle Assessment',
      cost: 1,
      description: 'Use Perception to learn about a foe',
      icon: '🔍',
      requiresTarget: true,
      category: 'combat',
      unique: true,
      usesD20: true
    });
  }

  if (hasFeat('poison weapon')) {
    uniqueActions.push({
      id: 'poison-weapon',
      name: 'Poison Weapon',
      cost: 1,
      description: 'Apply poison to your weapon',
      icon: '☠️',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  if (hasFeat('running reload')) {
    uniqueActions.push({
      id: 'running-reload',
      name: 'Running Reload',
      cost: 1,
      description: 'Stride/Step/Sneak and reload',
      icon: '🏃🔫',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  if (hasFeat('twist the knife')) {
    uniqueActions.push({
      id: 'twist-the-knife',
      name: 'Twist the Knife',
      cost: 1,
      description: 'Add persistent bleed equal to sneak attack dice after hitting',
      icon: '🗡️🩸',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  if (hasFeat('vicious debilitation')) {
    uniqueActions.push({
      id: 'vicious-debilitation',
      name: 'Vicious Debilitation',
      cost: 0,
      description: 'Apply two debilitations instead of one',
      icon: '💀',
      requiresTarget: false,
      category: 'combat',
      unique: true
    });
  }

  // Check for special abilities from bestiary/specials array
  const hasSpecial = (needle: string): boolean => {
    const specials = currentCreature?.specials ?? [];
    return specials.some((special: string) =>
      special.toLowerCase().includes(needle.toLowerCase())
    );
  };

  const hasViciousSwing = hasFeat('vicious swing')
    || hasSpecial('vicious swing');

  if (hasViciousSwing) {
    uniqueActions.push({
      id: 'vicious-swing',
      name: 'Vicious Swing',
      cost: 2,
      description: 'Make a melee Strike and add one extra damage die',
      icon: '🩸',
      requiresTarget: true,
      category: 'combat',
      unique: true,
      tags: ['Flourish'],
      requirements: [reqFlourish],
      usesD20: true
    });
  }

  // ── Fighter Feats (Strike-based, already implemented in backend) ──
  if (hasFeat('sudden charge')) {
    uniqueActions.push({
      id: 'sudden-charge', name: 'Sudden Charge', cost: 2,
      description: 'Stride twice, then make a melee Strike',
      icon: '🏃⚔️', requiresTarget: true, category: 'combat', unique: true,
      tags: ['Flourish', 'Open'], requirements: [reqFlourish], usesD20: true
    });
  }
  if (hasFeat('double slice')) {
    uniqueActions.push({
      id: 'double-slice', name: 'Double Slice', cost: 2,
      description: 'Make two Strikes, both at your current MAP',
      icon: '⚔️⚔️', requiresTarget: true, category: 'combat', unique: true,
      tags: ['Flourish'], requirements: [reqFlourish], usesD20: true
    });
  }
  if (hasFeat('exacting strike')) {
    uniqueActions.push({
      id: 'exacting-strike', name: 'Exacting Strike', cost: 1,
      description: 'Strike; a miss doesn\'t count for MAP',
      icon: '🎯', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('snagging strike')) {
    uniqueActions.push({
      id: 'snagging-strike', name: 'Snagging Strike', cost: 1,
      description: 'Strike; hit makes target off-guard until your next turn',
      icon: '🪝', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('intimidating strike')) {
    uniqueActions.push({
      id: 'intimidating-strike', name: 'Intimidating Strike', cost: 2,
      description: 'Strike; hit makes target frightened 1 (crit = frightened 2)',
      icon: '😤⚔️', requiresTarget: true, category: 'combat', unique: true,
      tags: ['Emotion', 'Mental'], usesD20: true
    });
  }
  if (hasFeat('brutish shove')) {
    uniqueActions.push({
      id: 'brutish-shove', name: 'Brutish Shove', cost: 1,
      description: 'Strike; hit pushes target 5ft and makes them off-guard',
      icon: '💪', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('knockdown')) {
    uniqueActions.push({
      id: 'knockdown', name: 'Knockdown', cost: 2,
      description: 'Strike, then Trip target on a hit',
      icon: '🦵', requiresTarget: true, category: 'combat', unique: true,
      tags: ['Flourish'], requirements: [reqFlourish], usesD20: true
    });
  }
  if (hasFeat('dueling parry')) {
    uniqueActions.push({
      id: 'dueling-parry', name: 'Dueling Parry', cost: 1,
      description: '+2 circumstance bonus to AC (one-handed melee, free hand)',
      icon: '🤺', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('lunge')) {
    uniqueActions.push({
      id: 'lunge', name: 'Lunge', cost: 1,
      description: 'Strike with +5 feet reach',
      icon: '🗡️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('twin parry')) {
    uniqueActions.push({
      id: 'twin-parry', name: 'Twin Parry', cost: 1,
      description: '+1 AC (or +2 with two melee weapons)',
      icon: '⚔️🛡️', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('shatter defenses')) {
    uniqueActions.push({
      id: 'shatter-defenses', name: 'Shatter Defenses', cost: 1,
      description: 'Strike a frightened foe; hit makes them off-guard',
      icon: '💥', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('combat assessment')) {
    uniqueActions.push({
      id: 'combat-assessment', name: 'Combat Assessment', cost: 1,
      description: 'Strike + learn target weakness/resistance on hit',
      icon: '🔍⚔️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('assisting shot')) {
    uniqueActions.push({
      id: 'assisting-shot', name: 'Assisting Shot', cost: 1,
      description: 'Ranged Strike; hit gives ally +1 vs target',
      icon: '🏹🤝', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('sleek reposition')) {
    uniqueActions.push({
      id: 'sleek-reposition', name: 'Sleek Reposition', cost: 1,
      description: 'Strike; hit moves target 5ft within your reach',
      icon: '🔄⚔️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('dual-handed assault') || hasFeat('dual handed assault')) {
    uniqueActions.push({
      id: 'dual-handed-assault', name: 'Dual-Handed Assault', cost: 1,
      description: 'Two-hand your weapon for an extra damage die',
      icon: '🗡️💪', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('quick reversal')) {
    uniqueActions.push({
      id: 'quick-reversal', name: 'Quick Reversal', cost: 1,
      description: 'Strike a creature flanking you (Press)',
      icon: '🔁⚔️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('double shot')) {
    uniqueActions.push({
      id: 'double-shot', name: 'Double Shot', cost: 2,
      description: 'Two ranged Strikes at different targets, same MAP',
      icon: '🏹🏹', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('dazing blow')) {
    uniqueActions.push({
      id: 'dazing-blow', name: 'Dazing Blow', cost: 1,
      description: 'Strike; hit forces Fort save or stunned 1',
      icon: '💫⚔️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('advantageous assault')) {
    uniqueActions.push({
      id: 'advantageous-assault', name: 'Advantageous Assault', cost: 1,
      description: 'Strike grabbed/prone target for extra damage',
      icon: '⚔️📌', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('incredible aim')) {
    uniqueActions.push({
      id: 'incredible-aim', name: 'Incredible Aim', cost: 2,
      description: 'Ranged Strike with +2 bonus, ignore concealment',
      icon: '🎯🏹', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('positioning assault')) {
    uniqueActions.push({
      id: 'positioning-assault', name: 'Positioning Assault', cost: 2,
      description: 'Strike; hit moves target 10ft within reach (Flourish)',
      icon: '📐⚔️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('certain strike')) {
    uniqueActions.push({
      id: 'certain-strike', name: 'Certain Strike', cost: 1,
      description: 'Strike (Press); miss still deals minimum damage',
      icon: '✅⚔️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('debilitating shot')) {
    uniqueActions.push({
      id: 'fighter-debilitating-shot', name: 'Debilitating Shot', cost: 2,
      description: 'Ranged Strike; hit slows target 1',
      icon: '🎯🦵', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('spring attack')) {
    uniqueActions.push({
      id: 'spring-attack', name: 'Spring Attack', cost: 1,
      description: 'Stride + Strike at any point during movement',
      icon: '🏃⚔️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('brutal finish')) {
    uniqueActions.push({
      id: 'brutal-finish', name: 'Brutal Finish', cost: 1,
      description: 'Strike + bonus dice equal to Strikes made this turn',
      icon: '💀⚔️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('point-blank stance') || hasFeat('point blank stance')) {
    uniqueActions.push({
      id: 'point-blank-stance', name: 'Point-Blank Stance', cost: 1,
      description: 'Stance: +2 damage to close-range ranged Strikes',
      icon: '🏹📍', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('overwhelming blow')) {
    uniqueActions.push({
      id: 'overwhelming-blow', name: 'Overwhelming Blow', cost: 3,
      description: 'Strike that deals maximum damage (Flourish)',
      icon: '⚔️💥', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('combat grab')) {
    uniqueActions.push({
      id: 'combat-grab', name: 'Combat Grab', cost: 1,
      description: 'Strike; hit = target grabbed (requires free hand)',
      icon: '✊⚔️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('swipe')) {
    uniqueActions.push({
      id: 'swipe', name: 'Swipe', cost: 2,
      description: 'Strike 2 adjacent enemies with one attack roll (Flourish)',
      icon: '⚔️↔️', requiresTarget: true, category: 'combat', unique: true,
      tags: ['Flourish'], requirements: [reqFlourish], usesD20: true
    });
  }
  if (hasFeat('whirlwind strike')) {
    uniqueActions.push({
      id: 'whirlwind-strike', name: 'Whirlwind Strike', cost: 3,
      description: 'Strike every enemy within reach (Flourish)',
      icon: '🌪️⚔️', requiresTarget: true, category: 'combat', unique: true,
      tags: ['Flourish'], requirements: [reqFlourish], usesD20: true
    });
  }
  if (hasFeat('blade brake')) {
    uniqueActions.push({
      id: 'blade-brake', name: 'Blade Brake', cost: 1,
      description: '+2 circumstance to Fort/Reflex DC vs Shove and Trip',
      icon: '🗡️🛑', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('rebounding toss')) {
    uniqueActions.push({
      id: 'rebounding-toss', name: 'Rebounding Toss', cost: 1,
      description: 'Thrown Strike; hit bounces to 2nd target within 10ft (Flourish)',
      icon: '🪃', requiresTarget: true, category: 'combat', unique: true,
      tags: ['Flourish'], requirements: [reqFlourish], usesD20: true
    });
  }
  if (hasFeat('barreling charge')) {
    uniqueActions.push({
      id: 'barreling-charge', name: 'Barreling Charge', cost: 2,
      description: 'Stride through enemies + Strike (Flourish)',
      icon: '🐂⚔️', requiresTarget: true, category: 'combat', unique: true,
      tags: ['Flourish'], requirements: [reqFlourish], usesD20: true
    });
  }
  if (hasFeat('parting shot')) {
    uniqueActions.push({
      id: 'parting-shot', name: 'Parting Shot', cost: 2,
      description: 'Step + ranged Strike',
      icon: '🏹👋', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('disarming stance')) {
    uniqueActions.push({
      id: 'disarming-stance', name: 'Disarming Stance', cost: 1,
      description: 'Stance: +1 to Disarm, can disarm 2 sizes larger',
      icon: '🤺🔓', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('revealing stab')) {
    uniqueActions.push({
      id: 'revealing-stab', name: 'Revealing Stab', cost: 2,
      description: 'Piercing Strike; hit reveals concealed/invisible target',
      icon: '🗡️👁️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('ricochet stance')) {
    uniqueActions.push({
      id: 'ricochet-stance', name: 'Ricochet Stance', cost: 1,
      description: 'Stance: thrown weapons return after Strike',
      icon: '🪃📍', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('triple shot')) {
    uniqueActions.push({
      id: 'triple-shot', name: 'Triple Shot', cost: 2,
      description: '3 ranged Strikes at -2, each counts as 1 for MAP (Flourish)',
      icon: '🏹🏹🏹', requiresTarget: true, category: 'combat', unique: true,
      tags: ['Flourish'], requirements: [reqFlourish], usesD20: true
    });
  }
  if (hasFeat('felling strike')) {
    uniqueActions.push({
      id: 'felling-strike', name: 'Felling Strike', cost: 2,
      description: 'Melee Strike; hit grounds a flying target',
      icon: '⚔️⬇️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('sudden leap')) {
    uniqueActions.push({
      id: 'sudden-leap', name: 'Sudden Leap', cost: 2,
      description: 'Leap + melee Strike at any point during jump',
      icon: '🦘⚔️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('disruptive stance')) {
    uniqueActions.push({
      id: 'disruptive-stance', name: 'Disruptive Stance', cost: 1,
      description: 'Stance: Reactive Strikes trigger on concentrate actions too',
      icon: '⚔️🚫', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('incredible ricochet')) {
    uniqueActions.push({
      id: 'incredible-ricochet', name: 'Incredible Ricochet', cost: 1,
      description: 'Thrown Strike; hit ricochets to additional targets (Press)',
      icon: '🪃💥', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('lunging stance')) {
    uniqueActions.push({
      id: 'lunging-stance', name: 'Lunging Stance', cost: 1,
      description: 'Stance: all melee Strikes gain +5ft reach',
      icon: '🗡️📏', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('determination')) {
    uniqueActions.push({
      id: 'determination', name: 'Determination', cost: 1,
      description: 'Counteract one condition or ongoing spell effect',
      icon: '💪🧠', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('guiding finish')) {
    uniqueActions.push({
      id: 'guiding-finish', name: 'Guiding Finish', cost: 1,
      description: 'Strike; hit lets you move target 10ft within reach',
      icon: '⚔️➡️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('stance savant')) {
    uniqueActions.push({
      id: 'stance-savant', name: 'Stance Savant', cost: 0,
      description: 'Enter a stance as a free action at start of turn',
      icon: '🧘⚡', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('multishot stance')) {
    uniqueActions.push({
      id: 'multishot-stance', name: 'Multishot Stance', cost: 1,
      description: 'Stance: Double Shot/Triple Shot cost 1 fewer action',
      icon: '🏹📍', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('impossible volley')) {
    uniqueActions.push({
      id: 'impossible-volley', name: 'Impossible Volley', cost: 3,
      description: 'Ranged Strike all enemies in 10ft burst (Flourish)',
      icon: '🏹🌧️', requiresTarget: true, category: 'combat', unique: true,
      tags: ['Flourish'], requirements: [reqFlourish], usesD20: true
    });
  }

  // ── Fighter Feats (Reactions, already implemented in backend) ──
  if (hasFeat('reactive shield')) {
    uniqueActions.push({
      id: 'reactive-shield', name: 'Reactive Shield', cost: 0,
      description: 'Reaction: Raise Shield when attacked',
      icon: '🛡️⚡', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('reflexive shield')) {
    uniqueActions.push({
      id: 'reflexive-shield', name: 'Reflexive Shield', cost: 0,
      description: 'Automatic Raise Shield at start of each turn',
      icon: '🛡️🔄', requiresTarget: false, category: 'combat', unique: true
    });
  }

  // ── Fighter Self-Buff Feats (already implemented in backend) ──
  if (hasFeat('fearless')) {
    uniqueActions.push({
      id: 'fearless', name: 'Fearless', cost: 1,
      description: 'Reduce frightened condition by 1',
      icon: '💪😤', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('iron will')) {
    uniqueActions.push({
      id: 'iron-will', name: 'Iron Will', cost: 0,
      description: 'Reaction: Reroll failed Will save',
      icon: '🧠', requiresTarget: false, category: 'combat', unique: true
    });
  }

  // ── Rogue Feats ──
  if (hasFeat('nimble dodge')) {
    uniqueActions.push({
      id: 'nimble-dodge', name: 'Nimble Dodge', cost: 0,
      description: 'Reaction: +2 AC vs triggering attack',
      icon: '🏃💨', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('quick draw')) {
    uniqueActions.push({
      id: 'quick-draw', name: 'Quick Draw', cost: 1,
      description: 'Draw a weapon and Strike in one action',
      icon: '⚡⚔️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('skirmish strike')) {
    uniqueActions.push({
      id: 'skirmish-strike', name: 'Skirmish Strike', cost: 1,
      description: 'Step then Strike, or Strike then Step',
      icon: '🏃⚔️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('twin feint')) {
    uniqueActions.push({
      id: 'twin-feint', name: 'Twin Feint', cost: 2,
      description: 'Two melee Strikes; second target is off-guard',
      icon: '🃏⚔️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat("you're next") || hasFeat('youre next')) {
    uniqueActions.push({
      id: 'youre-next', name: "You're Next", cost: 0,
      description: 'Reaction: Demoralize with +2 after downing a foe',
      icon: '👊😤', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('battle assessment')) {
    uniqueActions.push({
      id: 'battle-assessment', name: 'Battle Assessment', cost: 1,
      description: 'Perception check to learn foe strengths and weaknesses',
      icon: '🔍🎯', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('poison weapon')) {
    uniqueActions.push({
      id: 'poison-weapon', name: 'Poison Weapon', cost: 1,
      description: 'Apply poison to weapon; next hit applies poison damage',
      icon: '🧪🗡️', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('twist the knife')) {
    uniqueActions.push({
      id: 'twist-the-knife', name: 'Twist the Knife', cost: 1,
      description: 'After sneak attack, deal persistent bleed = sneak dice',
      icon: '🔪🩸', requiresTarget: true, category: 'combat', unique: true
    });
  }
  if (hasFeat('blur slam')) {
    uniqueActions.push({
      id: 'blur-slam', name: 'Blur Slam', cost: 2,
      description: 'Stride twice + melee Strike (Flourish)',
      icon: '💨👊', requiresTarget: true, category: 'combat', unique: true,
      tags: ['Flourish'], requirements: [reqFlourish], usesD20: true
    });
  }
  if (hasFeat('opportune backstab')) {
    uniqueActions.push({
      id: 'opportune-backstab', name: 'Opportune Backstab', cost: 0,
      description: 'Reaction: Strike when ally crits adjacent foe',
      icon: '🗡️🎯', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('defensive roll')) {
    uniqueActions.push({
      id: 'defensive-roll', name: 'Defensive Roll', cost: 0,
      description: 'Free: Halve physical damage from one attack',
      icon: '🛡️🏃', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('felling shot')) {
    uniqueActions.push({
      id: 'felling-shot', name: 'Felling Shot', cost: 2,
      description: 'Ranged Strike; hit grounds a flying target',
      icon: '🏹⬇️', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('spring from the shadows')) {
    uniqueActions.push({
      id: 'spring-from-the-shadows', name: 'Spring from the Shadows', cost: 1,
      description: 'Strike from hidden; foe is off-guard (Flourish)',
      icon: '🌑⚔️', requiresTarget: true, category: 'combat', unique: true,
      tags: ['Flourish'], requirements: [reqFlourish], usesD20: true
    });
  }
  if (hasFeat('instant opening')) {
    uniqueActions.push({
      id: 'instant-opening', name: 'Instant Opening', cost: 1,
      description: 'Target within 30ft is off-guard vs you until end of next turn',
      icon: '👁️🔓', requiresTarget: true, category: 'combat', unique: true
    });
  }
  if (hasFeat('perfect distraction')) {
    uniqueActions.push({
      id: 'perfect-distraction', name: 'Perfect Distraction', cost: 1,
      description: 'Become invisible and Create a Diversion',
      icon: '🎭👻', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('cognitive loophole')) {
    uniqueActions.push({
      id: 'cognitive-loophole', name: 'Cognitive Loophole', cost: 0,
      description: 'Reaction: Suppress a mental effect for 1 round',
      icon: '🧠🔓', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('clever gambit')) {
    uniqueActions.push({
      id: 'clever-gambit', name: 'Clever Gambit', cost: 0,
      description: 'Reaction: Ally adjacent to target makes a melee Strike (Mastermind)',
      icon: '🧠⚔️', requiresTarget: true, category: 'combat', unique: true
    });
  }
  if (hasFeat('reactive pursuit')) {
    uniqueActions.push({
      id: 'reactive-pursuit', name: 'Reactive Pursuit', cost: 0,
      description: 'Reaction: Stride to pursue enemy who moves away',
      icon: '🏃💨', requiresTarget: true, category: 'combat', unique: true
    });
  }
  if (hasFeat('sidestep')) {
    uniqueActions.push({
      id: 'sidestep', name: 'Sidestep', cost: 0,
      description: 'Reaction: Redirect missed melee attack to adjacent creature',
      icon: '🔄', requiresTarget: true, category: 'combat', unique: true
    });
  }
  if (hasFeat('leave an opening')) {
    uniqueActions.push({
      id: 'leave-an-opening', name: 'Leave an Opening', cost: 0,
      description: 'Reaction: Strike when target critically fails attack/skill',
      icon: '⚡🔓', requiresTarget: true, category: 'combat', unique: true
    });
  }
  if (hasFeat('reactive interference')) {
    uniqueActions.push({
      id: 'reactive-interference', name: 'Reactive Interference', cost: 0,
      description: 'Reaction: -2 to enemy reaction roll',
      icon: '🚫', requiresTarget: true, category: 'combat', unique: true
    });
  }
  if (hasFeat('fantastic leap')) {
    uniqueActions.push({
      id: 'fantastic-leap', name: 'Fantastic Leap', cost: 2,
      description: 'Leap up to full Speed in any direction',
      icon: '🦘', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('running reload')) {
    uniqueActions.push({
      id: 'running-reload', name: 'Running Reload', cost: 1,
      description: 'Stride/Step then reload weapon',
      icon: '🏃🔄', requiresTarget: false, category: 'combat', unique: true
    });
  }

  // ── Skill Feats ──
  if (hasFeat('bon mot')) {
    uniqueActions.push({
      id: 'bon-mot', name: 'Bon Mot', cost: 1,
      description: 'Diplomacy vs Will DC: target takes -2 to Perception and Will',
      icon: '🎭', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('dirty trick')) {
    uniqueActions.push({
      id: 'dirty-trick', name: 'Dirty Trick', cost: 1,
      description: 'Thievery vs Reflex DC: clumsy 1 or enfeebled 1',
      icon: '🤏', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }
  if (hasFeat('kip up')) {
    uniqueActions.push({
      id: 'kip-up', name: 'Kip Up', cost: 0,
      description: 'Stand from prone as a free action without triggering reactions',
      icon: '🤸', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('scare to death')) {
    uniqueActions.push({
      id: 'scare-to-death', name: 'Scare to Death', cost: 1,
      description: 'Intimidation vs Will DC: may kill on crit success',
      icon: '💀😱', requiresTarget: true, category: 'combat', unique: true, usesD20: true
    });
  }

  // ── Ancestry/Heritage Active Feats ──
  if (hasFeat('dragon breath')) {
    uniqueActions.push({
      id: 'dragon-breath', name: 'Dragon Breath', cost: 2,
      description: '15ft cone or 30ft line breath weapon',
      icon: '🐉🔥', requiresTarget: true, category: 'combat', unique: true,
      aoe: true, aoeRadius: 3, usesD20: true
    });
  }
  if (hasFeat('elemental assault')) {
    uniqueActions.push({
      id: 'elemental-assault', name: 'Elemental Assault', cost: 1,
      description: 'Strikes deal +1d6 elemental damage for 1 minute',
      icon: '🌊⚡', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('mirror dodge')) {
    uniqueActions.push({
      id: 'mirror-dodge', name: 'Mirror Dodge', cost: 0,
      description: 'Reaction: +2 circumstance AC vs one attack',
      icon: '🪞', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('hydraulic deflection')) {
    uniqueActions.push({
      id: 'hydraulic-deflection', name: 'Hydraulic Deflection', cost: 0,
      description: 'Reaction: resist physical damage = level for one attack',
      icon: '🌊🛡️', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('iron body')) {
    uniqueActions.push({
      id: 'iron-body', name: 'Iron Body', cost: 1,
      description: 'Resist all physical damage = level for 1 minute',
      icon: '🦾', requiresTarget: false, category: 'combat', unique: true
    });
  }
  if (hasFeat('heroic presence')) {
    uniqueActions.push({
      id: 'heroic-presence', name: 'Heroic Presence', cost: 1,
      description: 'All allies within 30ft gain temp HP = your level',
      icon: '👑✨', requiresTarget: false, category: 'combat', unique: true
    });
  }

  const allActions: ActionDefinition[] = [...actions, ...uniqueActions];
  const allSpells: ActionDefinition[] = spells;

  const handleActionSelect = (action: Action) => {
    // Check if creature has enough action points
    if (action.cost > actionPoints) {
      alert(`Not enough action points. Need ${action.cost}, have ${actionPoints}.`);
      return;
    }

    // Always show weapon picker when Strike-style actions are clicked
    const strikeActions = new Set([
      'strike', 'vicious-swing', 'sudden-charge', 'double-slice',
      'exacting-strike', 'snagging-strike', 'intimidating-strike',
      'brutish-shove', 'knockdown', 'lunge', 'shatter-defenses',
      'quick-draw', 'skirmish-strike',
      'combat-assessment', 'assisting-shot', 'sleek-reposition',
      'dual-handed-assault', 'quick-reversal', 'double-shot',
      'dazing-blow', 'advantageous-assault', 'incredible-aim',
      'positioning-assault', 'certain-strike', 'fighter-debilitating-shot',
      'spring-attack', 'brutal-finish', 'overwhelming-blow',
      'combat-grab', 'swipe', 'whirlwind-strike',
      'rebounding-toss', 'barreling-charge', 'parting-shot',
      'revealing-stab', 'triple-shot', 'felling-strike', 'sudden-leap',
      'incredible-ricochet', 'guiding-finish', 'impossible-volley',
      'blur-slam', 'opportune-backstab', 'felling-shot',
      'spring-from-the-shadows', 'youre-next',
      'leave-an-opening'
    ]);
    if (strikeActions.has(action.id)) {
      setWeaponPickerOpen(true);
      setActionMenuOpen(false);
      setSpellsMenuOpen(false);
      setSpecialMenuOpen(false);
      setWeaponManageOpen(false);
      // Store the action type so weapon picker knows which action to create
      (window as any).pendingStrikeAction = action.id;
      // Don't select the action yet - wait for weapon selection
      return;
    }

    if (action.id === 'pick-up-weapon') {
      // Just close menus and prepare to select a ground object
      // The actual selection happens when user clicks on the ground object
      setActionMenuOpen(false);
      setSpellsMenuOpen(false);
      setSpecialMenuOpen(false);
      setWeaponManageOpen(false);
      setWeaponPickerOpen(false);
      // Select the action so ground objects become clickable
      onSelectAction(action);
      return;
    }

    if (action.id === 'spellstrike') {
      // Open spell selector for Spellstrike
      setSpellstrikeModalOpen(true);
      setActionMenuOpen(false);
      setSpellsMenuOpen(false);
      setSpecialMenuOpen(false);
      setWeaponManageOpen(false);
      setWeaponPickerOpen(false);
      (window as any).pendingSpellstrikeSpellId = undefined;
      return;
    }

    setWeaponPickerOpen(false);
    setWeaponManageOpen(false);
    onSelectAction(action);
  };

  const handleWeaponSelect = (weaponId: string) => {
    // Check real inventory first, then fallback list
    const slot = weaponInventory.find((s: any) => s.weapon?.id === weaponId)
      ?? fallbackWeapons.find((s: any) => s.weapon?.id === weaponId);
    if (!slot) return;
    const weapon = slot.weapon;
    
    // Get the pending action type (strike or feat-based strike)
    const actionType = (window as any).pendingStrikeAction || 'strike';
    const pendingSpellstrikeSpellId = (window as any).pendingSpellstrikeSpellId as string | undefined;

    if (actionType === 'spellstrike' && !pendingSpellstrikeSpellId) {
      alert('Select a spell before choosing a weapon for Spellstrike.');
      return;
    }
    
    // Map action IDs to display names and costs
    const strikeActionInfo: Record<string, { name: string; cost: number; desc: string }> = {
      'strike': { name: 'Strike', cost: 1, desc: `Attack with ${weapon.display}` },
      'vicious-swing': { name: 'Vicious Swing', cost: 2, desc: `Vicious Swing with ${weapon.display}` },
      'sudden-charge': { name: 'Sudden Charge', cost: 2, desc: `Stride twice + Strike with ${weapon.display}` },
      'double-slice': { name: 'Double Slice', cost: 2, desc: `Two Strikes with ${weapon.display}` },
      'exacting-strike': { name: 'Exacting Strike', cost: 1, desc: `Strike with ${weapon.display} (miss doesn't count for MAP)` },
      'snagging-strike': { name: 'Snagging Strike', cost: 1, desc: `Strike with ${weapon.display} (hit = off-guard)` },
      'intimidating-strike': { name: 'Intimidating Strike', cost: 2, desc: `Strike with ${weapon.display} (hit = frightened)` },
      'brutish-shove': { name: 'Brutish Shove', cost: 1, desc: `Strike with ${weapon.display} (push + off-guard)` },
      'knockdown': { name: 'Knockdown', cost: 2, desc: `Strike + Trip with ${weapon.display}` },
      'lunge': { name: 'Lunge', cost: 1, desc: `Strike with ${weapon.display} (+5ft reach)` },
      'shatter-defenses': { name: 'Shatter Defenses', cost: 1, desc: `Strike frightened foe (off-guard on hit)` },
      'quick-draw': { name: 'Quick Draw', cost: 1, desc: `Draw + Strike with ${weapon.display}` },
      'skirmish-strike': { name: 'Skirmish Strike', cost: 1, desc: `Step + Strike with ${weapon.display}` },
      'combat-assessment': { name: 'Combat Assessment', cost: 1, desc: `Strike + Recall Knowledge with ${weapon.display}` },
      'assisting-shot': { name: 'Assisting Shot', cost: 1, desc: `Ranged Strike; hit gives ally +1 vs target` },
      'sleek-reposition': { name: 'Sleek Reposition', cost: 1, desc: `Strike + move target 5ft with ${weapon.display}` },
      'dual-handed-assault': { name: 'Dual-Handed Assault', cost: 1, desc: `Two-hand ${weapon.display} for extra damage die` },
      'quick-reversal': { name: 'Quick Reversal', cost: 1, desc: `Strike flanker with ${weapon.display}` },
      'double-shot': { name: 'Double Shot', cost: 2, desc: `Two ranged Strikes with ${weapon.display}` },
      'dazing-blow': { name: 'Dazing Blow', cost: 1, desc: `Strike ${weapon.display}; hit = Fort or stunned` },
      'advantageous-assault': { name: 'Advantageous Assault', cost: 1, desc: `Strike prone/grabbed foe for extra dmg` },
      'incredible-aim': { name: 'Incredible Aim', cost: 2, desc: `Ranged Strike +2 with ${weapon.display}, ignore conceal` },
      'positioning-assault': { name: 'Positioning Assault', cost: 2, desc: `Strike + move target 10ft with ${weapon.display}` },
      'certain-strike': { name: 'Certain Strike', cost: 1, desc: `Strike with ${weapon.display}; miss deals min damage` },
      'fighter-debilitating-shot': { name: 'Debilitating Shot', cost: 2, desc: `Ranged Strike with ${weapon.display}; hit = slowed 1` },
      'spring-attack': { name: 'Spring Attack', cost: 1, desc: `Stride + Strike with ${weapon.display}` },
      'brutal-finish': { name: 'Brutal Finish', cost: 1, desc: `Finishing Strike with ${weapon.display} + bonus dice` },
      'overwhelming-blow': { name: 'Overwhelming Blow', cost: 3, desc: `Max damage Strike with ${weapon.display}` },
      'combat-grab': { name: 'Combat Grab', cost: 1, desc: `Strike + grab with ${weapon.display}` },
      'swipe': { name: 'Swipe', cost: 2, desc: `Strike 2 adjacent foes with ${weapon.display}` },
      'whirlwind-strike': { name: 'Whirlwind Strike', cost: 3, desc: `Strike all enemies in reach with ${weapon.display}` },
      'rebounding-toss': { name: 'Rebounding Toss', cost: 1, desc: `Thrown Strike with ${weapon.display}, bounces to 2nd target` },
      'barreling-charge': { name: 'Barreling Charge', cost: 2, desc: `Charge through enemies + Strike with ${weapon.display}` },
      'parting-shot': { name: 'Parting Shot', cost: 2, desc: `Step + ranged Strike with ${weapon.display}` },
      'revealing-stab': { name: 'Revealing Stab', cost: 2, desc: `Piercing Strike with ${weapon.display}; reveals hidden foe` },
      'triple-shot': { name: 'Triple Shot', cost: 2, desc: `3 ranged Strikes with ${weapon.display} at -2` },
      'felling-strike': { name: 'Felling Strike', cost: 2, desc: `Melee Strike with ${weapon.display}; grounds flyer` },
      'sudden-leap': { name: 'Sudden Leap', cost: 2, desc: `Leap + Strike with ${weapon.display}` },
      'incredible-ricochet': { name: 'Incredible Ricochet', cost: 1, desc: `Thrown Strike with ${weapon.display}; ricochets on hit` },
      'guiding-finish': { name: 'Guiding Finish', cost: 1, desc: `Strike with ${weapon.display}; move target 10ft` },
      'impossible-volley': { name: 'Impossible Volley', cost: 3, desc: `Ranged Strike all enemies in burst with ${weapon.display}` },
      'blur-slam': { name: 'Blur Slam', cost: 2, desc: `Sprint + Strike with ${weapon.display}` },
      'opportune-backstab': { name: 'Opportune Backstab', cost: 0, desc: `Reaction Strike with ${weapon.display} on ally crit` },
      'felling-shot': { name: 'Felling Shot', cost: 2, desc: `Ranged Strike with ${weapon.display}; grounds flyer` },
      'spring-from-the-shadows': { name: 'Spring from the Shadows', cost: 1, desc: `Hidden Strike with ${weapon.display}; foe off-guard` },
      'youre-next': { name: "You're Next", cost: 0, desc: `Demoralize after downing foe with ${weapon.display}` },
      'leave-an-opening': { name: 'Leave an Opening', cost: 0, desc: `Reaction Strike with ${weapon.display} on enemy crit fail` },
      'spellstrike': { name: 'Spellstrike', cost: 2, desc: `Deliver ${pendingSpellstrikeSpellId ?? 'a spell'} through ${weapon.display}` },
    };
    const info = strikeActionInfo[actionType] ?? { name: 'Strike', cost: 1, desc: `Attack with ${weapon.display}` };
    
    const strikeAction: Action = {
      id: actionType,
      name: `${info.name} (${weapon.display})`,
      cost: info.cost,
      description: info.desc,
      icon: weapon.attackType === 'ranged' ? '🏹' : '⚔️',
      requiresTarget: true,
      range: (() => {
        if (weapon.attackType !== 'melee') return weapon.range || 1;
        let meleeReach = weapon.traits?.includes('reach') ? 2 : 1;
        if (actionType === 'lunge') meleeReach += 1; // Lunge adds +5ft reach
        return meleeReach;
      })(),
      weaponId: weapon.id,
      spellId: actionType === 'spellstrike' ? pendingSpellstrikeSpellId : undefined,
      usesD20: true
    };
    if (actionType === 'spellstrike') {
      (window as any).pendingSpellstrikeSpellId = undefined;
    }
    setWeaponPickerOpen(false);
    onSelectAction(strikeAction);
  };

  const handleWeaponAction = (actionType: 'draw-weapon' | 'stow-weapon' | 'drop-weapon', weaponId: string) => {
    const slot = weaponInventory.find((s: any) => s.weapon?.id === weaponId);
    if (!slot) return;
    const weapon = slot.weapon;
    const cost = actionType === 'drop-weapon' ? 0 : 1;
    const actionNames: Record<string, string> = {
      'draw-weapon': `Draw ${weapon.display}`,
      'stow-weapon': `Stow ${weapon.display}`,
      'drop-weapon': `Drop ${weapon.display}`
    };
    const icons: Record<string, string> = {
      'draw-weapon': '🗡️',
      'stow-weapon': '📦',
      'drop-weapon': '⬇️'
    };
    const weaponAction: Action = {
      id: actionType,
      name: actionNames[actionType],
      cost,
      description: actionNames[actionType],
      icon: icons[actionType],
      requiresTarget: false,
      weaponId: weapon.id
    };
    setWeaponManageOpen(false);
    setSpecialMenuOpen(false);
    onSelectAction(weaponAction);
    // Auto-confirm since no target needed
    setTimeout(() => onConfirmAction(), 50);
  };

  const handlePickupDroppedWeapon = (weaponId: string) => {
    // Find the corresponding ground object for this dropped weapon
    const groundObj = gameState?.groundObjects?.find((g: GroundObject) => g.weapon?.id === weaponId);
    if (!groundObj) return;
    
    const pickupAction: Action = {
      id: 'pick-up-weapon',
      name: `Pick Up ${groundObj.weapon.display}`,
      cost: 1,
      description: `Pick Up ${groundObj.weapon.display}`,
      icon: '📦',
      requiresTarget: true,
      targetId: groundObj.id
    };
    
    setWeaponManageOpen(false);
    setSpecialMenuOpen(false);
    onSelectAction(pickupAction);
    // Auto-confirm with the ground object as target
    setTimeout(() => onConfirmAction(), 50);
  };

  const handleConfirm = () => {
    onConfirmAction();
  };

  const handleSpellstrikeSpellSelect = (spellId: string) => {
    // Close modal and prepare Spellstrike action with the spell
    setSpellstrikeModalOpen(false);
    // Store spell and continue into normal weapon picker flow for strike-like actions
    (window as any).pendingSpellstrikeSpellId = spellId;
    (window as any).pendingStrikeAction = 'spellstrike';
    setWeaponPickerOpen(true);
    setActionMenuOpen(false);
    setSpellsMenuOpen(false);
    setSpecialMenuOpen(false);
    setWeaponManageOpen(false);
  };

  const isConfirmDisabled = !selectedAction || 
    (selectedAction.requiresTarget && !selectedTarget) || 
    (selectedAction.cost > 0 && actionPoints < selectedAction.cost);
  const evaluateRequirements = (action: ActionDefinition) => {
    const reqs = action.requirements ?? [];
    const blocked: string[] = [];
    const warnings: string[] = [];
    reqs.forEach((req) => {
      const result = req.check(currentCreature);
      if (!result.ok && !result.unknown) {
        blocked.push(req.label);
      } else if (result.unknown) {
        warnings.push(req.label);
      }
    });
    return {
      blocked,
      warnings
    };
  };

  const isActionDisabled = (action: ActionDefinition) => action.cost > actionPoints;

  const formatMovementCostDisplay = (value: number): string => {
    if (!Number.isFinite(value)) {
      return '∞';
    }
    return Math.abs(value - Math.round(value)) < 0.05
      ? Math.round(value).toString()
      : value.toFixed(1);
  };

  const shouldFilterUnavailable = (action: ActionDefinition) => {
    if (!hideUnavailable) return true;
    const reqEval = evaluateRequirements(action);
    const blocked = reqEval.blocked.length > 0;
    const disabled = isActionDisabled(action) || blocked;
    return !disabled;
  };

  const renderAction = (action: ActionDefinition) => {
    const reqEval = evaluateRequirements(action);
    const blocked = reqEval.blocked.length > 0;
    const disabled = isActionDisabled(action) || blocked || (selectedAction ? selectedAction.id !== action.id : false);
    const isSelected = selectedAction?.id === action.id;
    const tagList = action.tags ?? [];

    return (
      <button
        key={action.id}
        className={`action-row ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => handleActionSelect(action)}
        disabled={loading || disabled}
        title={action.description + (isActionDisabled(action) ? ` (Need ${action.cost}AP, have ${actionPoints})` : '')}
      >
        <div className="action-row-main">
          <div className="action-row-title">
            {action.icon} {action.name}
          </div>
          <div className="action-row-desc">{action.description}</div>
          {(reqEval.blocked.length > 0 || reqEval.warnings.length > 0 || tagList.length > 0) && (
            <div className="action-row-meta">
              {tagList.map((tag) => (
                <span key={tag} className="action-tag">{tag}</span>
              ))}
              {reqEval.blocked.length > 0 && (
                <span className="action-req">Requires: {reqEval.blocked.join(', ')}</span>
              )}
              {reqEval.warnings.length > 0 && (
                <span className="action-warn">Unverified: {reqEval.warnings.join(', ')}</span>
              )}
            </div>
          )}
        </div>
        <ActionCostIcon cost={action.cost} />
      </button>
    );
  };

  return (
    <div className="action-panel">
      {/* Remaining Actions, Reactions & Hero Points Display */}
      <div className="remaining-actions">
        <PF2eActionDiamond count={3} used={3 - Math.max(0, Math.min(actionPoints, 3))} />
        <div style={{ width: '1px', height: '24px', background: '#555' }} />
        <PF2eReactionIcon used={reactionUsed} />
        {currentCreature && (
          <>
            <div style={{ width: '1px', height: '24px', background: '#555' }} />
            <PF2eHeroPoints
              count={heroPoints}
              selectedSpend={heroPointSpend}
              onSelectSpend={onHeroPointSpendChange}
            />
          </>
        )}
      </div>

      <div className="action-menu-anchor">
        <div className="action-menu-toggle-row">
          <button
            type="button"
            className={`action-menu-toggle ${actionMenuOpen ? 'active' : ''}`}
            onClick={() => {
              setActionMenuOpen((prev) => !prev);
              setSpellsMenuOpen(false);
              setSpecialMenuOpen(false);
              setWeaponPickerOpen(false);
              setWeaponManageOpen(false);
              setSpellstrikeModalOpen(false);
            }}
          >
            ⚡ Actions
          </button>
          <button
            type="button"
            className={`action-menu-toggle ${specialMenuOpen ? 'active' : ''}`}
            onClick={() => {
              setSpecialMenuOpen((prev) => !prev);
              setActionMenuOpen(false);
              setSpellsMenuOpen(false);
              setWeaponPickerOpen(false);
              setWeaponManageOpen(false);
              setSpellstrikeModalOpen(false);
            }}
          >
            ⭐ Special
          </button>
          <button
            type="button"
            className={`action-menu-toggle ${spellsMenuOpen ? 'active' : ''}`}
            onClick={() => {
              setSpellsMenuOpen((prev) => !prev);
              setActionMenuOpen(false);
              setSpecialMenuOpen(false);
              setWeaponPickerOpen(false);
              setWeaponManageOpen(false);
              setSpellstrikeModalOpen(false);
            }}
          >
            ✨ Spells
          </button>
          {weaponInventory.length > 0 && (
            <button
              type="button"
              className={`action-menu-toggle ${weaponManageOpen ? 'active' : ''}`}
              onClick={() => {
                setWeaponManageOpen((prev) => !prev);
                setActionMenuOpen(false);
                setSpellsMenuOpen(false);
                setSpecialMenuOpen(false);
                setWeaponPickerOpen(false);
                setSpellstrikeModalOpen(false);
              }}
            >
              🗡️ Weapons
            </button>
          )}
          {selectedAction && (
            <div style={{
              padding: '3px 4px',
              background: '#1a1f2e',
              borderRadius: '4px',
              border: '1px solid #4fc3f7',
              fontSize: '10px',
              flex: 1,
              minWidth: 0
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '2px', fontSize: '11px' }}>
                Selected: {selectedAction.icon} {selectedAction.name}
              </div>
              <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '2px' }}>
                {selectedAction.description}
              </div>
              {selectedAction.id === 'spellstrike' && selectedAction.spellId && (
                <div style={{ fontSize: '10px', color: '#cfd8dc', marginBottom: '2px' }}>
                  Spell: {selectedAction.spellId}
                </div>
              )}
              {selectedAction.id === 'ready' && (
                <div style={{ fontSize: '10px', color: '#cfd8dc', marginBottom: '4px' }}>
                  <div style={{ marginBottom: '2px' }}>Readied action:</div>
                  <select
                    value={selectedAction.readyActionId || 'strike'}
                    onChange={(e) => onSelectAction({ ...selectedAction, readyActionId: e.target.value })}
                    style={{
                      fontSize: '10px',
                      background: '#0f1320',
                      color: '#e0e0e0',
                      border: '1px solid #3a4a6a',
                      borderRadius: '3px',
                      padding: '2px 4px',
                      width: '100%'
                    }}
                  >
                    {READY_ACTION_OPTIONS.map(option => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedAction.requiresTarget && (
                <div style={{ fontSize: '10px', color: selectedTarget ? '#4fc3f7' : '#ff8a80', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{selectedTarget ? '✓ Target selected' : '⚠ Click a target on the grid'}</span>
                  {selectedAction.usesD20 && heroPointSpend > 0 && (
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {Array(heroPointSpend).fill(null).map((_, idx) => (
                        <svg key={idx} viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                          <circle cx="12" cy="12" r="10" fill="#d64545" stroke="#ff9b9b" strokeWidth="1" />
                          <text x="12" y="15" textAnchor="middle" fill="#2a0b0b" fontSize="10" fontWeight="bold">H</text>
                        </svg>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!selectedAction.requiresTarget && selectedAction.usesD20 && heroPointSpend > 0 && (
                <div style={{ fontSize: '10px', color: '#d64545', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>Hero Points:</span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {Array(heroPointSpend).fill(null).map((_, idx) => (
                      <svg key={idx} viewBox="0 0 24 24" style={{ width: '14px', height: '14px' }}>
                        <circle cx="12" cy="12" r="10" fill="#d64545" stroke="#ff9b9b" strokeWidth="1" />
                        <text x="12" y="15" textAnchor="middle" fill="#2a0b0b" fontSize="10" fontWeight="bold">H</text>
                      </svg>
                    ))}
                  </div>
                </div>
              )}
              {(selectedAction.id === 'move' || selectedAction.id === 'stride') && movementInfo && (
                <div style={{ fontSize: '10px', color: '#4fc3f7', marginBottom: '2px' }}>
                  <div>Max: {movementInfo.maxDistance}sq {selectedMovementCost !== null && `| Cost: ${formatMovementCostDisplay(selectedMovementCost)}sq`}</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', marginTop: '3px' }}>
                <button
                  onClick={handleConfirm}
                  disabled={isConfirmDisabled || loading}
                  style={{
                    padding: '3px 6px',
                    background: isConfirmDisabled ? '#555' : '#4caf50',
                    color: isConfirmDisabled ? '#888' : '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '9px'
                  }}
                >
                  ✓ Confirm
                </button>
                <button
                  onClick={onCancel}
                  disabled={loading}
                  style={{
                    padding: '3px 6px',
                    background: '#666',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px'
                  }}
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {actionMenuOpen && (
          <div className="action-menu">
            <div className="action-tabs">
              {(['combat', 'explore', 'downtime'] as const).map((tab) => (
                <button
                  key={tab}
                  className={`action-tab-btn ${activeActionTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveActionTab(tab)}
                  type="button"
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ padding: '4px 8px', borderBottom: '1px solid #444', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                id="hide-unavailable"
                checked={hideUnavailable}
                onChange={(e) => setHideUnavailable(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="hide-unavailable" style={{ cursor: 'pointer', fontSize: '12px', userSelect: 'none' }}>
                Hide unavailable
              </label>
            </div>

            <div className="action-list">
              {(() => {
                const actionsForTab = allActions.filter(
                  (action) => action.category === activeActionTab && shouldFilterUnavailable(action)
                );

                return (
                  <div className="action-section">
                    {actionsForTab.length > 0 ? actionsForTab.map(renderAction) : (
                      <div className="action-empty">No actions available.</div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {specialMenuOpen && (
          <div className="action-menu">
            <div className="action-tabs">
              <div className="action-section-title" style={{ padding: '6px 10px' }}>Special Actions</div>
            </div>
            <div style={{ padding: '4px 8px', borderBottom: '1px solid #444', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                id="hide-unavailable-special"
                checked={hideUnavailable}
                onChange={(e) => setHideUnavailable(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="hide-unavailable-special" style={{ cursor: 'pointer', fontSize: '12px', userSelect: 'none' }}>
                Hide unavailable
              </label>
            </div>

            <div className="action-list">
              {(() => {
                const specialActions = allActions.filter((action) => action.unique && shouldFilterUnavailable(action));

                return (
                  <>
                    <div className="action-section">
                      {specialActions.length > 0 ? specialActions.map(renderAction) : (
                        <div className="action-empty">No special actions available.</div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {spellsMenuOpen && (
          <div className="action-menu">
            <div className="action-tabs">
              <div className="action-section-title" style={{ padding: '6px 10px' }}>Spells</div>
            </div>
            <div style={{ padding: '4px 8px', borderBottom: '1px solid #444', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                id="hide-unavailable-spells"
                checked={hideUnavailable}
                onChange={(e) => setHideUnavailable(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="hide-unavailable-spells" style={{ cursor: 'pointer', fontSize: '12px', userSelect: 'none' }}>
                Hide unavailable
              </label>
            </div>

            <div className="action-list">
              {(() => {
                const spellActions = allSpells.filter(shouldFilterUnavailable);

                return (
                  <>
                    <div className="action-section">
                      {spellActions.length > 0 ? spellActions.map(renderAction) : (
                        <div className="action-empty">No spells available.</div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Weapon Picker — extracted to WeaponPicker.tsx (C.2) */}
        {weaponPickerOpen && (
          <WeaponPicker
            pickableWeapons={pickableWeapons}
            weaponInventory={weaponInventory}
            heldWeapons={heldWeapons}
            creatureAttackBonus={creatureAttackBonus}
            loading={loading}
            onClose={() => setWeaponPickerOpen(false)}
            onWeaponSelect={handleWeaponSelect}
          />
        )}

        {/* Spellstrike Spell Selector — extracted to SpellstrikeSelector.tsx (C.2) */}
        {spellstrikeModalOpen && (
          <SpellstrikeSelector
            allSpells={allSpells}
            loading={loading}
            onClose={() => setSpellstrikeModalOpen(false)}
            onSpellSelect={handleSpellstrikeSpellSelect}
          />
        )}

        {/* Weapon Management — extracted to WeaponManager.tsx (C.2) */}
        {weaponManageOpen && (
          <WeaponManager
            heldWeapons={heldWeapons}
            stowedWeapons={stowedWeapons}
            droppedWeapons={droppedWeapons}
            actionPoints={actionPoints}
            loading={loading}
            onWeaponAction={handleWeaponAction}
            onPickupDroppedWeapon={handlePickupDroppedWeapon}
          />
        )}



      </div>

      <div className="end-turn-container">
        <button
          className="end-turn-btn"
          onClick={onEndTurn}
          disabled={loading}
        >
          End Turn ({actionPoints}AP)
        </button>
      </div>

      {loading && <div className="loading-indicator">Processing...</div>}
    </div>
  );
};

export default ActionPanel;
