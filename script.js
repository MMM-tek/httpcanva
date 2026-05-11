const canvas = document.getElementById('canvas');
const itemsList = document.getElementById('items-list');
const searchInput = document.getElementById('search-input');
const propEditor = document.getElementById('editor');
const noSelection = document.getElementById('no-selection');
let selectedElement = null;

// 1. LOAD ASSETS
async function loadMenu() {
    try {
        const response = await fetch('items/items.json');
        const items = await response.json();
        renderMenu(items);
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            renderMenu(items.filter(i => i.name.toLowerCase().includes(term)));
        };
    } catch (e) { console.error("Error: Use Live Server to load JSON.", e); }
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

        // Preview box
        const previewBox = document.createElement('div');
        previewBox.className = 'preview-box';
        
        let previewEl;
        if (config.tag === 'select') {
            previewEl = document.createElement('div');
            previewEl.innerText = "Dropdown ▾";
            previewEl.style.border = "1px solid #ccc";
            previewEl.style.padding = "5px";
        } else if (config.tag === 'img') {
            previewEl = document.createElement('img');
            previewEl.src = "https://placeholder.com";
        } else {
            previewEl = document.createElement(config.tag);
            previewEl.innerText = config.defaultText || 'Text';
        }

        if(config.styles) Object.assign(previewEl.style, config.styles);
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
    e.preventDefault();
    const configPath = e.dataTransfer.getData('configPath');
    const response = await fetch(configPath);
    const config = await response.json();

    const el = document.createElement(config.tag);
    el.className = 'dropped';
    
    // Configuración específica por tipo
    if (config.tag === 'select' && config.options) {
        config.options.forEach(optText => {
            const opt = document.createElement('option');
            opt.value = optText;
            opt.innerText = optText;
            el.appendChild(opt);
        });
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

    makeMovable(el);
    canvas.appendChild(el);
    selectElement(el);
};

function makeMovable(el) {
    let isMoving = false;
    let offset = { x: 0, y: 0 };

    el.onmousedown = (e) => {
        e.stopPropagation();
        selectElement(el);
        isMoving = true;
        offset.x = e.clientX - el.offsetLeft;
        offset.y = e.clientY - el.offsetTop;
    };

    window.onmousemove = (e) => {
        if (!isMoving) return;
        el.style.left = (e.clientX - offset.x) + 'px';
        el.style.top = (e.clientY - offset.y) + 'px';
        updateInputs(el);
    };

    window.onmouseup = () => isMoving = false;
}

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
    document.getElementById('prop-text').value = el.innerText || '';
    document.getElementById('prop-w').value = el.offsetWidth;
    document.getElementById('prop-h').value = el.offsetHeight;
    document.getElementById('prop-z').value = el.style.zIndex;
}

document.getElementById('save-btn').onclick = () => {
    if (!selectedElement) return;
    selectedElement.id = document.getElementById('prop-id').value;
    if (selectedElement.tagName !== 'IMG' && selectedElement.tagName !== 'SELECT') {
        selectedElement.innerText = document.getElementById('prop-text').value;
    }
    selectedElement.style.width = document.getElementById('prop-w').value + 'px';
    selectedElement.style.height = document.getElementById('prop-h').value + 'px';
    selectedElement.style.zIndex = document.getElementById('prop-z').value;
};

// EXPORT & DELETE
window.onkeydown = (e) => {
    if ((e.key === "Delete" || e.key === "Backspace") && selectedElement && document.activeElement.tagName !== 'INPUT') {
        selectedElement.remove();
        propEditor.style.display = 'none';
        noSelection.style.display = 'block';
    }
};

document.getElementById('export-btn').onclick = () => {
    const clone = canvas.cloneNode(true);
    clone.querySelectorAll('.dropped').forEach(el => el.classList.remove('dropped', 'selected'));
    const html = `<!DOCTYPE html><html><head><style>body{margin:0;overflow:hidden;position:relative;}</style></head><body>${clone.innerHTML}</body></html>`;
    const blob = new Blob([html], {type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'index.html';
    a.click();
};

loadMenu();
