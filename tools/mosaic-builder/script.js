const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const imageUpload = document.getElementById('imageUpload');
const squareColorInput = document.getElementById('squareColor');
const bgColorInput = document.getElementById('bgColor');
const resWidthInput = document.getElementById('resWidth');
const resHeightInput = document.getElementById('resHeight');

// Sliders and number inputs
const inputs = ['gridSize', 'squareSize', 'margin', 'density', 'lineWidth', 'gridOpacity', 'brushSize', 'liquidRadius'];
const state = {
    gridSize: 50,
    squareSize: 40,
    margin: 50,
    density: 30,
    lineWidth: 2,
    outlineMode: false,
    liquidMode: false,
    liquidRadius: 10,
    showGrid: false,
    exportGrid: false,
    gridColor: '#ffffff',
    gridOpacity: 15,
    brushSize: 3,
    brushMode: 'paint' // 'paint' or 'erase'
};

inputs.forEach(id => {
    const slider = document.getElementById(id);
    const num = document.getElementById(id + '_num');
    
    slider.addEventListener('input', (e) => {
        num.value = e.target.value;
        state[id] = parseFloat(e.target.value);
        draw();
    });
    
    num.addEventListener('input', (e) => {
        slider.value = e.target.value;
        state[id] = parseFloat(e.target.value);
        draw();
    });
});

document.getElementById('generateBtn').addEventListener('click', () => {
    customMap = Array(500).fill().map(() => Array(500).fill(null));
    generateRandomMap();
    draw();
});

const brushModePaint = document.getElementById('brushModePaint');
const brushModeErase = document.getElementById('brushModeErase');

brushModePaint.addEventListener('click', () => {
    state.brushMode = 'paint';
    brushModePaint.style.background = 'var(--accent)';
    brushModePaint.style.color = '#000';
    brushModePaint.style.borderColor = 'var(--accent)';
    brushModeErase.style.background = '#333';
    brushModeErase.style.color = '#ccc';
    brushModeErase.style.borderColor = 'transparent';
});

brushModeErase.addEventListener('click', () => {
    state.brushMode = 'erase';
    brushModeErase.style.background = 'var(--accent)';
    brushModeErase.style.color = '#000';
    brushModeErase.style.borderColor = 'var(--accent)';
    brushModePaint.style.background = '#333';
    brushModePaint.style.color = '#ccc';
    brushModePaint.style.borderColor = 'transparent';
});
const liquidModeCheckbox = document.getElementById('liquidMode');
const outlineModeCheckbox = document.getElementById('outlineMode');
const lineWidthGroup = document.getElementById('lineWidthGroup');
const showGridCheckbox = document.getElementById('showGrid');
const gridOptionsGroup = document.getElementById('gridOptionsGroup');
const exportGridCheckbox = document.getElementById('exportGrid');
const gridColorInput = document.getElementById('gridColor');

const liquidRadiusGroup = document.getElementById('liquidRadiusGroup');

liquidModeCheckbox.addEventListener('change', (e) => {
    state.liquidMode = e.target.checked;
    liquidRadiusGroup.style.display = state.liquidMode ? 'flex' : 'none';
    draw();
});

outlineModeCheckbox.addEventListener('change', (e) => {
    state.outlineMode = e.target.checked;
    lineWidthGroup.style.display = state.outlineMode ? 'flex' : 'none';
    draw();
});

showGridCheckbox.addEventListener('change', (e) => {
    state.showGrid = e.target.checked;
    gridOptionsGroup.style.display = state.showGrid ? 'flex' : 'none';
    draw();
});

exportGridCheckbox.addEventListener('change', (e) => {
    state.exportGrid = e.target.checked;
    draw();
});

gridColorInput.addEventListener('input', (e) => {
    state.gridColor = e.target.value;
    draw();
});

// Viewport / Pan & Zoom
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let startDragX = 0;
let startDragY = 0;

const zoomLabel = document.getElementById('zoomLabel');
document.getElementById('resetZoomBtn').addEventListener('click', resetView);

// Background Image
let bgImage = null;

imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                bgImage = img;
                // Auto-set resolution to image resolution
                resWidthInput.value = img.width;
                resHeightInput.value = img.height;
                resetView(); // Center the new image
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    }
});

resWidthInput.addEventListener('change', draw);
resHeightInput.addEventListener('change', draw);
squareColorInput.addEventListener('input', draw);
bgColorInput.addEventListener('input', draw);

// Random Map for stable regeneration during slider movement
let randomMap = [];
let customMap = Array(500).fill().map(() => Array(500).fill(null));

