const METADATA_KEY = "com.heirenstuff.inventory/data";
let myId, myRole, viewedPlayerId;

const ITEM_CATALOG = [
    { id: "pistol", name: "Pistola 9mm", img: "https://i.ibb.co/LzNfG9m/pistol.png", w: 2, h: 2 },
    { id: "herb-g", name: "Hierba Verde", img: "https://i.ibb.co/0M7V4y2/herb.png", w: 1, h: 1 },
    { id: "shotgun", name: "Escopeta", img: "https://i.ibb.co/vYm6X0p/shotgun.png", w: 3, h: 1 },
    { id: "knife", name: "Cuchillo", img: "https://i.ibb.co/9V5LzD8/knife.png", w: 1, h: 2 }
];

OBR.onReady(async () => {
    myId = await OBR.player.getId();
    myRole = await OBR.player.getRole();
    viewedPlayerId = myId;

    setupUI();
    
    // Suscribirse a cambios en la escena
    OBR.scene.onMetadataChange((metadata) => {
        const data = metadata[METADATA_KEY] || { inventories: {} };
        render(data);
    });

    // Render inicial
    const initialMeta = await OBR.scene.getMetadata();
    render(initialMeta[METADATA_KEY] || { inventories: {} });
});

function setupUI() {
    const badge = document.getElementById('role-badge');
    badge.innerText = `MODO: ${myRole}`;
    badge.style.color = myRole === "GM" ? "#d4af37" : "#0f0";

    if (myRole === "GM") {
        document.getElementById('gm-console').classList.remove('hidden');
        setupDMFunctions();
    }

    // Eventos de monedas
    ['gold', 'silver', 'copper'].forEach(type => {
        document.getElementById(`coin-${type}`).onchange = (e) => {
            updateCurrency(viewedPlayerId, type, parseInt(e.target.value) || 0);
        };
    });
}

async function setupDMFunctions() {
    const selector = document.getElementById('player-selector');
    const catSelector = document.getElementById('item-catalog-selector');

    // Poblar catálogo de items
    ITEM_CATALOG.forEach(item => {
        let opt = document.createElement('option');
        opt.value = item.id;
        opt.innerText = `${item.name} (${item.w}x${item.h})`;
        catSelector.appendChild(opt);
    });

    // Función para actualizar lista de jugadores
    const updatePlayerList = async () => {
        const players = await OBR.party.getPlayers();
        const myName = await OBR.player.getName();
        
        let options = `<option value="${myId}">${myName} (Tú)</option>`;
        players.forEach(p => {
            options += `<option value="${p.id}">${p.name}</option>`;
        });
        selector.innerHTML = options;
        selector.value = viewedPlayerId;
    };

    selector.onchange = (e) => {
        viewedPlayerId = e.target.value;
        const selectedName = selector.options[selector.selectedIndex].text;
        document.getElementById('owner-name').innerText = `INV: ${selectedName.toUpperCase()}`;
        refreshRender();
    };

    document.getElementById('btn-add').onclick = addNewItem;

    OBR.party.onChange(updatePlayerList);
    updatePlayerList();
}

async function refreshRender() {
    const meta = await OBR.scene.getMetadata();
    render(meta[METADATA_KEY] || { inventories: {} });
}

function render(data) {
    const inventories = data.inventories || {};
    const inv = inventories[viewedPlayerId] || { items: [], coins: {}, enabledSlots: [] };
    
    // Actualizar Monedas
    const coins = inv.coins || { gold: 0, silver: 0, copper: 0 };
    document.getElementById('coin-gold').value = coins.gold || 0;
    document.getElementById('coin-silver').value = coins.silver || 0;
    document.getElementById('coin-copper').value = coins.copper || 0;

    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    // Crear 80 slots (8x10)
    const enabledSlots = inv.enabledSlots || [];
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 8; x++) {
            const slot = document.createElement('div');
            const isEnabled = enabledSlots.includes(`${x},${y}`);
            slot.className = `slot ${isEnabled ? '' : 'locked'}`;
            
            if (myRole === "GM") {
                slot.onclick = () => toggleSlot(x, y);
            }
            grid.appendChild(slot);
        }
    }

    // Dibujar Ítems
    (inv.items || []).forEach(item => {
        const el = document.createElement('div');
        el.className = 'item';
        const actualW = item.rotated ? item.h : item.w;
        const actualH = item.rotated ? item.w : item.h;
        
        el.style.width = `${actualW * 40 + (actualW - 1)}px`;
        el.style.height = `${actualH * 40 + (actualH - 1)}px`;
        el.style.left = `${item.x * 41}px`;
        el.style.top = `${item.y * 41}px`;

        el.innerHTML = `<img src="${item.img}" title="${item.name}">`;

        // Acciones de item
        el.oncontextmenu = (e) => {
            e.preventDefault();
            if (myRole === "GM") removeItem(item.id);
        };
        
        el.onclick = (e) => {
            if (e.shiftKey) rotateItem(item.id);
        };

        grid.appendChild(el);
    });
}

// --- LÓGICA DE DATOS ---

async function updateCurrency(playerId, type, amount) {
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[playerId]) data.inventories[playerId] = { items: [], coins: {}, enabledSlots: [] };
    if (!data.inventories[playerId].coins) data.inventories[playerId].coins = {};
    
    data.inventories[playerId].coins[type] = amount;
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

async function toggleSlot(x, y) {
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[viewedPlayerId]) data.inventories[viewedPlayerId] = { items: [], coins: {}, enabledSlots: [] };
    
    const slots = data.inventories[viewedPlayerId].enabledSlots || [];
    const key = `${x},${y}`;
    const idx = slots.indexOf(key);
    
    if (idx > -1) slots.splice(idx, 1);
    else slots.push(key);
    
    data.inventories[viewedPlayerId].enabledSlots = slots;
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

async function addNewItem() {
    const catalogId = document.getElementById('item-catalog-selector').value;
    const template = ITEM_CATALOG.find(i => i.id === catalogId);
    
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[viewedPlayerId]) data.inventories[viewedPlayerId] = { items: [], coins: {}, enabledSlots: [] };
    
    const newItem = {
        ...template,
        id: crypto.randomUUID(),
        x: 0, y: 0,
        rotated: false
    };

    data.inventories[viewedPlayerId].items.push(newItem);
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

async function removeItem(itemId) {
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    const inv = data.inventories[viewedPlayerId];
    if (inv) {
        inv.items = inv.items.filter(i => i.id !== itemId);
        await OBR.scene.setMetadata({ [METADATA_KEY]: data });
    }
}

async function rotateItem(itemId) {
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    const inv = data.inventories[viewedPlayerId];
    const item = inv?.items.find(i => i.id === itemId);
    if(item) {
        item.rotated = !item.rotated;
        await OBR.scene.setMetadata({ [METADATA_KEY]: data });
    }
}