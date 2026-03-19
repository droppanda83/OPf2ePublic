/**
 * Shared types for the feat system
 */

export type FeatCategory = 'class_feature' | 'class' | 'skill' | 'general' | 'ancestry' | 'archetype';

export type ImplementationStatus = 'full' | 'partial' | 'stub' | 'not_implemented';

export interface FeatEntry {
  /** Unique identifier matching the action ID in rules.ts where applicable */
  id: string;
  /** Display name */
  name: string;
  /** Which class or ancestry this belongs to (null = universal) */
  source: string | null;
  /** Category determining how this is acquired */
  category: FeatCategory;
  /** Minimum level required */
  level: number;
  /** Short description of the feat's effect */
  description: string;
  /** Whether this feat has combat mechanic implementation */
  implemented: ImplementationStatus;
  /** PF2e traits (e.g., ['Flourish', 'Press']) */
  traits?: string[];
  /** Action cost (1, 2, 3, 'reaction', 'free', 'passive') */
  actionCost?: number | 'reaction' | 'free' | 'passive';
  /** Prerequisites (e.g., feat names, skill requirements) */
  prerequisites?: string[];
  /** Implementation notes for developers (how the mechanics work in code) */
  mechanics?: string;
  /** Sub-choices the player must make when selecting this feat (e.g., pick a spell or option) */
  subChoices?: {
    label: string;  // e.g., 'Choose a spell'
    options: { id: string; name: string; description?: string }[];
    /** When true, show a free-text input instead of a dropdown (options are ignored) */
    freeText?: boolean;
  };
}