function generateRandomMap() {
    randomMap = [];
    for (let i = 0; i < 500; i++) {
        const row = [];
        for (let j = 0; j < 500; j++) {
            row.push(Math.random());
        }
        randomMap.push(row);
    }
}
generateRandomMap(); // Init

function getRes() {
    return {
        w: parseInt(resWidthInput.value) || 1080,
        h: parseInt(resHeightInput.value) || 1350
    };
}

function resetView() {
    const res = getRes();
    const container = document.getElementById('canvas-container');
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    
    // Fit canvas in view with some padding
    const scaleX = (cw - 40) / res.w;
    const scaleY = (ch - 40) / res.h;
    scale = Math.min(scaleX, scaleY);
    
    offsetX = (cw - res.w * scale) / 2;
    offsetY = (ch - res.h * scale) / 2;
    
    updateZoomLabel();
    draw();
}

function updateZoomLabel() {
    zoomLabel.innerText = Math.round(scale * 100) + '%';
}

function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    draw();
}

window.addEventListener('resize', resizeCanvas);
// Call once on load
setTimeout(() => {
    resizeCanvas();
    resetView();
}, 100);

// Interaction
let isBrushing = false;

function handleBrush(e) {
    if (!isBrushing) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const canvasX = (mouseX - offsetX) / scale;
    const canvasY = (mouseY - offsetY) / scale;
    
    const { margin, gridSize, brushSize } = state;
    
    const centerCol = Math.floor((canvasX - margin) / gridSize);
    const centerRow = Math.floor((canvasY - margin) / gridSize);
    
    const radius = Math.floor(brushSize / 2); // Using radius
    const radiusSquared = radius * radius;
    let modified = false;
    
    const val = state.brushMode === 'paint' ? 1 : 0;
    
    for (let r = -radius; r <= radius; r++) {
        for (let c = -radius; c <= radius; c++) {
            if (radius === 0 || r*r + c*c <= radiusSquared * 1.5) { // 1.5 for slight smoothing
                const targetCol = centerCol + c;
                const targetRow = centerRow + r;
                
                if (targetCol >= 0 && targetCol < 500 && targetRow >= 0 && targetRow < 500) {
                    if (customMap[targetCol][targetRow] !== val) {
                        customMap[targetCol][targetRow] = val;
                        modified = true;
                    }
                }
            }
        }
    }
    
    if (modified) draw();
}

canvas.addEventListener('mousedown', (e) => {
    if (e.shiftKey) {
        isBrushing = true;
        handleBrush(e);
    } else {
        isDragging = true;
        startDragX = e.clientX - offsetX;
        startDragY = e.clientY - offsetY;
    }
});

