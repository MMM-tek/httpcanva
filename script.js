const canvas = document.getElementById('canvas');
const itemsList = document.getElementById('items-list');
const searchInput = document.getElementById('search-input');
const propEditor = document.getElementById('editor');
const noSelection = document.getElementById('no-selection');
let selectedElement = null;
let isPreview = false;

// 1. LOAD ASSETS & PREVIEWS
async function loadMenu() {
    try {
        const response = await fetch('items/items.json');
        const items = await response.json();
        renderMenu(items);
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            renderMenu(items.filter(i => i.name.toLowerCase().includes(term)));
        };
    } catch (e) { console.error("Run a local server to load JSON files.", e); }
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
        previewBox.innerHTML = config.tag === 'select' ? 'Dropdown ▾' : (config.tag === 'img' ? 'Image' : config.defaultText);
        
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
        const opt = document.createElement('option');
        opt.innerText = "Default Option";
        el.appendChild(opt);
    } else if (config.tag === 'img') {
        el.src = "https://placeholder.com";
    } else {
        el.innerText = config.defaultText || '';
    }

    el.style.left = (e.clientX - canvas.offsetLeft) + 'px';
    el.style.top = (e.clientY - canvas.offsetTop) + 'px';
    el.style.width = config.styles?.width || "150px";
    el.style.zIndex = "1";
    if(config.styles) Object.assign(el.style, config.styles);

    initSafeDrag(el);
    canvas.appendChild(el);
    selectElement(el);
};

// 3. SAFE DRAG SYSTEM (Mover seguro)
function initSafeDrag(el) {
    let isMoving = false;
    let startX, startY, initialX, initialY;

    el.addEventListener('mousedown', (e) => {
        if (isPreview) return;
        e.stopPropagation();
        selectElement(el);
        isMoving = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = parseInt(el.style.left);
        initialY = parseInt(el.style.top);
        el.style.opacity = "0.7";
    });

    window.addEventListener('mousemove', (e) => {
        if (!isMoving) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        el.style.left = (initialX + dx) + 'px';
        el.style.top = (initialY + dy) + 'px';
        updateInputs(el);
    });

    window.addEventListener('mouseup', () => {
        isMoving = false;
        el.style.opacity = "1";
    });
}

// 4. SMART SELECT OPTIONS (Separador por /)
function updateSelectOptions(el, textValue) {
    if (el.tagName !== 'SELECT') return;
    el.innerHTML = ''; // Clear current
    const options = textValue.split('/');
    options.forEach(optText => {
        const opt = document.createElement('option');
        opt.value = optText.trim();
        opt.innerText = optText.trim();
        el.appendChild(opt);
    });
}

// 5. PROPERTIES PANEL
function selectElement(el) {
    if (isPreview) return;
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = el;
    el.classList.add('selected');
    propEditor.style.display = 'block';
    noSelection.style.display = 'none';
    updateInputs(el);
}

function updateInputs(el) {
    document.getElementById('prop-id').value = el.id || '';
    // Para el select, mostramos las opciones separadas por / en el campo de texto
    if (el.tagName === 'SELECT') {
        const currentOpts = Array.from(el.options).map(o => o.text).join('/');
        document.getElementById('prop-text').value = currentOpts;
    } else {
        document.getElementById('prop-text').value = el.innerText || '';
    }
    document.getElementById('prop-w').value = el.offsetWidth;
    document.getElementById('prop-h').value = el.offsetHeight;
    document.getElementById('prop-z').value = el.style.zIndex;
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

// 6. PREVIEW MODE
document.getElementById('preview-mode-btn').onclick = function() {
    isPreview = !isPreview;
    this.innerText = isPreview ? "Preview Mode: ON" : "Preview Mode: OFF";
    this.style.background = isPreview ? "#dc3545" : "#6f42c1";
    
    // Deselect
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = null;
    propEditor.style.display = 'none';
    noSelection.style.display = 'block';

    // Disable editor visuals
    const elements = canvas.querySelectorAll('.dropped');
    elements.forEach(el => {
        el.style.cursor = isPreview ? "default" : "move";
        el.style.outline = isPreview ? "none" : "1px dashed #ccc";
    });
};

// Start Engine
loadMenu();
