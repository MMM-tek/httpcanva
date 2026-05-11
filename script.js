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
    } catch (e) { console.error("Run a local server to load JSON files.", e); }
}

function renderMenu(items) {
    itemsList.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-card';
        div.draggable = true;
        div.innerText = item.name;
        div.dataset.json = `items/item-${item.id}.json`;
        div.ondragstart = (e) => e.dataTransfer.setData('configPath', div.dataset.json);
        itemsList.appendChild(div);
    });
}

// 2. CREATE ELEMENT ON CANVAS
canvas.ondragover = (e) => e.preventDefault();
canvas.ondrop = async (e) => {
    e.preventDefault();
    const configPath = e.dataTransfer.getData('configPath');
    const response = await fetch(configPath);
    const config = await response.json();

    const el = document.createElement(config.tag);
    el.className = 'dropped';
    if(config.tag === 'img') {
        el.src = "https://placeholder.com";
        el.style.objectFit = "cover";
    } else if(config.tag === 'input' && config.type === 'checkbox') {
        el.type = 'checkbox';
    } else {
        el.innerText = config.defaultText || '';
    }

    el.style.left = (e.clientX - canvas.offsetLeft) + 'px';
    el.style.top = (e.clientY - canvas.offsetTop) + 'px';
    el.style.width = "150px"; 
    el.style.height = "auto";
    el.style.zIndex = "1";
    if(config.styles) Object.assign(el.style, config.styles);

    // Add resize handle
    const resizer = document.createElement('div');
    resizer.className = 'resizer';
    el.appendChild(resizer);

    makeElementInteractable(el);
    canvas.appendChild(el);
    selectElement(el);
};

// 3. INTERACTIVITY (DRAG & RESIZE)
function makeElementInteractable(el) {
    let isDragging = false;
    let isResizing = false;

    el.onmousedown = (e) => {
        e.stopPropagation();
        selectElement(el);
        if (e.target.className === 'resizer') {
            isResizing = true;
        } else {
            isDragging = true;
        }
    };

    window.onmousemove = (e) => {
        if (isDragging) {
            el.style.left = (e.clientX - canvas.offsetLeft - el.offsetWidth/2) + 'px';
            el.style.top = (e.clientY - canvas.offsetTop - el.offsetHeight/2) + 'px';
            updatePropInputs(el);
        } else if (isResizing) {
            el.style.width = (e.clientX - el.getBoundingClientRect().left) + 'px';
            el.style.height = (e.clientY - el.getBoundingClientRect().top) + 'px';
            updatePropInputs(el);
        }
    };

    window.onmouseup = () => { isDragging = false; isResizing = false; };
}

// 4. PROPERTIES PANEL
function selectElement(el) {
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = el;
    el.classList.add('selected');

    propEditor.style.display = 'block';
    noSelection.style.display = 'none';
    
    // Show/Hide Image Path field
    document.getElementById('img-path-group').style.display = el.tagName === 'IMG' ? 'block' : 'none';
    updatePropInputs(el);
}

function updatePropInputs(el) {
    document.getElementById('prop-id').value = el.id || '';
    document.getElementById('prop-text').value = el.innerText || '';
    document.getElementById('prop-src').value = el.src || '';
    document.getElementById('prop-w').value = parseInt(el.style.width);
    document.getElementById('prop-h').value = parseInt(el.style.height);
    document.getElementById('prop-z').value = el.style.zIndex;
}

document.getElementById('save-btn').onclick = () => {
    if (!selectedElement) return;
    selectedElement.id = document.getElementById('prop-id').value;
    if(selectedElement.tagName === 'IMG') {
        selectedElement.src = document.getElementById('prop-src').value;
    } else {
        selectedElement.innerText = document.getElementById('prop-text').value;
    }
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
    clone.querySelectorAll('.resizer').forEach(r => r.remove());
    clone.querySelectorAll('.dropped').forEach(el => el.classList.remove('dropped', 'selected'));
    
    const html = `<!DOCTYPE html><html><head><style>body{margin:0} .canvas{position:relative;width:100vw;height:100vh}</style></head><body><div class="canvas">${clone.innerHTML}</div></body></html>`;
    const blob = new Blob([html], {type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'index.html';
    a.click();
};

loadMenu();