window.addEventListener('mousemove', (e) => {
    if (isBrushing) {
        handleBrush(e);
    } else if (isDragging) {
        offsetX = e.clientX - startDragX;
        offsetY = e.clientY - startDragY;
        draw();
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    isBrushing = false;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    
    const mouseX = e.clientX - canvas.getBoundingClientRect().left;
    const mouseY = e.clientY - canvas.getBoundingClientRect().top;
    
    const newScale = Math.max(0.05, Math.min(scale * Math.exp(delta), 10));
    
    // Adjust offset to zoom towards mouse
    offsetX = mouseX - (mouseX - offsetX) * (newScale / scale);
    offsetY = mouseY - (mouseY - offsetY) * (newScale / scale);
    scale = newScale;
    
    updateZoomLabel();
    draw();
}, { passive: false });


// Drawing Logic
function drawToContext(context, isExport = false) {
    const res = getRes();
    
    if (!isExport) {
        // Clear viewport
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background for viewport (checkerboard or dark)
        context.fillStyle = '#111';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.save();
        context.translate(offsetX, offsetY);
        context.scale(scale, scale);
    }

    // Clip to resolution
    context.beginPath();
    context.rect(0, 0, res.w, res.h);
    context.clip();

    // Draw solid BG color (if no image, or behind image) - ONLY if not exporting
    if (!isExport) {
        context.fillStyle = bgColorInput.value;
        context.fillRect(0, 0, res.w, res.h);
    }

    if (bgImage && !isExport) {
        // Draw image covering the canvas (object-fit: cover logic can be added, for now simple stretch or draw top-left)
        // Let's do object-fit cover
        const imgRatio = bgImage.width / bgImage.height;
        const canvasRatio = res.w / res.h;
        let drawW = res.w;
        let drawH = res.h;
        let drawX = 0;
        let drawY = 0;

        if (imgRatio > canvasRatio) {
            drawW = res.h * imgRatio;
            drawX = (res.w - drawW) / 2;
        } else {
            drawH = res.w / imgRatio;
            drawY = (res.h - drawH) / 2;
        }

        context.drawImage(bgImage, drawX, drawY, drawW, drawH);
    }

    // Draw Grid / Squares
    const { margin, gridSize, squareSize, density, outlineMode, lineWidth, showGrid, exportGrid, gridColor, gridOpacity } = state;
    
    if (outlineMode) {
        context.strokeStyle = squareColorInput.value;
        context.lineWidth = lineWidth;
    } else {
        context.fillStyle = squareColorInput.value;
    }
    
    const startX = margin;
    const startY = margin;
    const maxSquareX = res.w - margin - gridSize;
    const maxSquareY = res.h - margin - gridSize;
    
    
    const isCellFilled = (c, r) => {
        if (c < 0 || c >= 500 || r < 0 || r >= 500) return false;
        const safeCol = c % 500;
        const safeRow = r % 500;
        const customVal = customMap[safeCol][safeRow];
        if (customVal === 1) return true;
        if (customVal === 0) return false;
        return randomMap[safeCol][safeRow] < density / 100;
    };

    let targetCtx = context;
    let offCanvas = null;

    if (state.liquidMode) {
        offCanvas = document.createElement('canvas');
        offCanvas.width = res.w;
        offCanvas.height = res.h;
        targetCtx = offCanvas.getContext('2d');
        
        const liquidBlur = document.getElementById('liquidBlur');
        if (liquidBlur) liquidBlur.setAttribute('stdDeviation', state.liquidRadius);
        
        const liquidFlood = document.getElementById('liquidFlood');
        if (liquidFlood) liquidFlood.setAttribute('flood-color', squareColorInput.value);
    } else {
        targetCtx.fillStyle = squareColorInput.value;
        if (outlineMode) {
            targetCtx.strokeStyle = squareColorInput.value;
            targetCtx.lineWidth = lineWidth;
        }
    }

    if (state.liquidMode) {
        targetCtx.fillStyle = squareColorInput.value;
    }

    let col = 0;
    for (let x = startX; x <= maxSquareX + 0.1; x += gridSize) {
        let row = 0;
        for (let y = startY; y <= maxSquareY + 0.1; y += gridSize) {
            if (isCellFilled(col, row)) {
                let sqX = x + (gridSize - squareSize) / 2;
                let sqY = y + (gridSize - squareSize) / 2;
                
                if (outlineMode && !state.liquidMode) {
                    targetCtx.strokeRect(sqX, sqY, squareSize, squareSize);
                } else {
                    targetCtx.fillRect(sqX, sqY, squareSize, squareSize);
                }
            }
            row++;
        }
        col++;
    }

    if (state.liquidMode && offCanvas) {
        context.save();
        context.filter = 'url(#liquidFilter)';
        context.drawImage(offCanvas, 0, 0);
        context.restore();
    }

    // Optional grid visualization (drawn after shapes so it stays on top)
    if (showGrid && (!isExport || exportGrid)) {
        context.save();
        context.strokeStyle = gridColor;
        context.globalAlpha = gridOpacity / 100;
        context.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = startX; x <= res.w - margin + 0.1; x += gridSize) {
            context.beginPath();
            context.moveTo(x, startY);
            context.lineTo(x, res.h - margin);
            context.stroke();
        }
        
        // Draw horizontal lines
        for (let y = startY; y <= res.h - margin + 0.1; y += gridSize) {
            context.beginPath();
            context.moveTo(startX, y);
            context.lineTo(res.w - margin, y);
            context.stroke();
        }
        context.restore();
    }

    if (!isExport) {
        // Draw border around the canvas area
        context.strokeStyle = '#555';
        context.lineWidth = 1 / scale;
        context.strokeRect(0, 0, res.w, res.h);
        context.restore();
    }
}

function draw() {
    drawToContext(ctx, false);
}

// Exports
document.getElementById('exportPngBtn').addEventListener('click', () => {
    const res = getRes();
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = res.w;
    exportCanvas.height = res.h;
    const eCtx = exportCanvas.getContext('2d');
    
    drawToContext(eCtx, true);
    
    const link = document.createElement('a');
    link.download = 'wanp_squares.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
});

