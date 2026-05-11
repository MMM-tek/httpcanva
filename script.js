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

const canvas = document.getElementById('canvas');
const itemsList = document.getElementById('items-list');
const propEditor = document.getElementById('editor');
const noSelection = document.getElementById('no-selection');
const customCssArea = document.getElementById('custom-css-area');
const liveStyles = document.getElementById('live-custom-css');
let selectedElement = null;
let isPreview = false;

// 1. SAFE DRAG FIXED (Ahora funciona para todos)
function initSafeDrag(el) {
    let isMoving = false;
    let offset = { x: 0, y: 0 };

    const onMouseDown = (e) => {
        if (isPreview) return;
        e.stopPropagation();
        selectElement(el);
        
        isMoving = true;
        const rect = el.getBoundingClientRect();
        offset.x = e.clientX - rect.left;
        offset.y = e.clientY - rect.top;
        el.style.opacity = "0.7";
    };

    const onMouseMove = (e) => {
        if (!isMoving) return;
        const canvasRect = canvas.getBoundingClientRect();
        el.style.left = (e.clientX - canvasRect.left - offset.x) + 'px';
        el.style.top = (e.clientY - canvasRect.top - offset.y) + 'px';
        updateInputs(el);
    };

    const onMouseUp = () => {
        isMoving = false;
        el.style.opacity = "1";
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

// 2. LIVE CSS & BACKGROUND
document.getElementById('canvas-bg-input').oninput = (e) => {
    canvas.style.backgroundColor = e.target.value;
};

customCssArea.oninput = (e) => {
    liveStyles.innerHTML = e.target.value;
};

// 3. DROPDOWN WITH / LOGIC
function updateSelectOptions(el, textValue) {
    if (el.tagName !== 'SELECT') return;
    el.innerHTML = '';
    textValue.split('/').forEach(optText => {
        const opt = document.createElement('option');
        opt.value = optText.trim();
        opt.innerText = optText.trim();
        el.appendChild(opt);
    });
}

// 4. CREATE ON CANVAS
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
        opt.innerText = "Option 1 / Option 2";
        el.appendChild(opt);
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
    if(config.styles) Object.assign(el.style, config.styles);

    initSafeDrag(el); // ASIGNAR MOVIMIENTO INDIVIDUAL
    canvas.appendChild(el);
    selectElement(el);
};

// 5. PROPERTIES UPDATE
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

function selectElement(el) {
    if (isPreview) return;
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = el;
    el.classList.add('selected');
    propEditor.style.display = 'block';
    noSelection.style.display = 'none';
    updateInputs(el);
}

// Iniciar carga de menú (reutiliza tu loadMenu anterior)
loadMenu();
