import OBR from "@owlbear-rodeo/sdk";

const METADATA_KEY = "com.heirenstuff.inventory/data";
let myId, myRole, viewedPlayerId;

OBR.onReady(async () => {
    myId = await OBR.player.getId();
    myRole = await OBR.player.getRole();
    viewedPlayerId = myId;

    if (myRole === "GM") {
        document.getElementById('dm-controls').classList.remove('hidden');
        document.getElementById('player-selector').classList.remove('hidden');
        setupDMView();
    }

    // Carga inicial
    const metadata = await OBR.scene.getMetadata();
    render(metadata[METADATA_KEY] || { inventories: {} });

    // Escuchar cambios
    OBR.scene.onMetadataChange((metadata) => {
        render(metadata[METADATA_KEY] || { inventories: {} });
    });
});

async function setupDMView() {
    const selector = document.getElementById('player-selector');
    const updateList = async () => {
        const players = await OBR.party.getPlayers();
        const me = await OBR.player.getName();
        selector.innerHTML = `<option value="${myId}">${me} (Tú)</option>`;
        players.forEach(p => selector.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    };
    selector.onchange = (e) => {
        viewedPlayerId = e.target.value;
        OBR.scene.getMetadata().then(meta => render(meta[METADATA_KEY] || { inventories: {} }));
    };
    OBR.party.onChange(updateList);
    updateList();
}

function render(data) {
    const allInventories = data.inventories || {};
    const inv = allInventories[viewedPlayerId] || { items: [], coins: 0, enabledSlots: [] };
    
    // Si no hay slots habilitados, mostrar un cuadrado 4x4 por defecto
    const slots = inv.enabledSlots || [];
    if (slots.length === 0 && viewedPlayerId === myId) {
        for(let y=0; y<4; y++) for(let x=0; x<4; x++) slots.push(`${x},${y}`);
    }

    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    // Generar 80 slots (8x10)
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 8; x++) {
            const slot = document.createElement('div');
            const isEnabled = slots.includes(`${x},${y}`);
            slot.className = `slot ${isEnabled ? '' : 'locked'}`;
            if (myRole === "GM") {
                slot.onclick = () => toggleSlot(x, y);
            }
            grid.appendChild(slot);
        }
    }

    // Dibujar Items
    const cellSize = 40;
    (inv.items || []).forEach(item => {
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

    document.getElementById('coin-count').value = inv.coins || 0;
    document.getElementById('owner-name').innerText = (viewedPlayerId === myId) ? "MI INVENTARIO" : "INVENTARIO AJENO";
}

async function toggleSlot(x, y) {
    const metadata = await OBR.scene.getMetadata();
    let data = JSON.parse(JSON.stringify(metadata[METADATA_KEY] || { inventories: {} }));
    
    if (!data.inventories[viewedPlayerId]) {
        data.inventories[viewedPlayerId] = { items: [], coins: 0, enabledSlots: [] };
    }
    
    const slots = data.inventories[viewedPlayerId].enabledSlots;
    const key = `${x},${y}`;
    const index = slots.indexOf(key);
    
    if (index > -1) slots.splice(index, 1);
    else slots.push(key);
    
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

window.addNewItem = async () => {
    const metadata = await OBR.scene.getMetadata();
    let data = JSON.parse(JSON.stringify(metadata[METADATA_KEY] || { inventories: {} }));
    const inv = data.inventories[viewedPlayerId] || { items: [], coins: 0, enabledSlots: ["0,0"] };
    
    const newItem = { id: crypto.randomUUID(), name: "OBJETO", x: 0, y: 0, w: 1, h: 1, rotated: false };
    
    // Buscar primer slot habilitado para intentar colocarlo
    let placed = false;
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 8; x++) {
            newItem.x = x; newItem.y = y;
            if (inv.enabledSlots.includes(`${x},${y}`)) { // Simplificación para test
                inv.items.push(newItem);
                placed = true; break;
            }
        }
        if (placed) break;
    }

    data.inventories[viewedPlayerId] = inv;
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
};