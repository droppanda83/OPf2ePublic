import React, { useMemo, useState } from 'react';
import { getSpell } from '../utils/spellsWrapper';
import { WEAPON_CATALOG } from '../../../shared/weapons';
import { getShield } from '../../../shared/shields';
import './ActionPanel.css';

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
  currentCreature: any;
  selectedAction: Action | null;
  selectedTarget: string | null;
  movementInfo: {
    costMap: Map<string, number>;
    maxDistance: number;
  } | null;
  actionPoints: number;
  gameState?: any;
  onSelectAction: (action: Action) => void;
  onConfirmAction: () => void;
  onCancel: () => void;
  onEndTurn: () => void;
  heroPointSpend: number;
  onHeroPointSpendChange: (value: number) => void;
  loading: boolean;
}

// PF2e Action Icon - Three diamonds, one per action
const PF2eActionDiamond: React.FC<{ count: number; used?: number }> = ({ count, used = 0 }) => {
  const usedCount = Math.min(3, Math.max(0, used));
  const baseColor = 'currentColor';
  const usedFill = 'rgba(0, 0, 0, 0.55)';

  const diamondWidth = 22;
  const diamondHeight = 26;
  const overlap = 6;
  const startX = 0;
  const startY = 4;

  const renderDiamond = (x: number, y: number, usedState: boolean) => {
    const cx = x + diamondWidth / 2;
    const cy = y + diamondHeight / 2;
    const opacity = usedState ? 0.35 : 0.95;
    const fill = usedState ? usedFill : baseColor;

    return (
      <g key={`${x}-${y}`}>
        <polygon
          points={`${cx},${y} ${x + diamondWidth},${cy} ${cx},${y + diamondHeight} ${x},${cy}`}
          fill={fill}
          stroke={baseColor}
          strokeWidth={1.2}
          opacity={opacity}
        />
        {!usedState && (
          <polygon
            points={`${cx},${y + 1} ${x + diamondWidth - 2},${cy} ${cx},${cy} ${x + 2},${cy}`}
            fill="rgba(255,255,255,0.15)"
          />
        )}
      </g>
    );
  };

  const diamonds = Array.from({ length: count }).map((_, i) => {
    const x = startX + i * (diamondWidth - overlap);
    const usedState = i >= (count - usedCount);
    return renderDiamond(x, startY, usedState);
  });

  const svgWidth = diamondWidth + (count - 1) * (diamondWidth - overlap);
  const svgHeight = diamondHeight + startY * 2;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="pf2e-action-diamonds"
      style={{ width: `${svgWidth * 0.8}px`, height: `${svgHeight * 0.8}px` }}
    >
      {diamonds}
    </svg>
  );
};

// PF2e Reaction Icon - single diamond with R
const PF2eReactionIcon: React.FC<{ used?: boolean }> = ({ used = false }) => {
  const size = 22;
  const center = size / 2;
  const diamond = `${center},2 ${size - 2},${center} ${center},${size - 2} 2,${center}`;
  const opacity = used ? 0.35 : 0.95;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: '20px', height: '20px' }}
      className="pf2e-reaction-icon"
    >
      <polygon
        points={diamond}
        fill="#7c5ce1"
        stroke="#c9b8ff"
        strokeWidth="1"
        opacity={opacity}
      />
      {!used && (
        <polygon
          points={`${center},3 ${size - 4},${center} ${center},${center} 4,${center}`}
          fill="rgba(255,255,255,0.18)"
        />
      )}
      <text
        x={center}
        y={center + 4}
        textAnchor="middle"
        fill={used ? '#c9b8ff' : '#1e1e1e'}
        fontSize="12"
        fontWeight="bold"
        opacity={opacity}
      >
        R
      </text>
    </svg>
  );
};

