let project = { name: "Untitled", scenes: [], css: "" };
let currentSceneId = null;
let selected = null;

const canvas = document.getElementById('canvas');
const tabs = document.getElementById('tabs-container');

// --- PROJECT MGMT ---
function startNewProject() {
    const name = prompt("Project Name:", "My Website");
    if (!name) return;
    project.name = name;
    document.querySelector('#project-title span').innerText = name;
    document.getElementById('splash-screen').style.display = 'none';
    createNewScene();
}

function saveProjectFile() {
    updateCurrentSceneData();
    const blob = new Blob([JSON.stringify(project)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = project.name + ".http";
    a.click();
}

function loadProject(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        project = JSON.parse(ev.target.result);
        document.querySelector('#project-title span').innerText = project.name;
        document.getElementById('css-editor').value = project.css || "";
        document.getElementById('splash-screen').style.display = 'none';
        renderTabs();
        switchScene(project.scenes[0].id);
    };
    reader.readAsText(e.target.files[0]);
}

// --- SCENE MGMT ---
function createNewScene() {
    updateCurrentSceneData();
    const id = Date.now();
    project.scenes.push({ id, name: "Scene " + (project.scenes.length + 1), html: "", js: "", bg: "#ffffff" });
    renderTabs();
    switchScene(id);
}

function switchScene(id) {
    updateCurrentSceneData();
    currentSceneId = id;
    const s = project.scenes.find(x => x.id === id);
    canvas.innerHTML = s.html;
    canvas.style.backgroundColor = s.bg;
    document.getElementById('js-editor').value = s.js;
    document.getElementById('scene-name-input').value = s.name;
    document.getElementById('canvas-bg').value = s.bg;
    
    canvas.querySelectorAll('.dropped').forEach(el => attachMovement(el));
    renderTabs();
    select(null);
}

function updateCurrentSceneData() {
    if (!currentSceneId) return;
    const s = project.scenes.find(x => x.id === currentSceneId);
    s.html = canvas.innerHTML;
    s.js = document.getElementById('js-editor').value;
    s.bg = document.getElementById('canvas-bg').value;
    project.css = document.getElementById('css-editor').value;
}

function renderTabs() {
    tabs.innerHTML = '';
    project.scenes.forEach(s => {
        const d = document.createElement('div');
        d.className = `tab-btn ${s.id === currentSceneId ? 'active' : ''}`;
        d.innerHTML = `<span onclick="switchScene(${s.id})">${s.name}</span><small onclick="deleteScene(${s.id})"> ×</small>`;
        tabs.appendChild(d);
    });
}

function deleteScene(id) {
    if (project.scenes.length <= 1) return;
    project.scenes = project.scenes.filter(s => s.id !== id);
    if (currentSceneId === id) switchScene(project.scenes[0].id);
    else renderTabs();
}

// --- CANVAS & ITEMS ---
canvas.ondragover = e => e.preventDefault();
canvas.ondrop = async e => {
    const path = e.dataTransfer.getData('path');
    const res = await fetch(path);
    const conf = await res.json();
    const el = document.createElement(conf.tag);
    el.className = 'dropped';
    el.style.left = (e.clientX - canvas.offsetLeft) + 'px';
    el.style.top = (e.clientY - canvas.offsetTop) + 'px';
    el.style.width = "120px";
    if (conf.tag === 'select') el.innerHTML = "<option>Option 1</option>";
    else el.innerText = conf.defaultText || '';
    if (conf.styles) Object.assign(el.style, conf.styles);
    
    attachMovement(el);
    canvas.appendChild(el);
    select(el);
};

function attachMovement(el) {
    let moving = false, ox, oy;
    el.onmousedown = e => {
        e.stopPropagation();
        select(el);
        moving = true;
        ox = e.clientX - el.offsetLeft;
        oy = e.clientY - el.offsetTop;
    };
    window.addEventListener('mousemove', e => {
        if (!moving) return;
        el.style.left = (e.clientX - ox) + 'px';
        el.style.top = (e.clientY - oy) + 'px';
        syncInputs();
    });
    window.addEventListener('mouseup', () => moving = false);
}

// --- PROPS ---
function select(el) {
    if (selected) selected.classList.remove('selected');
    selected = el;
    const ui = document.getElementById('editor-ui');
    if (el) {
        el.classList.add('selected');
        ui.style.display = 'block';
        document.getElementById('no-selection').style.display = 'none';
        syncInputs();
    } else {
        ui.style.display = 'none';
        document.getElementById('no-selection').style.display = 'block';
    }
}

function syncInputs() {
    if (!selected) return;
    document.getElementById('prop-id').value = selected.id || '';
    document.getElementById('prop-text').value = selected.tagName === 'SELECT' ? Array.from(selected.options).map(o => o.text).join('/') : selected.innerText;
    document.getElementById('prop-w').value = selected.offsetWidth;
    document.getElementById('prop-h').value = selected.offsetHeight;
    document.getElementById('prop-z').value = selected.style.zIndex || 1;
}

document.getElementById('apply-btn').onclick = () => {
    const val = document.getElementById('prop-text').value;
    selected.id = document.getElementById('prop-id').value;
    if (selected.tagName === 'SELECT') {
        selected.innerHTML = '';
        val.split('/').forEach(t => { const o = document.createElement('option'); o.text = t.trim(); selected.add(o); });
    } else { selected.innerText = val; }
    selected.style.width = document.getElementById('prop-w').value + 'px';
    selected.style.height = document.getElementById('prop-h').value + 'px';
    selected.style.zIndex = document.getElementById('prop-z').value;
};

// --- PREVIEW & HELPERS ---
async function loadMenu() {
    const res = await fetch('./items/items.json');
    const list = await res.json();
    for (const i of list) {
        const r = await fetch(`./items/item-${i.id}.json`);
        const c = await r.json();
        const d = document.createElement('div');
        d.className = 'item-container';
        d.draggable = true;
        d.innerHTML = `<div class="item-label">${i.name}</div><div class="preview-box">${c.tag}</div>`;
        d.ondragstart = e => e.dataTransfer.setData('path', `./items/item-${i.id}.json`);
        document.getElementById('items-list').appendChild(d);
    }
}

function openPreview() {
    updateCurrentSceneData();
    const dict = {};
    project.scenes.forEach(s => dict[s.name] = { h: s.html, j: s.js, b: s.bg });
    const w = window.open();
    w.document.write(`<html><head><style>body{margin:0}${project.css}</style></head><body><div id="v" style="width:100vw;height:100vh;position:relative"></div><script>const s=${JSON.stringify(dict)};function goToScene(n){const x=s[n];const v=document.getElementById('v');v.innerHTML=x.h;v.style.backgroundColor=x.b;eval(x.j);}goToScene("${project.scenes[0].name}");<\/script></body></html>`);
}

document.getElementById('scene-name-input').oninput = e => {
    project.scenes.find(x => x.id === currentSceneId).name = e.target.value;
    renderTabs();
};
document.getElementById('css-editor').oninput = e => document.getElementById('live-css').innerHTML = e.target.value;
document.getElementById('canvas-bg').oninput = e => canvas.style.backgroundColor = e.target.value;
window.onkeydown = e => { if (e.key === "Delete" && selected && document.activeElement.tagName !== 'INPUT') { selected.remove(); select(null); } };

loadMenu();