document.getElementById('exportSvgBtn').addEventListener('click', () => {
    const res = getRes();
    const { margin, gridSize, squareSize, density, outlineMode, lineWidth, showGrid, exportGrid, gridColor, gridOpacity } = state;
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${res.w}" height="${res.h}" viewBox="0 0 ${res.w} ${res.h}">`;
    
    if (state.liquidMode) {
        svg += `<defs>
            <filter id="liquidFilterExport">
                <feGaussianBlur in="SourceGraphic" stdDeviation="${state.liquidRadius}" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 18 -7" result="mask" />
                <feFlood flood-color="${squareColorInput.value}" result="solidColor" />
                <feComposite in="solidColor" in2="mask" operator="in" />
            </filter>
        </defs>`;
    }
    
    // BG (Removido para exportar com fundo transparente)
    // svg += `<rect width="${res.w}" height="${res.h}" fill="${bgColorInput.value}" />`;

    const startX = margin;
    const startY = margin;
    const maxSquareX = res.w - margin - gridSize;
    const maxSquareY = res.h - margin - gridSize;

    // Grid
    if (showGrid && exportGrid) {
        svg += `<g stroke="${gridColor}" stroke-opacity="${gridOpacity / 100}" stroke-width="1">`;
        for (let x = startX; x <= res.w - margin + 0.1; x += gridSize) {
            svg += `<line x1="${x}" y1="${startY}" x2="${x}" y2="${res.h - margin}" />`;
        }
        for (let y = startY; y <= res.h - margin + 0.1; y += gridSize) {
            svg += `<line x1="${startX}" y1="${y}" x2="${res.w - margin}" y2="${y}" />`;
        }
        svg += `</g>`;
    }

    // Squares
    const sqColor = squareColorInput.value;
    
    const isCellFilled = (c, r) => {
        if (c < 0 || c >= 500 || r < 0 || r >= 500) return false;
        const safeCol = c % 500;
        const safeRow = r % 500;
        const customVal = customMap[safeCol][safeRow];
        if (customVal === 1) return true;
        if (customVal === 0) return false;
        return randomMap[safeCol][safeRow] < density / 100;
    };
    
    if (state.liquidMode) {
        svg += `<g filter="url(#liquidFilterExport)">`;
    }
    
    let col = 0;
    for (let x = startX; x <= maxSquareX + 0.1; x += gridSize) {
        let row = 0;
        for (let y = startY; y <= maxSquareY + 0.1; y += gridSize) {
            
            if (isCellFilled(col, row)) {
                let sqX = x + (gridSize - squareSize) / 2;
                let sqY = y + (gridSize - squareSize) / 2;
                if (outlineMode && !state.liquidMode) {
                    svg += `<rect x="${sqX}" y="${sqY}" width="${squareSize}" height="${squareSize}" fill="none" stroke="${sqColor}" stroke-width="${lineWidth}" />`;
                } else {
                    svg += `<rect x="${sqX}" y="${sqY}" width="${squareSize}" height="${squareSize}" fill="${sqColor}" />`;
                }
            }
            row++;
        }
        col++;
    }
    
    if (state.liquidMode) {
        svg += `</g>`;
    }
    
    svg += `</svg>`;
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'wanp_squares.svg';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
});

// Swap colors
document.getElementById('swapColorsBtn').addEventListener('click', () => {
    const temp = bgColorInput.value;
    bgColorInput.value = squareColorInput.value;
    squareColorInput.value = temp;
    draw();
});

// Presets
const presetSelect = document.getElementById('presetSelect');
const savePresetBtn = document.getElementById('savePresetBtn');
const presetActions = document.getElementById('presetActions');
const renamePresetBtn = document.getElementById('renamePresetBtn');
const deletePresetBtn = document.getElementById('deletePresetBtn');

function loadPresets() {
    let presets = JSON.parse(localStorage.getItem('wanp_squares_presets') || '{}');
    presetSelect.innerHTML = '<option value="">-- Select Preset --</option>';
    for (let name in presets) {
        let opt = document.createElement('option');
        opt.value = name;
        opt.innerText = name;
        presetSelect.appendChild(opt);
    }
}
loadPresets();

