import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3099;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Path to the canonical metadata file (in public/textures so Vite also serves it)
const metadataPath = path.join(__dirname, '..', 'public', 'textures', 'atlas-metadata.json');
const approvedSetsPath = path.join(__dirname, '..', 'public', 'approved-atlas-sets.json');

// Biome/feature-type assignments (set-level, not tile-level)
const biomesPath = path.join(__dirname, '..', 'public', 'biome-assignments.json');
const mainProjectBiomesPath = path.join(
  __dirname, '..', '..', 'frontend', 'public', 'biome-assignments.json',
);

// Season assignments (set-level)
const seasonsPath = path.join(__dirname, '..', 'public', 'season-assignments.json');
const mainProjectSeasonsPath = path.join(
  __dirname, '..', '..', 'frontend', 'public', 'season-assignments.json',
);

// Also keep the main project copy in sync
const mainProjectMetadataPath = path.join(
  __dirname, '..', '..', 'frontend', 'public', 'textures', 'atlas-metadata.json',
);
const mainProjectApprovedSetsPath = path.join(
  __dirname, '..', '..', 'frontend', 'public', 'approved-atlas-sets.json',
);

app.get('/api/atlas/metadata', (_req, res) => {
  try {
    if (fs.existsSync(metadataPath)) {
      const data = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      res.json(data);
    } else {
      res.json({});
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/atlas/metadata', (req, res) => {
  try {
    const json = JSON.stringify(req.body, null, 2);
    fs.writeFileSync(metadataPath, json, 'utf-8');

    // Also sync back to the main project if it exists
    try {
      if (fs.existsSync(path.dirname(mainProjectMetadataPath))) {
        fs.writeFileSync(mainProjectMetadataPath, json, 'utf-8');
        console.log('✅ Synced metadata back to main project');
      }
    } catch {
      // Non-fatal — main project may not be present
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ── Approved Atlas Sets Export (Map Generator) ──

app.get('/api/atlas/approved-sets', (_req, res) => {
  try {
    if (fs.existsSync(approvedSetsPath)) {
      const data = JSON.parse(fs.readFileSync(approvedSetsPath, 'utf-8'));
      res.json(data);
    } else {
      res.json({ generatedAt: new Date().toISOString(), totalSets: 0, sets: [] });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/atlas/approved-sets', (req, res) => {
  try {
    const json = JSON.stringify(req.body, null, 2);
    fs.writeFileSync(approvedSetsPath, json, 'utf-8');

    // Sync to main project for map-generator/frontend consumption
    try {
      if (fs.existsSync(path.dirname(mainProjectApprovedSetsPath))) {
        fs.writeFileSync(mainProjectApprovedSetsPath, json, 'utf-8');
        console.log('✅ Synced approved atlas sets back to main project');
      }
    } catch {
      // Non-fatal
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ── Biome / Feature Type Assignments ──

app.get('/api/atlas/biomes', (_req, res) => {
  try {
    if (fs.existsSync(biomesPath)) {
      const data = JSON.parse(fs.readFileSync(biomesPath, 'utf-8'));
      res.json(data);
    } else {
      res.json({ biomeTypes: [], assignments: {} });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/atlas/biomes', (req, res) => {
  try {
    const json = JSON.stringify(req.body, null, 2);
    fs.writeFileSync(biomesPath, json, 'utf-8');

    // Sync to main project
    try {
      if (fs.existsSync(path.dirname(mainProjectBiomesPath))) {
        fs.writeFileSync(mainProjectBiomesPath, json, 'utf-8');
        console.log('✅ Synced biome assignments back to main project');
      }
    } catch {
      // Non-fatal
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ── Season Assignments ──

app.get('/api/atlas/seasons', (_req, res) => {
  try {
    if (fs.existsSync(seasonsPath)) {
      const data = JSON.parse(fs.readFileSync(seasonsPath, 'utf-8'));
      res.json(data);
    } else {
      // Default with standard 4 seasons
      res.json({ seasonTypes: ['spring', 'summer', 'autumn', 'winter'], assignments: {} });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post('/api/atlas/seasons', (req, res) => {
  try {
    const json = JSON.stringify(req.body, null, 2);
    fs.writeFileSync(seasonsPath, json, 'utf-8');

    // Sync to main project
    try {
      if (fs.existsSync(path.dirname(mainProjectSeasonsPath))) {
        fs.writeFileSync(mainProjectSeasonsPath, json, 'utf-8');
        console.log('✅ Synced season assignments back to main project');
      }
    } catch {
      // Non-fatal
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`🗺️  Atlas metadata server running on http://localhost:${PORT}`);
  console.log(`   Metadata file: ${metadataPath}`);
});
