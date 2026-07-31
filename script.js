const METADATA_KEY = "com.heirenstuff.inventory/data";
let myId, myRole, viewedPlayerId;

const ITEM_CATALOG = [
    { id: "pistol", name: "Pistola", img: "https://i.ibb.co/LzNfG9m/pistol.png", w: 2, h: 2 },
    { id: "herb", name: "Hierba", img: "https://i.ibb.co/0M7V4y2/herb.png", w: 1, h: 1 },
    { id: "shotgun", name: "Escopeta", img: "https://i.ibb.co/vYm6X0p/shotgun.png", w: 3, h: 1 }
];

OBR.onReady(async () => {
    // 1. Detectar quién soy
    myId = await OBR.player.getId();
    myRole = await OBR.player.getRole();
    viewedPlayerId = myId;

    // 2. Configurar Interfaz según Rol
    updateUIForRole();

    // 3. Suscripciones a cambios
    OBR.player.onChange((p) => {
        myRole = p.role;
        updateUIForRole();
    });

    OBR.scene.onMetadataChange((meta) => {
        render(meta[METADATA_KEY] || { inventories: {} });
    });

    if (myRole === "GM") {
        OBR.party.onChange(updatePlayerSelector);
        updatePlayerSelector();
    }

    // 4. Render inicial
    const initialMeta = await OBR.scene.getMetadata();
    render(initialMeta[METADATA_KEY] || { inventories: {} });
});

function updateUIForRole() {
    const badge = document.getElementById('role-badge');
    badge.innerText = `MODO: ${myRole}`;
    badge.style.color = myRole === "GM" ? "#d4af37" : "#0f0";

    const consoleDiv = document.getElementById('gm-console');
    myRole === "GM" ? consoleDiv.classList.remove('hidden') : consoleDiv.classList.add('hidden');

    // Cargar catálogo solo una vez si es GM
    const catSelector = document.getElementById('item-catalog-selector');
    if (myRole === "GM" && catSelector.options.length === 0) {
        ITEM_CATALOG.forEach(i => {
            let opt = document.createElement('option');
            opt.value = i.id;
            opt.innerText = i.name;
            catSelector.appendChild(opt);
        });
        document.getElementById('btn-add').onclick = addNewItem;
    }

    // Eventos de monedas
    ['gold', 'silver', 'copper'].forEach(t => {
        document.getElementById(`coin-${t}`).onchange = (e) => {
            updateCurrency(viewedPlayerId, t, parseInt(e.target.value) || 0);
        };
    });
}

async function updatePlayerSelector() {
    const selector = document.getElementById('player-selector');
    const players = await OBR.party.getPlayers();
    const myName = await OBR.player.getName();
    
    let html = `<option value="${myId}">${myName} (Tú)</option>`;
    players.forEach(p => html += `<option value="${p.id}">${p.name}</option>`);
    selector.innerHTML = html;
    selector.value = viewedPlayerId;

    selector.onchange = (e) => {
        viewedPlayerId = e.target.value;
        document.getElementById('owner-name').innerText = `INV: ${e.target.options[e.target.selectedIndex].text.toUpperCase()}`;
        OBR.scene.getMetadata().then(m => render(m[METADATA_KEY] || { inventories: {} }));
    };
}

function render(data) {
    const inv = (data.inventories || {})[viewedPlayerId] || { items: [], coins: {}, enabledSlots: [] };
    
    // Monedas
    const c = inv.coins || {};
    document.getElementById('coin-gold').value = c.gold || 0;
    document.getElementById('coin-silver').value = c.silver || 0;
    document.getElementById('coin-copper').value = c.copper || 0;

    // Grid
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    const slots = inv.enabledSlots || [];

    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 8; x++) {
            const slot = document.createElement('div');
            slot.className = `slot ${slots.includes(`${x},${y}`) ? '' : 'locked'}`;
            if (myRole === "GM") slot.onclick = () => toggleSlot(x, y);
            grid.appendChild(slot);
        }
    }

    // Items
    (inv.items || []).forEach(item => {
        const el = document.createElement('div');
        el.className = 'item';
        const w = item.rotated ? item.h : item.w;
        const h = item.rotated ? item.w : item.h;
        el.style.width = `${w * 40}px`;
        el.style.height = `${h * 40}px`;
        el.style.left = `${item.x * 41}px`;
        el.style.top = `${item.y * 41}px`;
        el.innerHTML = `<img src="${item.img}">`;
        
        if (myRole === "GM") {
            el.oncontextmenu = (e) => { e.preventDefault(); removeItem(item.id); };
        }
        el.onclick = (e) => { if (e.shiftKey) rotateItem(item.id); };
        grid.appendChild(el);
    });
}

async function updateCurrency(pid, type, val) {
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[pid]) data.inventories[pid] = { items: [], coins: {}, enabledSlots: [] };
    if (!data.inventories[pid].coins) data.inventories[pid].coins = {};
    data.inventories[pid].coins[type] = val;
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

async function toggleSlot(x, y) {
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[viewedPlayerId]) data.inventories[viewedPlayerId] = { items: [], coins: {}, enabledSlots: [] };
    const slots = data.inventories[viewedPlayerId].enabledSlots;
    const key = `${x},${y}`;
    const i = slots.indexOf(key);
    i > -1 ? slots.splice(i, 1) : slots.push(key);
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

async function addNewItem() {
    const id = document.getElementById('item-catalog-selector').value;
    const item = ITEM_CATALOG.find(i => i.id === id);
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[viewedPlayerId]) data.inventories[viewedPlayerId] = { items: [], coins: {}, enabledSlots: [] };
    data.inventories[viewedPlayerId].items.push({ ...item, id: crypto.randomUUID(), x: 0, y: 0, rotated: false });
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

async function removeItem(id) {
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    data.inventories[viewedPlayerId].items = data.inventories[viewedPlayerId].items.filter(i => i.id !== id);
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

async function rotateItem(id) {
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    const item = data.inventories[viewedPlayerId].items.find(i => i.id === id);
    if (item) { item.rotated = !item.rotated; await OBR.scene.setMetadata({ [METADATA_KEY]: data }); }
}