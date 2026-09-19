const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
canvas.width = window.innerWidth - 320;
canvas.height = window.innerHeight;

let particlesArray = [];
let image = new Image();
let hasImage = false;

// UI Controls
const resolutionInput = document.getElementById('resolution');
const spacingInput = document.getElementById('spacing');
const particleSizeInput = document.getElementById('particleSize');
const styleModeInput = document.getElementById('styleMode');
const imageUpload = document.getElementById('imageUpload');
const halftoneModeInput = document.getElementById('halftoneMode');
const bgColorInput = document.getElementById('bgColor');
const fgColorInput = document.getElementById('fgColor');
const swapColorsBtn = document.getElementById('swapColorsBtn');

// Preset Controls
const presetSelect = document.getElementById('presetSelect');
const savePresetBtn = document.getElementById('savePresetBtn');
const presetActions = document.getElementById('presetActions');
const renamePresetBtn = document.getElementById('renamePresetBtn');
const deletePresetBtn = document.getElementById('deletePresetBtn');

// Export Controls
const exportPngBtn = document.getElementById('exportPngBtn');
const exportSvgBtn = document.getElementById('exportSvgBtn');

// Zoom UI Controls
const zoomLabel = document.getElementById('zoomLabel');
const resetZoomBtn = document.getElementById('resetZoomBtn');

// Sync number inputs and sliders
function syncInputs(idRange, idNum) {
    const range = document.getElementById(idRange);
    const num = document.getElementById(idNum);
    range.addEventListener('input', () => { num.value = range.value; });
    num.addEventListener('input', () => { range.value = num.value; });
}
syncInputs('resolution', 'resolution_num');
syncInputs('spacing', 'spacing_num');
syncInputs('particleSize', 'particleSize_num');

// Viewport / Zoom / Pan
let vScale = 1;
let vPanX = 0;
let vPanY = 0;
let isDragging = false;
let startX, startY;

function updateZoomLabel() {
    zoomLabel.innerText = Math.round(vScale * 100) + '%';
}

resetZoomBtn.addEventListener('click', () => {
    vScale = 1;
    vPanX = 0;
    vPanY = 0;
    updateZoomLabel();
});

// Set button hover effect purely via JS since it's inline in HTML to keep CSS clean
resetZoomBtn.addEventListener('mouseenter', () => { resetZoomBtn.style.background = '#ffffff33'; });
resetZoomBtn.addEventListener('mouseleave', () => { resetZoomBtn.style.background = 'transparent'; });

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomAmount = 0.15;
    const direction = e.deltaY > 0 ? -1 : 1;
    const oldScale = vScale;
    
    vScale += direction * zoomAmount * vScale;
    vScale = Math.max(0.1, Math.min(vScale, 40)); 

    const mouseX = e.offsetX;
    const mouseY = e.offsetY;
    vPanX = mouseX - (mouseX - vPanX) * (vScale / oldScale);
    vPanY = mouseY - (mouseY - vPanY) * (vScale / oldScale);
    
    updateZoomLabel();
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { 
        isDragging = true;
        startX = e.offsetX - vPanX;
        startY = e.offsetY - vPanY;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        vPanX = e.offsetX - startX;
        vPanY = e.offsetY - startY;
    }
});

canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });

class Particle {
    constructor(x, y, brightness) {
        this.x = x;
        this.y = y;
        this.brightness = brightness; 
    }

    draw(context = ctx) {
        let baseSize = parseFloat(particleSizeInput.value);
        let sMode = styleModeInput.value;
        let hMode = halftoneModeInput.value;
        
        context.fillStyle = fgColorInput.value;
        context.strokeStyle = context.fillStyle;
        
        let dynamicSize = baseSize;
        if (hMode === 'dark') {
            dynamicSize = baseSize * ((255 - this.brightness) / 255);
        } else if (hMode === 'light') {
            dynamicSize = baseSize * (this.brightness / 255);
        }

        if (dynamicSize < 0.2) return;

        context.beginPath();
        if (sMode === 'dots') {
            context.arc(this.x, this.y, dynamicSize, 0, Math.PI * 2);
            context.fill();
        } else if (sMode === 'squares') {
            context.fillRect(this.x - dynamicSize, this.y - dynamicSize, dynamicSize * 2, dynamicSize * 2);
        } else if (sMode === 'lines') {
            let height = dynamicSize * 4;
            context.moveTo(this.x, this.y - height / 2);
            context.lineTo(this.x, this.y + height / 2);
            context.lineWidth = Math.max(0.5, baseSize * 0.4); 
            context.stroke();
        } else if (sMode === 'ascii') {
            context.font = `${dynamicSize * 2.5}px monospace`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            const chars = '@%#*+=-:. ';
            let charIndex;
            if (hMode === 'dark') {
                charIndex = Math.floor((this.brightness / 255) * (chars.length - 1));
            } else {
                charIndex = Math.floor(((255 - this.brightness) / 255) * (chars.length - 1));
            }
            
            if (charIndex < 0) charIndex = 0;
            if (charIndex >= chars.length) charIndex = chars.length - 1;
            
            context.fillText(chars[charIndex], this.x, this.y);
        }
    }
}