// PF2e Hero Points - up to 3 circles showing filled/empty + selectable spend
const PF2eHeroPoints: React.FC<{
  count: number;
  selectedSpend: number;
  onSelectSpend: (value: number) => void;
}> = ({ count, selectedSpend, onSelectSpend }) => {
  const maxHeroPoints = 3;
  const filledCount = Math.min(Math.max(count, 0), maxHeroPoints);
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {Array(maxHeroPoints).fill(null).map((_, index) => {
        const spendValue = index + 1;
        const usedState = index >= filledCount;
        const isSelected = spendValue === selectedSpend;
        const opacity = usedState ? 0.35 : 0.95;
        const canSelect = !usedState;
        const tooltipText = canSelect ? `Spend ${spendValue} Hero Point${spendValue === 1 ? '' : 's'}` : 'No Hero Points';
        return (
          <svg
            key={index}
            viewBox="0 0 24 24"
            style={{
              width: '24px',
              height: '24px',
              cursor: canSelect ? 'pointer' : 'not-allowed',
              filter: isSelected ? 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))' : 'none'
            }}
            onClick={() => {
              if (!canSelect) return;
              onSelectSpend(isSelected ? 0 : spendValue);
            }}
          >
            <title>{tooltipText}</title>
            <circle
              cx="12"
              cy="12"
              r="10"
              fill={usedState ? 'rgba(60, 10, 10, 0.6)' : '#d64545'}
              stroke={isSelected ? '#ffd700' : usedState ? '#7a2b2b' : '#ff9b9b'}
              strokeWidth={isSelected ? '2' : '1'}
              opacity={opacity}
            />
            <text
              x="12"
              y="15"
              textAnchor="middle"
              fill={usedState ? 'rgba(255,255,255,0.45)' : '#2a0b0b'}
              fontSize="12"
              fontWeight="bold"
              opacity={opacity}
            >
              H
            </text>
          </svg>
        );
      })}
    </div>
  );
};

