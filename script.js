const canvas = document.getElementById('canvas');
const itemsList = document.getElementById('items-list');
const searchInput = document.getElementById('search-input');
const propEditor = document.getElementById('editor');
const noSelection = document.getElementById('no-selection');
let selectedElement = null;

// 1. LOAD MENU WITH VISUAL PREVIEWS
async function loadMenu() {
    try {
        const response = await fetch('items/items.json');
        const items = await response.json();
        renderMenu(items);
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            renderMenu(items.filter(i => i.name.toLowerCase().includes(term)));
        };
    } catch (e) { console.error("JSON Error: Use a local server.", e); }
}

async function renderMenu(items) {
    itemsList.innerHTML = '';
    for (const item of items) {
        const configPath = `items/item-${item.id}.json`;
        const res = await fetch(configPath);
        const config = await res.json();

        const container = document.createElement('div');
        container.className = 'item-container';
        container.draggable = true;
        container.dataset.json = configPath;

        // Visual Preview
        const previewBox = document.createElement('div');
        previewBox.className = 'preview-box';
        const previewEl = document.createElement(config.tag);
        if(config.tag === 'img') previewEl.src = "https://placeholder.com";
        else previewEl.innerText = config.defaultText || 'Preview';
        if(config.styles) Object.assign(previewEl.style, config.styles);
        
        previewBox.appendChild(previewEl);
        container.innerHTML = `<div class="item-label">${item.name}</div>`;
        container.appendChild(previewBox);

        container.ondragstart = (e) => e.dataTransfer.setData('configPath', container.dataset.json);
        itemsList.appendChild(container);
    }
}

// 2. CREATE AND DRAG LOGIC
canvas.ondragover = (e) => e.preventDefault();
canvas.ondrop = async (e) => {
    e.preventDefault();
    const configPath = e.dataTransfer.getData('configPath');
    const response = await fetch(configPath);
    const config = await response.json();

    const el = document.createElement(config.tag);
    el.className = 'dropped';
    if(config.tag === 'img') el.src = "https://placeholder.com";
    else if(config.tag === 'input' && config.type === 'checkbox') el.type = 'checkbox';
    else el.innerText = config.defaultText || '';

    el.style.left = (e.clientX - canvas.offsetLeft) + 'px';
    el.style.top = (e.clientY - canvas.offsetTop) + 'px';
    el.style.width = config.styles?.width || "150px";
    el.style.height = config.styles?.height || "auto";
    el.style.zIndex = "1";
    if(config.styles) Object.assign(el.style, config.styles);

    makeMovable(el);
    canvas.appendChild(el);
    selectElement(el);
};

// 3. MOVE OBJECTS BY PRESSING THEM
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

// 4. PROPERTIES CONTROL
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
    document.getElementById('img-path-group').style.display = el.tagName === 'IMG' ? 'block' : 'none';
    if(el.tagName === 'IMG') document.getElementById('prop-src').value = el.src;
    document.getElementById('prop-w').value = parseInt(el.offsetWidth);
    document.getElementById('prop-h').value = parseInt(el.offsetHeight);
    document.getElementById('prop-z').value = el.style.zIndex;
}

document.getElementById('save-btn').onclick = () => {
    if (!selectedElement) return;
    selectedElement.id = document.getElementById('prop-id').value;
    if(selectedElement.tagName === 'IMG') selectedElement.src = document.getElementById('prop-src').value;
    else selectedElement.innerText = document.getElementById('prop-text').value;
    
    selectedElement.style.width = document.getElementById('prop-w').value + 'px';
    selectedElement.style.height = document.getElementById('prop-h').value + 'px';
    selectedElement.style.zIndex = document.getElementById('prop-z').value;
};

// 5. DELETE & EXPORT
window.onkeydown = (e) => {
    if ((e.key === "Delete" || e.key === "Backspace") && selectedElement && document.activeElement.tagName !== 'INPUT') {
        selectedElement.remove();
        propEditor.style.display = 'none';
        noSelection.style.display = 'block';
    }
};

document.getElementById('export-btn').onclick = () => {
    const clone = canvas.cloneNode(true);
    clone.querySelectorAll('.dropped').forEach(el => {
        el.classList.remove('dropped', 'selected');
        el.style.position = 'absolute';
    });
    const html = `<!DOCTYPE html><html><head><style>body{margin:0; position:relative; overflow:hidden;}</style></head><body>${clone.innerHTML}</body></html>`;
    const blob = new Blob([html], {type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'index.html';
    a.click();
};

loadMenu();