function init() {
    particlesArray = [];
    vScale = 1;
    vPanX = 0;
    vPanY = 0;
    updateZoomLabel();
    
    if (!hasImage) return;

    let res = parseFloat(resolutionInput.value);
    let spacingVal = parseFloat(spacingInput.value);
    
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    
    const MAX_DIM = 1500; 
    let imgScale = 1;
    if (image.width > MAX_DIM || image.height > MAX_DIM) {
        imgScale = Math.min(MAX_DIM / image.width, MAX_DIM / image.height);
    }
    
    offCanvas.width = image.width * imgScale;
    offCanvas.height = image.height * imgScale;
    
    offCtx.fillStyle = '#ffffff'; 
    offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
    offCtx.drawImage(image, 0, 0, offCanvas.width, offCanvas.height);
    const pixels = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    
    let displayScale = Math.min((canvas.width * 0.8) / offCanvas.width, (canvas.height * 0.8) / offCanvas.height);
    
    let gridW = offCanvas.width * displayScale * spacingVal;
    let gridH = offCanvas.height * displayScale * spacingVal;
    let offsetX = (canvas.width - gridW) / 2;
    let offsetY = (canvas.height - gridH) / 2;

    for (let y = 0; y < offCanvas.height; y += res) {
        for (let x = 0; x < offCanvas.width; x += res) {
            let px = Math.floor(x);
            let py = Math.floor(y);
            if(px >= offCanvas.width) px = offCanvas.width - 1;
            if(py >= offCanvas.height) py = offCanvas.height - 1;
            
            let index = (py * pixels.width + px) * 4;
            let r = pixels.data[index];
            let g = pixels.data[index + 1];
            let b = pixels.data[index + 2];
            
            let brightness = (r + g + b) / 3;
            
            let finalX = offsetX + (x * displayScale * spacingVal);
            let finalY = offsetY + (y * displayScale * spacingVal);
            particlesArray.push(new Particle(finalX, finalY, brightness));
        }
    }
}

function render() {
    requestAnimationFrame(render);
    
    ctx.fillStyle = bgColorInput.value;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!hasImage) {
        ctx.fillStyle = fgColorInput.value;
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NENHUMA IMAGEM CARREGADA', canvas.width/2, canvas.height/2);
        return;
    }

    ctx.save();
    ctx.translate(vPanX, vPanY);
    ctx.scale(vScale, vScale);

    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].draw();
    }
    
    ctx.restore();
}

requestAnimationFrame(render);

window.addEventListener('resize', function() {
    canvas.width = window.innerWidth - 320;
    canvas.height = window.innerHeight;
    init();
});

resolutionInput.addEventListener('change', init);
document.getElementById('resolution_num').addEventListener('change', init);
spacingInput.addEventListener('change', init);
document.getElementById('spacing_num').addEventListener('change', init);

bgColorInput.addEventListener('change', () => { document.getElementById('canvas-container').style.background = bgColorInput.value; });

swapColorsBtn.addEventListener('click', () => {
    let temp = bgColorInput.value;
    bgColorInput.value = fgColorInput.value;
    fgColorInput.value = temp;
    document.getElementById('canvas-container').style.background = bgColorInput.value;
});

imageUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            image = new Image();
            image.onload = function() {
                hasImage = true;
                init();
            }
            image.src = event.target.result;
        }
        reader.readAsDataURL(file);
    }
});

// PRESETS LOGIC
function loadPresets() {
    let presets = JSON.parse(localStorage.getItem('wanp_presets') || '{}');
    presetSelect.innerHTML = '<option value="">-- Select Preset --</option>';
    for (let name in presets) {
        let opt = document.createElement('option');
        opt.value = name;
        opt.innerText = name;
        presetSelect.appendChild(opt);
    }
}

