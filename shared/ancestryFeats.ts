/**
 * Ancestry feat definitions for PF2e Rebirth
 *
 * Barrel file - merges the five alphabetical split files into a single
 * ANCESTRY_FEAT_CATALOG array used by the rest of the codebase.
 *
 * Split files (authoritative source of truth):
 *   ancestryFeatsAC.ts  - Aiuvarin ... Conrasu
 *   ancestryFeatsDG.ts  - Dhampir  ... Grippli
 *   ancestryFeatsHN.ts  - Halfling ... Nephilim
 *   ancestryFeatsOV.ts  - Orc      ... Vanara
 *   ancestryFeatsVH.ts  - Versatile Heritages ... Yaoguai
 */
import type { FeatEntry } from './featTypes';
import { ANCESTRY_FEATS_AC } from './ancestryFeatsAC';
import { ANCESTRY_FEATS_DG } from './ancestryFeatsDG';
import { ANCESTRY_FEATS_HN } from './ancestryFeatsHN';
import { ANCESTRY_FEATS_OV } from './ancestryFeatsOV';
import { ANCESTRY_FEATS_VH } from './ancestryFeatsVH';

export const ANCESTRY_FEAT_CATALOG: FeatEntry[] = [
  ...ANCESTRY_FEATS_AC,
  ...ANCESTRY_FEATS_DG,
  ...ANCESTRY_FEATS_HN,
  ...ANCESTRY_FEATS_OV,
  ...ANCESTRY_FEATS_VH,
];