const canvas = document.getElementById('canvas');
const itemsList = document.getElementById('items-list');
const searchInput = document.getElementById('search-input');
const propEditor = document.getElementById('editor');
const noSelection = document.getElementById('no-selection');
const customCssArea = document.getElementById('custom-css-area');
const liveStyles = document.getElementById('live-custom-css');
const sceneJsArea = document.getElementById('scene-js-area');
const sceneNameInput = document.getElementById('scene-name-input');

let scenes = []; 
let currentSceneId = null;
let selectedElement = null;

// 1. SCENE ENGINE
function createNewScene() {
    const id = Date.now();
    const newScene = {
        id: id,
        name: "Scene " + (scenes.length + 1),
        html: "",
        js: "",
        bg: "#ffffff",
        isFirst: scenes.length === 0
    };
    scenes.push(newScene);
    renderTabs();
    switchScene(id);
}

function renderTabs() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';
    scenes.forEach(s => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${s.id === currentSceneId ? 'active' : ''}`;
        btn.innerText = s.name + (s.isFirst ? " ★" : "");
        btn.onclick = () => switchScene(s.id);
        container.appendChild(btn);
    });
}

function switchScene(id) {
    if (currentSceneId) {
        const prev = scenes.find(s => s.id === currentSceneId);
        prev.html = canvas.innerHTML;
        prev.js = sceneJsArea.value;
        prev.bg = document.getElementById('canvas-bg-input').value;
    }

    currentSceneId = id;
    const scene = scenes.find(s => s.id === id);
    
    canvas.innerHTML = scene.html;
    sceneJsArea.value = scene.js;
    sceneNameInput.value = scene.name;
    document.getElementById('canvas-bg-input').value = scene.bg;
    canvas.style.backgroundColor = scene.bg;
    
    canvas.querySelectorAll('.dropped').forEach(el => initSafeDrag(el));
    renderTabs();
    selectElement(null);
}

// 2. LOAD ASSETS WITH PREVIEW
async function loadMenu() {
    try {
        const response = await fetch('./items/items.json');
        const items = await response.json();
        renderMenu(items);
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            renderMenu(items.filter(i => i.name.toLowerCase().includes(term)));
        };
    } catch (e) { console.error("JSON Path Error: Use Live Server/GitHub.", e); }
}

async function renderMenu(items) {
    itemsList.innerHTML = '';
    for (const item of items) {
        const res = await fetch(`./items/item-${item.id}.json`);
        const config = await res.json();
        const container = document.createElement('div');
        container.className = 'item-container';
        container.draggable = true;
        
        container.innerHTML = `<div class="item-label">${item.name}</div>`;
        const pBox = document.createElement('div');
        pBox.className = 'preview-box';
        pBox.innerHTML = config.tag === 'img' ? 'IMAGE' : (config.tag === 'select' ? 'DROPDOWN' : config.defaultText);
        
        container.appendChild(pBox);
        container.ondragstart = (e) => e.dataTransfer.setData('configPath', `./items/item-${item.id}.json`);
        itemsList.appendChild(container);
    }
}

// 3. CANVAS LOGIC
canvas.ondragover = (e) => e.preventDefault();
canvas.ondrop = async (e) => {
    e.preventDefault();
    const configPath = e.dataTransfer.getData('configPath');
    const response = await fetch(configPath);
    const config = await response.json();

    const el = document.createElement(config.tag);
    el.className = 'dropped';
    if(config.tag === 'select') updateSelectOptions(el, "Option 1/Option 2");
    else if(config.tag === 'img') el.src = "https://placeholder.com";
    else el.innerText = config.defaultText || '';

    el.style.left = (e.clientX - canvas.offsetLeft) + 'px';
    el.style.top = (e.clientY - canvas.offsetTop) + 'px';
    el.style.width = config.styles?.width || "120px";
    el.style.position = "absolute";
    if(config.styles) Object.assign(el.style, config.styles);

    initSafeDrag(el);
    canvas.appendChild(el);
    selectElement(el);
};

function initSafeDrag(el) {
    let isMoving = false;
    let offset = { x: 0, y: 0 };

    el.onmousedown = (e) => {
        e.stopPropagation();
        selectElement(el);
        isMoving = true;
        const rect = el.getBoundingClientRect();
        offset.x = e.clientX - rect.left;
        offset.y = e.clientY - rect.top;
    };

    window.addEventListener('mousemove', (e) => {
        if (!isMoving) return;
        el.style.left = (e.clientX - canvas.offsetLeft - offset.x) + 'px';
        el.style.top = (e.clientY - canvas.offsetTop - offset.y) + 'px';
        updateInputs(el);
    });

    window.addEventListener('mouseup', () => isMoving = false);
}

// 4. PROPERTIES
function selectElement(el) {
    if (selectedElement) selectedElement.classList.remove('selected');
    selectedElement = el;
    if (el) {
        el.classList.add('selected');
        propEditor.style.display = 'block';
        noSelection.style.display = 'none';
        updateInputs(el);
    } else {
        propEditor.style.display = 'none';
        noSelection.style.display = 'block';
    }
}

function updateInputs(el) {
    document.getElementById('prop-id').value = el.id || '';
    document.getElementById('prop-text').value = el.tagName === 'SELECT' ? Array.from(el.options).map(o => o.text).join('/') : el.innerText;
    document.getElementById('prop-w').value = el.offsetWidth;
    document.getElementById('prop-h').value = el.offsetHeight;
    document.getElementById('prop-z').value = el.style.zIndex || 1;
}

document.getElementById('save-btn').onclick = () => {
    if (!selectedElement) return;
    const textVal = document.getElementById('prop-text').value;
    selectedElement.id = document.getElementById('prop-id').value;
    if (selectedElement.tagName === 'SELECT') updateSelectOptions(selectedElement, textVal);
    else if (selectedElement.tagName !== 'IMG') selectedElement.innerText = textVal;
    
    selectedElement.style.width = document.getElementById('prop-w').value + 'px';
    selectedElement.style.height = document.getElementById('prop-h').value + 'px';
    selectedElement.style.zIndex = document.getElementById('prop-z').value;
};

function updateSelectOptions(el, val) {
    el.innerHTML = '';
    val.split('/').forEach(o => {
        const opt = document.createElement('option');
        opt.innerText = o.trim();
        el.appendChild(opt);
    });
}

// 5. PREVIEW & EXPORT
document.getElementById('preview-mode-btn').onclick = () => {
    // Save state
    const current = scenes.find(s => s.id === currentSceneId);
    current.html = canvas.innerHTML;
    current.js = sceneJsArea.value;

    const scenesData = {};
    scenes.forEach(s => scenesData[s.name] = { html: s.html, js: s.js, bg: s.bg });

    const win = window.open();
    win.document.write(`
        <html><head><style>body{margin:0; overflow:hidden;} .view{width:100vw;height:100vh;position:relative;} ${customCssArea.value}</style></head>
        <body><div id="app" class="view"></div>
        <script>
            const scns = ${JSON.stringify(scenesData)};
            function goToScene(name) {
                const s = scns[name];
                const app = document.getElementById('app');
                app.innerHTML = s.html;
                app.style.backgroundColor = s.bg;
                document.body.style.backgroundColor = s.bg;
                try { eval(s.js); } catch(e) { console.error(e); }
            }
            goToScene("${scenes.find(s => s.isFirst).name}");
        <\/script></body></html>
    `);
};

// Global Events
customCssArea.oninput = (e) => liveStyles.innerHTML = e.target.value;
sceneNameInput.oninput = (e) => { scenes.find(s => s.id === currentSceneId).name = e.target.value; renderTabs(); };
window.onkeydown = (e) => { if((e.key === "Delete") && selectedElement && document.activeElement.tagName !== 'INPUT') { selectedElement.remove(); selectElement(null); } };

createNewScene();
loadMenu();