savePresetBtn.addEventListener('click', () => {
    let name = prompt("Enter a name for this preset:");
    if (!name) return;
    
    let presets = JSON.parse(localStorage.getItem('wanp_presets') || '{}');
    presets[name] = {
        bgColor: bgColorInput.value,
        fgColor: fgColorInput.value,
        resolution: resolutionInput.value,
        spacing: spacingInput.value,
        halftoneMode: halftoneModeInput.value,
        particleSize: particleSizeInput.value,
        styleMode: styleModeInput.value
    };
    
    localStorage.setItem('wanp_presets', JSON.stringify(presets));
    loadPresets();
    presetSelect.value = name;
    presetActions.style.display = 'flex';
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
    let presets = JSON.parse(localStorage.getItem('wanp_presets') || '{}');
    let p = presets[name];
    if (p) {
        bgColorInput.value = p.bgColor;
        fgColorInput.value = p.fgColor;
        
        resolutionInput.value = p.resolution;
        document.getElementById('resolution_num').value = p.resolution;
        
        spacingInput.value = p.spacing || 1;
        document.getElementById('spacing_num').value = p.spacing || 1;
        
        halftoneModeInput.value = p.halftoneMode;
        
        particleSizeInput.value = p.particleSize;
        document.getElementById('particleSize_num').value = p.particleSize;
        
        styleModeInput.value = p.styleMode;
        
        document.getElementById('canvas-container').style.background = p.bgColor;
        init();
    }
});

renamePresetBtn.addEventListener('click', () => {
    let oldName = presetSelect.value;
    if (!oldName) return;
    let newName = prompt("Rename preset to:", oldName);
    if (newName && newName !== oldName) {
        let presets = JSON.parse(localStorage.getItem('wanp_presets') || '{}');
        presets[newName] = presets[oldName];
        delete presets[oldName];
        localStorage.setItem('wanp_presets', JSON.stringify(presets));
        loadPresets();
        presetSelect.value = newName;
    }
});

deletePresetBtn.addEventListener('click', () => {
    let name = presetSelect.value;
    if (!name) return;
    if (confirm(`Delete preset "${name}"?`)) {
        let presets = JSON.parse(localStorage.getItem('wanp_presets') || '{}');
        delete presets[name];
        localStorage.setItem('wanp_presets', JSON.stringify(presets));
        loadPresets();
        presetActions.style.display = 'none';
    }
});

loadPresets();

// EXPORT SVG
exportSvgBtn.addEventListener('click', function() {
    if(!hasImage) return alert("Please upload an image first.");
    let sMode = styleModeInput.value;
    let baseSize = parseFloat(particleSizeInput.value);
    let hMode = halftoneModeInput.value;
    let fgColor = fgColorInput.value;
    let bgColor = bgColorInput.value;
    
    let vBoxX = -vPanX / vScale;
    let vBoxY = -vPanY / vScale;
    let vBoxW = canvas.width / vScale;
    let vBoxH = canvas.height / vScale;
    
    let svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vBoxX} ${vBoxY} ${vBoxW} ${vBoxH}">\n`;
    
    for (let p of particlesArray) {
        let dynamicSize = baseSize;
        if (hMode === 'dark') {
            dynamicSize = baseSize * ((255 - p.brightness) / 255);
        } else if (hMode === 'light') {
            dynamicSize = baseSize * (p.brightness / 255);
        }

        if (dynamicSize < 0.2) continue;

        if (sMode === 'dots') {
            svgString += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${dynamicSize.toFixed(2)}" fill="${fgColor}" />\n`;
        } else if (sMode === 'squares') {
            let s = dynamicSize * 2;
            let sx = p.x - dynamicSize;
            let sy = p.y - dynamicSize;
            svgString += `<rect x="${sx.toFixed(2)}" y="${sy.toFixed(2)}" width="${s.toFixed(2)}" height="${s.toFixed(2)}" fill="${fgColor}" />\n`;
        } else if (sMode === 'lines') {
            let h = dynamicSize * 4;
            let y1 = p.y - h/2;
            let y2 = p.y + h/2;
            svgString += `<line x1="${p.x.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${p.x.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${fgColor}" stroke-width="${Math.max(0.5, baseSize * 0.4).toFixed(2)}" />\n`;
        } else if (sMode === 'ascii') {
            const chars = '@%#*+=-:. ';
            let charIndex;
            if (hMode === 'dark') {
                charIndex = Math.floor((p.brightness / 255) * (chars.length - 1));
            } else {
                charIndex = Math.floor(((255 - p.brightness) / 255) * (chars.length - 1));
            }
            if (charIndex < 0) charIndex = 0;
            if (charIndex >= chars.length) charIndex = chars.length - 1;

            svgString += `<text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" fill="${fgColor}" font-family="monospace" font-size="${(dynamicSize * 2.5).toFixed(2)}px" text-anchor="middle" dominant-baseline="middle">${chars[charIndex]}</text>\n`;
        }
    }
    svgString += `</svg>`;
    
    const blob = new Blob([svgString], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wanp-gen-${Date.now()}.svg`;
    link.click();
});

// EXPORT PNG
exportPngBtn.addEventListener('click', function() {
    if(!hasImage) return alert("Please upload an image first.");

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.save();
    tempCtx.translate(vPanX, vPanY);
    tempCtx.scale(vScale, vScale);

    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].draw(tempCtx);
    }
    
    tempCtx.restore();

    const link = document.createElement('a');
    link.download = `wanp-gen-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
});
