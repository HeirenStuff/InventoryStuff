const METADATA_KEY = "com.heirenstuff.inventory/data";
let myId, myRole, viewedPlayerId;

// --- FASE 1: CATÁLOGO DE OBJETOS ---
const ITEM_CATALOG = [
    { id: "pistol", name: "Pistola 9mm", img: "https://i.ibb.co/LzNfG9m/pistol.png", w: 2, h: 2 },
    { id: "herb-g", name: "Hierba Verde", img: "https://i.ibb.co/0M7V4y2/herb.png", w: 1, h: 1 },
    { id: "shotgun", name: "Escopeta", img: "https://i.ibb.co/vYm6X0p/shotgun.png", w: 3, h: 1 },
    { id: "knife", name: "Cuchillo", img: "https://i.ibb.co/9V5LzD8/knife.png", w: 1, h: 2 }
];

const METADATA_KEY = "com.heirenstuff.inventory/data";
let myId, myRole, viewedPlayerId;

async function init() {
    // OBR.onReady es la forma correcta de esperar al SDK
    OBR.onReady(async () => {
        try {
            myId = await OBR.player.getId();
            myRole = await OBR.player.getRole();
            viewedPlayerId = myId;

            // Configurar UI básica
            const badge = document.getElementById('role-badge');
            if (badge) {
                badge.innerText = `MODO: ${myRole}`;
                badge.style.color = myRole === "GM" ? "#cc9a49" : "#aaa";
            }

            if (myRole === "GM") {
                const consoleDiv = document.getElementById('gm-console');
                if (consoleDiv) consoleDiv.classList.remove('hidden');
                setupDMView();
                setupGMEvents();
            }

            // Suscribirse a cambios
            OBR.scene.onMetadataChange((metadata) => {
                render(metadata[METADATA_KEY] || { inventories: {} });
            });

            // Render inicial
            const metadata = await OBR.scene.getMetadata();
            render(metadata[METADATA_KEY] || { inventories: {} });
            
        } catch (error) {
            console.error("Error al conectar con Owlbear:", error);
        }
    });
}

// Ejecutar init al cargar el script
init();

function setupUI() {
    const badge = document.getElementById('role-badge');
    badge.innerText = `MODO: ${myRole}`;
    
    if (myRole === "GM") {
        document.getElementById('gm-console').classList.remove('hidden');
        setupDMView();
        
        // Cargar Catálogo en el select
        const catSelector = document.getElementById('item-catalog-selector');
        ITEM_CATALOG.forEach(item => {
            let opt = document.createElement('option');
            opt.value = item.id;
            opt.innerText = `${item.name} (${item.w}x${item.h})`;
            catSelector.appendChild(opt);
        });

        document.getElementById('btn-add').onclick = addNewItem;
    }

    ['gold', 'silver', 'copper'].forEach(type => {
        document.getElementById(`coin-${type}`).onchange = (e) => {
            updateCurrency(viewedPlayerId, type, parseInt(e.target.value) || 0);
        };
    });
}

async function setupDMView() {
    const selector = document.getElementById('player-selector');
    const updateList = async () => {
        const players = await OBR.party.getPlayers();
        const myName = await OBR.player.getName();
        let options = `<option value="${myId}">${myName} (Tú)</option>`;
        players.forEach(p => options += `<option value="${p.id}">${p.name}</option>`);
        selector.innerHTML = options;
    };
    selector.onchange = (e) => {
        viewedPlayerId = e.target.value;
        document.getElementById('owner-name').innerText = `INV: ${e.target.options[e.target.selectedIndex].text}`;
        OBR.scene.getMetadata().then(meta => render(meta[METADATA_KEY] || { inventories: {} }));
    };
    OBR.party.onChange(updateList);
    updateList();
}

// --- RENDERIZADO (FASE 1) ---
function render(data) {
    const inv = (data.inventories || {})[viewedPlayerId] || { items: [], coins: {}, enabledSlots: [] };
    const coins = inv.coins || { gold: 0, silver: 0, copper: 0 };
    const enabledSlots = inv.enabledSlots || [];

    document.getElementById('coin-gold').value = coins.gold || 0;
    document.getElementById('coin-silver').value = coins.silver || 0;
    document.getElementById('coin-copper').value = coins.copper || 0;

    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    // Crear Slots
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

    // Dibujar Ítems (Fase 1: Imágenes)
    (inv.items || []).forEach(item => {
        const el = document.createElement('div');
        el.className = 'item';
        const actualW = item.rotated ? item.h : item.w;
        const actualH = item.rotated ? item.w : item.h;
        
        el.style.width = `${actualW * 40 + (actualW-1)}px`;
        el.style.height = `${actualH * 40 + (actualH-1)}px`;
        el.style.left = `${item.x * 41}px`;
        el.style.top = `${item.y * 41}px`;

        // Imagen del ítem
        el.innerHTML = `<img src="${item.img}" title="${item.name}">`;

        // FASE 3: Rotación y Borrado
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
    inv.items = inv.items.filter(i => i.id !== itemId);
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

async function rotateItem(itemId) {
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    const item = data.inventories[viewedPlayerId].items.find(i => i.id === itemId);
    if(item) {
        item.rotated = !item.rotated;
        await OBR.scene.setMetadata({ [METADATA_KEY]: data });
    }
}

async function toggleSlot(x, y) {
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[viewedPlayerId]) data.inventories[viewedPlayerId] = { items: [], coins: {}, enabledSlots: [] };
    const slots = data.inventories[viewedPlayerId].enabledSlots || [];
    const key = `${x},${y}`;
    const idx = slots.indexOf(key);
    idx > -1 ? slots.splice(idx, 1) : slots.push(key);
    data.inventories[viewedPlayerId].enabledSlots = slots;
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

async function updateCurrency(playerId, type, amount) {
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[playerId]) data.inventories[playerId] = { items: [], coins: {}, enabledSlots: [] };
    if (!data.inventories[playerId].coins) data.inventories[playerId].coins = {};
    data.inventories[playerId].coins[type] = amount;
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

init();