savePresetBtn.addEventListener('click', () => {
    let name = prompt("Enter a name for this preset:");
    if (name) {
        let presets = JSON.parse(localStorage.getItem('wanp_squares_presets') || '{}');
        presets[name] = {
            resWidth: resWidthInput.value,
            resHeight: resHeightInput.value,
            squareColor: squareColorInput.value,
            bgColor: bgColorInput.value,
            gridSize: document.getElementById('gridSize').value,
            squareSize: document.getElementById('squareSize').value,
            margin: document.getElementById('margin').value,
            density: document.getElementById('density').value,
            brushSize: document.getElementById('brushSize').value,
            lineWidth: document.getElementById('lineWidth').value,
            gridOpacity: document.getElementById('gridOpacity').value,
            outlineMode: state.outlineMode,
            showGrid: state.showGrid,
            exportGrid: state.exportGrid,
            gridColor: state.gridColor
        };
        localStorage.setItem('wanp_squares_presets', JSON.stringify(presets));
        loadPresets();
        presetSelect.value = name;
        presetActions.style.display = 'flex';
    }
});

document.getElementById('resetPresetBtn').addEventListener('click', () => {
    if (presetSelect.value) {
        presetSelect.dispatchEvent(new Event('change'));
    } else {
        window.location.reload();
    }
});

presetSelect.addEventListener('change', () => {
    let name = presetSelect.value;
    if (!name) {
        presetActions.style.display = 'none';
        return;
    }
    
    presetActions.style.display = 'flex';
    let presets = JSON.parse(localStorage.getItem('wanp_squares_presets') || '{}');
    let p = presets[name];
    if (p) {
        resWidthInput.value = p.resWidth;
        resHeightInput.value = p.resHeight;
        squareColorInput.value = p.squareColor;
        bgColorInput.value = p.bgColor;
        
        document.getElementById('gridSize').value = p.gridSize;
        document.getElementById('gridSize_num').value = p.gridSize;
        state.gridSize = parseFloat(p.gridSize);
        
        document.getElementById('squareSize').value = p.squareSize;
        document.getElementById('squareSize_num').value = p.squareSize;
        state.squareSize = parseFloat(p.squareSize);
        
        document.getElementById('margin').value = p.margin;
        document.getElementById('margin_num').value = p.margin;
        state.margin = parseFloat(p.margin);
        
        document.getElementById('density').value = p.density;
        document.getElementById('density_num').value = p.density;
        state.density = parseFloat(p.density);
        
        if (p.brushSize) {
            document.getElementById('brushSize').value = p.brushSize;
            document.getElementById('brushSize_num').value = p.brushSize;
            state.brushSize = parseFloat(p.brushSize);
        }
        
        if (p.lineWidth) {
            document.getElementById('lineWidth').value = p.lineWidth;
            document.getElementById('lineWidth_num').value = p.lineWidth;
            state.lineWidth = parseFloat(p.lineWidth);
        }
        
        if (p.gridOpacity) {
            document.getElementById('gridOpacity').value = p.gridOpacity;
            document.getElementById('gridOpacity_num').value = p.gridOpacity;
            state.gridOpacity = parseFloat(p.gridOpacity);
        }
        
        if (p.gridColor) {
            gridColorInput.value = p.gridColor;
            state.gridColor = p.gridColor;
        }
        
        if (p.outlineMode !== undefined) {
            outlineModeCheckbox.checked = p.outlineMode;
            state.outlineMode = p.outlineMode;
            lineWidthGroup.style.display = state.outlineMode ? 'flex' : 'none';
        }
        
        if (p.showGrid !== undefined) {
            showGridCheckbox.checked = p.showGrid;
            state.showGrid = p.showGrid;
            gridOptionsGroup.style.display = state.showGrid ? 'flex' : 'none';
        }
        
        if (p.exportGrid !== undefined) {
            exportGridCheckbox.checked = p.exportGrid;
            state.exportGrid = p.exportGrid;
        }
        
        draw();
    }
});

renamePresetBtn.addEventListener('click', () => {
    let oldName = presetSelect.value;
    if (!oldName) return;
    let newName = prompt("Rename preset to:", oldName);
    if (newName && newName !== oldName) {
        let presets = JSON.parse(localStorage.getItem('wanp_squares_presets') || '{}');
        presets[newName] = presets[oldName];
        delete presets[oldName];
        localStorage.setItem('wanp_squares_presets', JSON.stringify(presets));
        loadPresets();
        presetSelect.value = newName;
    }
});

deletePresetBtn.addEventListener('click', () => {
    let name = presetSelect.value;
    if (!name) return;
    if (confirm(`Delete preset "${name}"?`)) {
        let presets = JSON.parse(localStorage.getItem('wanp_squares_presets') || '{}');
        delete presets[name];
        localStorage.setItem('wanp_squares_presets', JSON.stringify(presets));
        loadPresets();
        presetActions.style.display = 'none';
    }
});
