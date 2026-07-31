import OBR from "@owlbear-rodeo/sdk";

const METADATA_KEY = "com.heirenstuff.inventory/data";
let myId, myRole, viewedPlayerId;

OBR.onReady(async () => {
    myId = await OBR.player.getId();
    myRole = await OBR.player.getRole();
    viewedPlayerId = myId;
    if (myRole === "GM") setupDMView();
    OBR.scene.onMetadataChange((metadata) => render(metadata[METADATA_KEY] || { inventories: {} }));
});

async function setupDMView() {
    const selector = document.getElementById('player-selector');
    selector.classList.remove('hidden');
    document.getElementById('dm-controls').classList.remove('hidden');
    
    const updateList = async () => {
        const players = await OBR.party.getPlayers();
        selector.innerHTML = `<option value="${myId}">Mi Mochila</option>`;
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
    const inv = data.inventories[viewedPlayerId] || { items: [], coins: 0, enabledSlots: [] };
    const grid = document.getElementById('grid');
    const cellSize = 40;
    grid.innerHTML = '';

    // Si no tiene slots definidos, inicializar mochila básica 5x5
    if (!inv.enabledSlots || inv.enabledSlots.length === 0) {
        inv.enabledSlots = [];
        for(let y=0; y<5; y++) for(let x=0; x<5; x++) inv.enabledSlots.push(`${x},${y}`);
    }

    // Dibujar fondo (slots)
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 8; x++) {
            const slot = document.createElement('div');
            const isEnabled = inv.enabledSlots.includes(`${x},${y}`);
            slot.className = `slot ${isEnabled ? '' : 'locked'}`;
            if (myRole === "GM") {
                slot.onclick = () => toggleSlot(x, y); // El DM hace clic para habilitar/deshabilitar
            }
            grid.appendChild(slot);
        }
    }

    // Dibujar Items
    inv.items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'item';
        const w = item.rotated ? item.h : item.w;
        const h = item.rotated ? item.w : item.h;
        el.style.width = `${w * cellSize}px`;
        el.style.height = `${h * cellSize}px`;
        el.style.left = `${item.x * cellSize + (item.x)}px`; // +item.x por el gap
        el.style.top = `${item.y * cellSize + (item.y)}px`;
        el.innerText = item.name;
        grid.appendChild(el);
    });

    document.getElementById('coin-count').value = inv.coins;
}

async function toggleSlot(x, y) {
    const metadata = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(metadata[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[viewedPlayerId]) data.inventories[viewedPlayerId] = { items: [], coins: 0, enabledSlots: [] };
    
    const slotKey = `${x},${y}`;
    const index = data.inventories[viewedPlayerId].enabledSlots.indexOf(slotKey);
    if (index > -1) data.inventories[viewedPlayerId].enabledSlots.splice(index, 1);
    else data.inventories[viewedPlayerId].enabledSlots.push(slotKey);
    
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

function isSpaceAvailable(newItem, inv) {
    const w = newItem.rotated ? newItem.h : newItem.w;
    const h = newItem.rotated ? newItem.w : newItem.h;
    
    for (let iy = 0; iy < h; iy++) {
        for (let ix = 0; ix < w; ix++) {
            if (!inv.enabledSlots.includes(`${newItem.x + ix},${newItem.y + iy}`)) return false;
        }
    }
    return !inv.items.some(item => {
        if (item.id === newItem.id) return false;
        const iW = item.rotated ? item.h : item.w;
        const iH = item.rotated ? item.w : item.h;
        return newItem.x < item.x + iW && newItem.x + w > item.x && newItem.y < item.y + iH && newItem.y + h > item.y;
    });
}

window.addNewItem = async () => {
    const metadata = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(metadata[METADATA_KEY] || { inventories: {} }));
    const inv = data.inventories[viewedPlayerId];
    
    const newItem = { id: crypto.randomUUID(), name: "OBJETO", x: 0, y: 0, w: 1, h: 1, rotated: false };
    let placed = false;
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 8; x++) {
            newItem.x = x; newItem.y = y;
            if (isSpaceAvailable(newItem, inv)) {
                inv.items.push(newItem);
                placed = true; break;
            }
        }
        if (placed) break;
    }
    if (placed) await OBR.scene.setMetadata({ [METADATA_KEY]: data });
};