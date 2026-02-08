document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("grid");
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const gridSizeSelect = document.getElementById("grid-size");
  const modeSelect = document.getElementById("mode");
  const clearWallsButton = document.getElementById("clear-walls");
  const runPathButton = document.getElementById("run-path");
  const gridStatus = document.getElementById("grid-status");
  const pathStatus = document.getElementById("path-status");

  const characterFile = document.getElementById("character-file");
  const characterList = document.getElementById("character-list");
  const characterError = document.getElementById("character-error");

  let gridSize = Number(gridSizeSelect.value);
  let cellSize = canvas.width / gridSize;
  let walls = new Set();
  let start = { x: 2, y: 2 };
  let end = { x: gridSize - 3, y: gridSize - 3 };
  let path = [];

  const palette = {
    empty: "#0d101a",
    wall: "#2a3042",
    start: "#58f4c6",
    end: "#ff907f",
    path: "#5ec0ff",
    grid: "#1e2434",
  };

  function cellKey(x, y) {
    return `${x},${y}`;
  }

  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = palette.empty;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        const key = cellKey(x, y);
        if (walls.has(key)) {
          ctx.fillStyle = palette.wall;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    if (path.length) {
      ctx.fillStyle = palette.path;
      path.forEach((node) => {
        ctx.fillRect(node.x * cellSize, node.y * cellSize, cellSize, cellSize);
      });
    }

    ctx.fillStyle = palette.start;
    ctx.fillRect(start.x * cellSize, start.y * cellSize, cellSize, cellSize);

    ctx.fillStyle = palette.end;
    ctx.fillRect(end.x * cellSize, end.y * cellSize, cellSize, cellSize);

    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }
  }

  function updateStatus(message) {
    pathStatus.textContent = message;
  }

  function resetGrid(size) {
    gridSize = size;
    cellSize = canvas.width / gridSize;
    walls = new Set();
    start = { x: 1, y: 1 };
    end = { x: gridSize - 2, y: gridSize - 2 };
    path = [];
    gridStatus.textContent = `${gridSize} x ${gridSize} grid`;
    updateStatus("No path calculated");
    drawGrid();
  }

  function getNeighbors(node) {
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    return directions
      .map((dir) => ({ x: node.x + dir.x, y: node.y + dir.y }))
      .filter(
        (next) =>
          next.x >= 0 &&
          next.y >= 0 &&
          next.x < gridSize &&
          next.y < gridSize &&
          !walls.has(cellKey(next.x, next.y))
      );
  }

  function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function reconstructPath(cameFrom, current) {
    const totalPath = [current];
    let cursor = cellKey(current.x, current.y);
    while (cameFrom.has(cursor)) {
      const prev = cameFrom.get(cursor);
      totalPath.push(prev);
      cursor = cellKey(prev.x, prev.y);
    }
    return totalPath.reverse();
  }

  function runPathfinder() {
    if (walls.has(cellKey(start.x, start.y)) || walls.has(cellKey(end.x, end.y))) {
      updateStatus("Start or end is blocked by a wall.");
      path = [];
      drawGrid();
      return;
    }

    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    gScore.set(cellKey(start.x, start.y), 0);
    fScore.set(cellKey(start.x, start.y), heuristic(start, end));

    while (openSet.length) {
      openSet.sort(
        (a, b) =>
          (fScore.get(cellKey(a.x, a.y)) ?? Infinity) -
          (fScore.get(cellKey(b.x, b.y)) ?? Infinity)
      );
      const current = openSet.shift();
      if (!current) {
        break;
      }

      if (current.x === end.x && current.y === end.y) {
        path = reconstructPath(cameFrom, current);
        updateStatus(`Path found with ${path.length} steps.`);
        drawGrid();
        return;
      }

      for (const neighbor of getNeighbors(current)) {
        const neighborKey = cellKey(neighbor.x, neighbor.y);
        const tentativeG =
          (gScore.get(cellKey(current.x, current.y)) ?? Infinity) + 1;
        if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeG);
          fScore.set(neighborKey, tentativeG + heuristic(neighbor, end));
          if (
            !openSet.find((node) => node.x === neighbor.x && node.y === neighbor.y)
          ) {
            openSet.push(neighbor);
          }
        }
      }
    }

    path = [];
    updateStatus("No path found.");
    drawGrid();
  }

  function handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * gridSize);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * gridSize);
    if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) {
      return;
    }

    const key = cellKey(x, y);
    const mode = modeSelect.value;

    if (mode === "wall") {
      if (key !== cellKey(start.x, start.y) && key !== cellKey(end.x, end.y)) {
        if (walls.has(key)) {
          walls.delete(key);
        } else {
          walls.add(key);
        }
      }
    } else if (mode === "start") {
      if (!walls.has(key)) {
        start = { x, y };
      }
    } else if (mode === "end") {
      if (!walls.has(key)) {
        end = { x, y };
      }
    }

    path = [];
    updateStatus("No path calculated");
    drawGrid();
  }

  function parsePathbuilder(data) {
    const characters = Array.isArray(data) ? data : [data];
    return characters
      .map((entry) => {
        const details = entry.character ?? entry;
        const name = details.name ?? details.character_name ?? "Unknown Hero";
        const ancestry = details.ancestry ?? details.ancestry_name ?? "Unknown";
        const className =
          details.class ?? details.class_name ?? details.character_class ?? "Unknown";
        const level = details.level ?? details.character_level ?? "?";
        const hp = details.hit_points ?? details.hp ?? "?";
        return {
          name,
          ancestry,
          className,
          level,
          hp,
        };
      })
      .filter((entry) => entry.name);
  }

  function renderCharacters(list) {
    characterList.innerHTML = "";
    list.forEach((character) => {
      const card = document.createElement("div");
      card.className = "character-card";
      card.innerHTML = `
      <h3>${character.name}</h3>
      <p>Level ${character.level} ${character.ancestry} ${character.className}</p>
      <p>HP: ${character.hp}</p>
    `;
      characterList.appendChild(card);
    });
  }

  characterFile.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    characterError.textContent = "";
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const characters = parsePathbuilder(data);
      if (!characters.length) {
        throw new Error("No characters found in the export.");
      }
      renderCharacters(characters);
    } catch (error) {
      characterError.textContent =
        error instanceof Error ? error.message : "Unable to parse the file.";
    }
  });

  gridSizeSelect.addEventListener("change", (event) => {
    resetGrid(Number(event.target.value));
  });

  clearWallsButton.addEventListener("click", () => {
    walls.clear();
    path = [];
    updateStatus("No path calculated");
    drawGrid();
  });

  runPathButton.addEventListener("click", () => {
    runPathfinder();
  });

  canvas.addEventListener("click", handleCanvasClick);

  resetGrid(gridSize);
});
