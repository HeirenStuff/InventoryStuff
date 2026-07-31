import OBR from "@owlbear-rodeo/sdk";

const METADATA_KEY = "com.heirenstuff.inventory/data";
let myId, myRole, viewedPlayerId;

// 1. INICIALIZACIÓN
OBR.onReady(async () => {
    myId = await OBR.player.getId();
    myRole = await OBR.player.getRole();
    viewedPlayerId = myId;

    setupEvents(); // Asignar eventos una sola vez

    if (myRole === "GM") {
        document.getElementById('dm-controls').style.display = 'block';
        document.getElementById('player-selector').style.display = 'block';
        setupDMView();
    }

    OBR.scene.onMetadataChange((metadata) => {
        render(metadata[METADATA_KEY] || { inventories: {} });
    });

    const metadata = await OBR.scene.getMetadata();
    render(metadata[METADATA_KEY] || { inventories: {} });
});

// 2. EVENTOS (FUERA DE RENDER)
function setupEvents() {
    ['gold', 'silver', 'copper'].forEach(type => {
        const input = document.getElementById(`coin-${type}`);
        input.onchange = (e) => {
            if (myRole === "GM") {
                updateCurrency(viewedPlayerId, type, parseInt(e.target.value) || 0);
            }
        };
    });
}

// 3. VISTA DM
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
        document.getElementById('owner-name').innerText = e.target.options[e.target.selectedIndex].text;
        OBR.scene.getMetadata().then(meta => render(meta[METADATA_KEY] || { inventories: {} }));
    };

    OBR.party.onChange(updateList);
    updateList();
}

// 4. DIBUJO DE INTERFAZ
function render(data) {
    const inventories = data.inventories || {};
    const inv = inventories[viewedPlayerId] || { items: [], coins: { gold: 0, silver: 0, copper: 0 }, enabledSlots: [] };
    
    // Asegurar arrays existentes
    const items = inv.items || [];
    const enabledSlots = inv.enabledSlots || [];
    const coins = inv.coins || { gold: 0, silver: 0, copper: 0 };

    // Actualizar Inputs de Monedas
    document.getElementById('coin-gold').value = coins.gold || 0;
    document.getElementById('coin-silver').value = coins.silver || 0;
    document.getElementById('coin-copper').value = coins.copper || 0;
    
    const grid = document.getElementById('grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Dibujar Slots
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 8; x++) {
            const slot = document.createElement('div');
            const isEnabled = enabledSlots.includes(`${x},${y}`);
            slot.className = `slot ${isEnabled ? '' : 'locked'}`;
            if (myRole === "GM") slot.onclick = () => toggleSlot(x, y);
            grid.appendChild(slot);
        }
    }

    // Dibujar Items
    const cellSize = 40;
    items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'item';
        const w = item.rotated ? item.h : item.w;
        const h = item.rotated ? item.w : item.h;
        el.style.width = `${w * cellSize}px`;
        el.style.height = `${h * cellSize}px`;
        el.style.left = `${item.x * (cellSize + 1)}px`;
        el.style.top = `${item.y * (cellSize + 1)}px`;
        el.innerText = item.name;
        grid.appendChild(el);
    });
}

// 5. ACCIONES DE METADATOS
async function updateCurrency(playerId, type, amount) {
    const metadata = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(metadata[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[playerId]) data.inventories[playerId] = { items: [], coins: {}, enabledSlots: [] };
    if (!data.inventories[playerId].coins) data.inventories[playerId].coins = {};
    
    data.inventories[playerId].coins[type] = amount;
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

async function toggleSlot(x, y) {
    const metadata = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(metadata[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[viewedPlayerId]) data.inventories[viewedPlayerId] = { items: [], coins: {}, enabledSlots: [] };
    
    const slots = data.inventories[viewedPlayerId].enabledSlots || [];
    const key = `${x},${y}`;
    const index = slots.indexOf(key);
    index > -1 ? slots.splice(index, 1) : slots.push(key);
    
    data.inventories[viewedPlayerId].enabledSlots = slots;
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

window.addNewItem = async () => {
    const metadata = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(metadata[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[viewedPlayerId]) data.inventories[viewedPlayerId] = { items: [], coins: {}, enabledSlots: ["0,0"] };
    
    const inv = data.inventories[viewedPlayerId];
    const newItem = { id: crypto.randomUUID(), name: "ITEM", x: 0, y: 0, w: 1, h: 1, rotated: false };
    
    // Buscar primer slot habilitado
    let found = (inv.enabledSlots || []).length > 0;
    if (found) {
        const firstSlot = inv.enabledSlots[0].split(',');
        newItem.x = parseInt(firstSlot[0]);
        newItem.y = parseInt(firstSlot[1]);
        inv.items.push(newItem);
        await OBR.scene.setMetadata({ [METADATA_KEY]: data });
    } else {
        OBR.notification.show("Primero habilita espacios en la mochila");
    }
};