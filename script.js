const canvas = document.getElementById('canvas');
const itemsList = document.getElementById('items-list');
const searchInput = document.getElementById('search-input');
const propEditor = document.getElementById('editor');
const noSelection = document.getElementById('no-selection');
let selectedElement = null;

// 1. LOAD MENU FROM JSON
async function loadMenu() {
    try {
        const response = await fetch('items/items.json');
        const items = await response.json();
        renderMenu(items);
        
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = items.filter(i => i.name.toLowerCase().includes(term));
            renderMenu(filtered);
        };
    } catch (e) { 
        console.error("Error loading items.json. Use a local server (Live Server).", e); 
    }
}

function renderMenu(items) {
    itemsList.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-card';
        div.draggable = true;
        div.innerText = item.name;
        div.dataset.json = `items/item-${item.id}.json`;
        
        div.ondragstart = (e) => {
            e.dataTransfer.setData('configPath', div.dataset.json);
        };
        itemsList.appendChild(div);
    });
}

// 2. DRAG & DROP LOGIC
canvas.ondragover = (e) => e.preventDefault();

canvas.ondrop = async (e) => {
    e.preventDefault();
    const configPath = e.dataTransfer.getData('configPath');
    if (!configPath) return;

    try {
        const response = await fetch(configPath);
        const config = await response.json();

        const el = document.createElement(config.tag);
        el.className = 'dropped';
        el.innerText = config.defaultText || '';
        
        const rect = canvas.getBoundingClientRect();
        el.style.left = (e.clientX - rect.left) + 'px';
        el.style.top = (e.clientY - rect.top) + 'px';
        el.style.zIndex = "1";

        if (config.styles) Object.assign(el.style, config.styles);

        el.onclick = (event) => {
            event.stopPropagation();
            openProperties(el);
        };

        canvas.appendChild(el);
        openProperties(el);

    } catch (err) {
        console.error("Error loading item configuration:", err);
    }
};

// 3. PROPERTIES SYSTEM
function openProperties(el) {
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = el;
    el.classList.add('selected');

    propEditor.style.display = 'block';
    noSelection.style.display = 'none';
    
    document.getElementById('prop-id').value = el.id || '';
    document.getElementById('prop-text').value = el.innerText || '';
    document.getElementById('prop-zindex').value = el.style.zIndex || 1;
    document.getElementById('prop-x').value = parseInt(el.style.left) || 0;
    document.getElementById('prop-y').value = parseInt(el.style.top) || 0;
}

document.getElementById('save-btn').onclick = () => {
    if (selectedElement) {
        selectedElement.id = document.getElementById('prop-id').value;
        if (selectedElement.tagName !== 'INPUT') {
            selectedElement.innerText = document.getElementById('prop-text').value;
        } else {
            selectedElement.placeholder = document.getElementById('prop-text').value;
        }
        selectedElement.style.zIndex = document.getElementById('prop-zindex').value;
        selectedElement.style.left = document.getElementById('prop-x').value + 'px';
        selectedElement.style.top = document.getElementById('prop-y').value + 'px';
    }
};

// 4. DELETE LOGIC (Keydown)
window.addEventListener('keydown', (e) => {
    if ((e.key === "Delete" || e.key === "Backspace") && selectedElement) {
        // Evitar borrar si estamos escribiendo en un input de propiedades
        if (document.activeElement.tagName === 'INPUT') return;
        
        selectedElement.remove();
        selectedElement = null;
        propEditor.style.display = 'none';
        noSelection.style.display = 'block';
    }
});

// 5. EXPORT SYSTEM
document.getElementById('export-btn').onclick = () => {
    const canvasClone = canvas.cloneNode(true);
    const elements = canvasClone.querySelectorAll('.dropped');
    
    elements.forEach(el => {
        el.classList.remove('dropped', 'selected');
        el.removeAttribute('onclick');
        el.style.position = 'absolute'; // Ensure absolute positioning in export
    });

    const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>httpgen Export</title>
    <style>
        body { margin: 0; background: white; }
        .exported-canvas { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
    </style>
</head>
<body>
    <div class="exported-canvas">
        ${canvasClone.innerHTML}
    </div>
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'httpgen-design.html';
    a.click();
};

canvas.onclick = () => {
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = null;
    propEditor.style.display = 'none';
    noSelection.style.display = 'block';
};

loadMenu();
