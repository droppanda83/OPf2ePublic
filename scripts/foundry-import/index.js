const { run: runWeaponsImport } = require('./import-weapons');
const { run: runBestiaryImport } = require('./import-bestiary');
const { run: runSpellsImport } = require('./import-spells');
const { run: runFeatsImport } = require('./import-feats');
const { run: runMapsImport } = require('./import-maps');

function run() {
  runWeaponsImport();
  runBestiaryImport();
  runSpellsImport();
  runFeatsImport();
  runMapsImport();
}

if (require.main === module) {
  run();
}

module.exports = { run };