// Inline action cost icon - small diamonds showing AP cost
const ActionCostIcon: React.FC<{ cost: number }> = ({ cost }) => {
  const dw = 10;
  const dh = 12;
  const ov = 3;
  const count = Math.min(cost, 3);
  const svgW = dw + (count - 1) * (dw - ov);
  const svgH = dh + 4;
  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ width: `${svgW}px`, height: `${svgH}px`, verticalAlign: 'middle', flexShrink: 0 }}
      className="action-cost-icon"
    >
      {Array.from({ length: count }).map((_, i) => {
        const x = i * (dw - ov);
        const cx = x + dw / 2;
        const cy = 2 + dh / 2;
        return (
          <polygon
            key={i}
            points={`${cx},2 ${x + dw},${cy} ${cx},${2 + dh} ${x},${cy}`}
            fill="#0dd"
            stroke="#0dd"
            strokeWidth="0.6"
            opacity="0.9"
          />
        );
      })}
    </svg>
  );
};

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
            <div>💀 Dying: {(currentCreature as any).conditions?.find((c: any) => c.name === 'dying')?.value ?? 1} / 4</div>
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
                description: `Flat check vs DC ${10 + ((currentCreature as any).conditions?.find((c: any) => c.name === 'dying')?.value ?? 1)}`,
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
  const reqProne = requirement('prone', 'Must be prone', (creature) => ({
    ok: creature?.conditions?.some((c: any) => c.name === 'prone') || false
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
      id: 'ready',
      name: 'Ready',
      cost: 2,
      description: 'Prepare a reaction to a trigger',
      icon: '⏳',
      requiresTarget: false,
      category: 'combat'
    },
    {
      id: 'delay',
      name: 'Delay',
      cost: 0,
      description: 'Wait and take your turn later in the round',
      icon: '⏸️',
      requiresTarget: false,
      category: 'combat',
      requirements: [reqNotActed]
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
    creatureSpellIds = currentCreature.spells.split(' ').filter((s: string) => s.length > 0);
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
      description: 'Enter a rage for extra damage',
      icon: '🔥',
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
      description: 'Make two Strikes in rapid succession',
      icon: '🥋',
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
      description: 'Designate a target as your prey',
      icon: '🎯',
      requiresTarget: true,
      category: 'combat',
      unique: true
    });
  }

  if (className.includes('investigator') || hasFeat('devise a stratagem')) {
    uniqueActions.push({
      id: 'devise-a-stratagem',
      name: 'Devise a Stratagem',
      cost: 1,
      description: 'Assess a foe for a decisive strike',
      icon: '🧮',
      requiresTarget: true,
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

  const allActions: ActionDefinition[] = [...actions, ...uniqueActions];
  const allSpells: ActionDefinition[] = spells;

  const handleActionSelect = (action: Action) => {
    // Check if creature has enough action points
    if (action.cost > actionPoints) {
      alert(`Not enough action points. Need ${action.cost}, have ${actionPoints}.`);
      return;
    }

    // Always show weapon picker when Strike-style actions are clicked
    if (action.id === 'strike' || action.id === 'vicious-swing') {
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
    
    // Get the pending action type (strike or vicious swing)
    const actionType = (window as any).pendingStrikeAction || 'strike';
    const isVicious = actionType === 'vicious-swing';
    const actionName = isVicious ? 'Vicious Swing' : 'Strike';
    const actionCost = isVicious ? 2 : 1;
    const actionDescription = isVicious
      ? `Vicious Swing with ${weapon.display}`
      : `Attack with ${weapon.display}`;
    
    const strikeAction: Action = {
      id: actionType,
      name: `${actionName} (${weapon.display})`,
      cost: actionCost,
      description: actionDescription,
      icon: weapon.attackType === 'ranged' ? '🏹' : '⚔️',
      requiresTarget: true,
      range: weapon.range || 1,
      weaponId: weapon.id,
      usesD20: true
    };
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
    const groundObj = gameState?.groundObjects?.find((g: any) => g.weapon?.id === weaponId);
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

  const isConfirmDisabled = selectedAction && selectedAction.requiresTarget ? !selectedTarget : !selectedAction;
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

        {/* Weapon Picker - shown when clicking Strike with weapon inventory */}
        {weaponPickerOpen && (
          <div className="action-menu">
            <div className="action-tabs">
              <div className="action-section-title" style={{ padding: '6px 10px' }}>Choose Weapon for Strike</div>
              <button
                type="button"
                onClick={() => setWeaponPickerOpen(false)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>
            <div className="action-list">
              <div className="action-section">
                <div className="action-section-title">Available Attacks</div>
                {pickableWeapons.map((slot: any) => {
                  const w = slot.weapon;
                  const traits = w.traits?.join(', ') || '';
                  const atkBonus = w.attackBonus ?? creatureAttackBonus;
                  const formatBonus = (v: number) => v >= 0 ? `+${v}` : `${v}`;
                  return (
                    <button
                      key={w.id}
                      className="action-row"
                      onClick={() => handleWeaponSelect(w.id)}
                      disabled={loading}
                    >
                      <div className="action-row-main">
                        <div className="action-row-title">
                          {w.attackType === 'ranged' ? '🏹' : '⚔️'} {w.display}
                          {w.isNatural && <span style={{ fontSize: '10px', color: '#81c784', marginLeft: '6px' }}>(Natural)</span>}
                        </div>
                        <div className="action-row-desc">
                          {atkBonus !== undefined && <><span style={{ color: '#4fc3f7', fontWeight: 600 }}>Strike {formatBonus(atkBonus)}</span>{' | '}</>}
                          Damage: {w.damageDice}{w.damageBonus ? formatBonus(w.damageBonus) : ''} {w.damageType}
                          {w.hands > 0 && ` | ${w.hands}H`}
                          {w.range && w.range > 1 && ` | Range: ${w.range}`}
                        </div>
                        {traits && (
                          <div className="action-row-meta">
                            <span className="action-tag">{traits}</span>
                          </div>
                        )}
                      </div>
                      <ActionCostIcon cost={1} />
                    </button>
                  );
                })}
              </div>
              {weaponInventory.length > 0 && heldWeapons.length === 0 && (
                <div className="action-section">
                  <div className="action-empty">No weapons held. Draw a weapon first!</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weapon Management - Draw/Stow/Drop */}
        {weaponManageOpen && (
          <div className="action-menu">
            <div className="action-tabs">
              <div className="action-section-title" style={{ padding: '6px 10px' }}>Weapon Management</div>
            </div>
            <div className="action-list">
              {/* Held Weapons - can stow or drop */}
              {heldWeapons.filter((s: any) => !s.weapon?.isNatural).length > 0 && (
                <div className="action-section">
                  <div className="action-section-title">Held Weapons</div>
                  {heldWeapons.filter((s: any) => !s.weapon?.isNatural).map((slot: any) => {
                    const w = slot.weapon;
                    return (
                      <div key={w.id} style={{ display: 'flex', gap: '4px', padding: '4px 8px', alignItems: 'center' }}>
                        <span style={{ flex: 1, fontSize: '12px', color: '#e0e0e0' }}>⚔️ {w.display} ({w.hands}H)</span>
                        <button
                          className="action-row"
                          style={{ flex: 0, padding: '3px 8px', fontSize: '10px', minWidth: 'auto' }}
                          onClick={() => handleWeaponAction('stow-weapon', w.id)}
                          disabled={loading || actionPoints < 1}
                          title="Stow weapon (1 action)"
                        >
                          📦 Stow
                        </button>
                        <button
                          className="action-row"
                          style={{ flex: 0, padding: '3px 8px', fontSize: '10px', minWidth: 'auto' }}
                          onClick={() => handleWeaponAction('drop-weapon', w.id)}
                          disabled={loading}
                          title="Drop weapon (free action)"
                        >
                          ⬇️ Drop
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Natural attacks - always available */}
              {heldWeapons.filter((s: any) => s.weapon?.isNatural).length > 0 && (
                <div className="action-section">
                  <div className="action-section-title">Natural Attacks</div>
                  {heldWeapons.filter((s: any) => s.weapon?.isNatural).map((slot: any) => {
                    const w = slot.weapon;
                    return (
                      <div key={w.id} style={{ padding: '4px 8px', fontSize: '12px', color: '#81c784' }}>
                        🦷 {w.display} — Always available
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Stowed Weapons - can draw */}
              {stowedWeapons.length > 0 && (
                <div className="action-section">
                  <div className="action-section-title">Stowed Weapons</div>
                  {stowedWeapons.map((slot: any) => {
                    const w = slot.weapon;
                    return (
                      <div key={w.id} style={{ display: 'flex', gap: '4px', padding: '4px 8px', alignItems: 'center' }}>
                        <span style={{ flex: 1, fontSize: '12px', color: '#999' }}>📦 {w.display} ({w.hands}H)</span>
                        <button
                          className="action-row"
                          style={{ flex: 0, padding: '3px 8px', fontSize: '10px', minWidth: 'auto' }}
                          onClick={() => handleWeaponAction('draw-weapon', w.id)}
                          disabled={loading || actionPoints < 1}
                          title="Draw weapon (1 action)"
                        >
                          🗡️ Draw
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dropped Weapons */}
              {droppedWeapons.length > 0 && (
                <div className="action-section">
                  <div className="action-section-title">Dropped Weapons</div>
                  {droppedWeapons.map((slot: any) => {
                    const w = slot.weapon;
                    return (
                      <div key={w.id} style={{ display: 'flex', gap: '4px', padding: '4px 8px', alignItems: 'center' }}>
                        <span style={{ flex: 1, fontSize: '12px', color: '#999' }}>⬇️ {w.display} ({w.hands}H)</span>
                        <button
                          className="action-row"
                          style={{ flex: 0, padding: '3px 8px', fontSize: '10px', minWidth: 'auto' }}
                          onClick={() => handlePickupDroppedWeapon(w.id)}
                          disabled={loading || actionPoints < 1}
                          title="Pick up weapon (1 action)"
                        >
                          Pick Up
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
