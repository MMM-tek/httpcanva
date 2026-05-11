const canvas = document.getElementById('canvas');
const itemsList = document.getElementById('items-list');
const searchInput = document.getElementById('search-input');
const propEditor = document.getElementById('editor');
const noSelection = document.getElementById('no-selection');
const customCssArea = document.getElementById('custom-css-area');
const liveStyles = document.getElementById('live-custom-css');
const canvasBgInput = document.getElementById('canvas-bg-input');
const previewBtn = document.getElementById('preview-mode-btn');

let selectedElement = null;
let isPreview = false;

// 1. LOAD ASSETS & DYNAMIC PREVIEWS
async function loadMenu() {
    try {
        const response = await fetch('items/items.json');
        const items = await response.json();
        renderMenu(items);
        
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            renderMenu(items.filter(i => i.name.toLowerCase().includes(term)));
        };
    } catch (e) {
        console.error("Error loading JSON. Use Live Server.", e);
    }
}

async function renderMenu(items) {
    itemsList.innerHTML = '';
    for (const item of items) {
        const res = await fetch(`items/item-${item.id}.json`);
        const config = await res.json();

        const container = document.createElement('div');
        container.className = 'item-container';
        container.draggable = true;
        container.dataset.json = `items/item-${item.id}.json`;

        const previewBox = document.createElement('div');
        previewBox.className = 'preview-box';
        
        // Mini preview logic
        let previewEl = document.createElement(config.tag);
        if (config.tag === 'img') previewEl.src = "https://placeholder.com";
        else if (config.tag === 'select') previewEl.innerHTML = "<option>Dropdown</option>";
        else previewEl.innerText = config.defaultText || 'Text';
        
        if (config.styles) Object.assign(previewEl.style, config.styles);
        previewBox.appendChild(previewEl);

        container.innerHTML = `<div class="item-label">${item.name}</div>`;
        container.appendChild(previewBox);
        container.ondragstart = (e) => e.dataTransfer.setData('configPath', container.dataset.json);
        itemsList.appendChild(container);
    }
}

// 2. CREATE ON CANVAS
canvas.ondragover = (e) => e.preventDefault();
canvas.ondrop = async (e) => {
    if (isPreview) return;
    e.preventDefault();
    const configPath = e.dataTransfer.getData('configPath');
    const response = await fetch(configPath);
    const config = await response.json();

    const el = document.createElement(config.tag);
    el.className = 'dropped';
    
    if (config.tag === 'select') {
        updateSelectOptions(el, "Option 1 / Option 2");
    } else if (config.tag === 'img') {
        el.src = "https://placeholder.com";
    } else {
        el.innerText = config.defaultText || '';
    }

    el.style.left = (e.clientX - canvas.offsetLeft) + 'px';
    el.style.top = (e.clientY - canvas.offsetTop) + 'px';
    el.style.width = config.styles?.width || "150px";
    el.style.zIndex = "1";
    el.style.position = "absolute";
    if (config.styles) Object.assign(el.style, config.styles);

    initSafeDrag(el);
    canvas.appendChild(el);
    selectElement(el);
};

// 3. SAFE DRAG (Independent for every object)
function initSafeDrag(el) {
    let isMoving = false;
    let offset = { x: 0, y: 0 };

    el.addEventListener('mousedown', (e) => {
        if (isPreview) return;
        e.stopPropagation();
        selectElement(el);
        
        isMoving = true;
        const rect = el.getBoundingClientRect();
        offset.x = e.clientX - rect.left;
        offset.y = e.clientY - rect.top;
        el.style.opacity = "0.7";
    });

    window.addEventListener('mousemove', (e) => {
        if (!isMoving) return;
        const canvasRect = canvas.getBoundingClientRect();
        el.style.left = (e.clientX - canvasRect.left - offset.x) + 'px';
        el.style.top = (e.clientY - canvasRect.top - offset.y) + 'px';
        updateInputs(el);
    });

    window.addEventListener('mouseup', () => {
        isMoving = false;
        el.style.opacity = "1";
    });
}

// 4. PROPERTIES & SMART DROPDOWN
function selectElement(el) {
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = el;
    el.classList.add('selected');
    propEditor.style.display = 'block';
    noSelection.style.display = 'none';
    updateInputs(el);
}

function updateInputs(el) {
    document.getElementById('prop-id').value = el.id || '';
    if (el.tagName === 'SELECT') {
        document.getElementById('prop-text').value = Array.from(el.options).map(o => o.text).join(' / ');
    } else {
        document.getElementById('prop-text').value = el.innerText || '';
    }
    document.getElementById('prop-w').value = el.offsetWidth;
    document.getElementById('prop-h').value = el.offsetHeight;
    document.getElementById('prop-z').value = el.style.zIndex;
}

function updateSelectOptions(el, textValue) {
    if (el.tagName !== 'SELECT') return;
    el.innerHTML = '';
    textValue.split('/').forEach(optText => {
        const opt = document.createElement('option');
        opt.innerText = optText.trim();
        el.appendChild(opt);
    });
}

document.getElementById('save-btn').onclick = () => {
    if (!selectedElement) return;
    const textVal = document.getElementById('prop-text').value;
    selectedElement.id = document.getElementById('prop-id').value;
    
    if (selectedElement.tagName === 'SELECT') {
        updateSelectOptions(selectedElement, textVal);
    } else if (selectedElement.tagName !== 'IMG') {
        selectedElement.innerText = textVal;
    }
    selectedElement.style.width = document.getElementById('prop-w').value + 'px';
    selectedElement.style.height = document.getElementById('prop-h').value + 'px';
    selectedElement.style.zIndex = document.getElementById('prop-z').value;
};

// 5. LIVE CSS & CANVAS BG
canvasBgInput.oninput = (e) => canvas.style.backgroundColor = e.target.value;
customCssArea.oninput = (e) => liveStyles.innerHTML = e.target.value;

// 6. PREVIEW MODE
previewBtn.onclick = function() {
    isPreview = !isPreview;
    this.innerText = isPreview ? "Preview Mode: ON" : "Preview Mode: OFF";
    this.style.background = isPreview ? "#dc3545" : "#6f42c1";
    
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = null;
    propEditor.style.display = 'none';
    noSelection.style.display = 'block';

    canvas.querySelectorAll('.dropped').forEach(el => {
        el.style.cursor = isPreview ? "default" : "move";
        el.style.outline = isPreview ? "none" : "1px dashed #ccc";
    });
};

// 7. GLOBAL CONTROLS (DELETE & EXPORT)
window.onkeydown = (e) => {
    if ((e.key === "Delete" || e.key === "Backspace") && selectedElement && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        selectedElement.remove();
        propEditor.style.display = 'none';
        noSelection.style.display = 'block';
    }
};

document.getElementById('export-btn').onclick = () => {
    const clone = canvas.cloneNode(true);
    clone.querySelectorAll('.dropped').forEach(el => {
        el.classList.remove('dropped', 'selected');
        el.style.outline = "none";
    });
    const finalHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { margin: 0; background: ${canvas.style.backgroundColor}; overflow: hidden; }
        .canvas { position: relative; width: 100vw; height: 100vh; }
        ${customCssArea.value}
    </style>
</head>
<body>
    <div class="canvas">${clone.innerHTML}</div>
</body>
</html>`;
    const blob = new Blob([finalHtml], {type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'index.html';
    a.click();
};

loadMenu();
