import OBR from "@owlbear-rodeo/sdk";

const METADATA_KEY = "com.heirenstuff.inventory/data";
let myId, myRole, viewedPlayerId;

OBR.onReady(async () => {
    myId = await OBR.player.getId();
    myRole = await OBR.player.getRole();
    viewedPlayerId = myId;

    if (myRole === "GM") {
        document.getElementById('dm-controls').style.display = 'block';
        document.getElementById('player-selector').style.display = 'block';
        setupDMView();
    }

    // Suscribirse a cambios
    OBR.scene.onMetadataChange((metadata) => {
        render(metadata[METADATA_KEY] || { inventories: {} });
    });

    // Carga inicial manual
    const metadata = await OBR.scene.getMetadata();
    render(metadata[METADATA_KEY] || { inventories: {} });
});

async function setupDMView() {
    const selector = document.getElementById('player-selector');
    
    const updateList = async () => {
        const players = await OBR.party.getPlayers();
        const myName = await OBR.player.getName();
        let options = `<option value="${myId}">${myName} (Tú)</option>`;
        players.forEach(p => {
            options += `<option value="${p.id}">${p.name}</option>`;
        });
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

function render(data) {
    const inventories = data.inventories || {};
    const inv = inventories[viewedPlayerId] || { items: [], coins: 0, enabledSlots: [] };
    
    // Si no hay slots, crear 4x4 por defecto para el dueño
    if (!inv.enabledSlots || inv.enabledSlots.length === 0) {
        inv.enabledSlots = [];
        for(let y=0; y<4; y++) for(let x=0; x<4; x++) inv.enabledSlots.push(`${x},${y}`);
    }

    const grid = document.getElementById('grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Dibujar 80 celdas
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 8; x++) {
            const slot = document.createElement('div');
            const isEnabled = inv.enabledSlots.includes(`${x},${y}`);
            slot.className = `slot ${isEnabled ? '' : 'locked'}`;
            if (myRole === "GM") {
                slot.onclick = () => toggleSlot(x, y);
            }
            grid.appendChild(slot);
        }
    }

    // Dibujar Items
    const cellSize = 40;
    const items = inv.items || [];
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

    document.getElementById('coin-count').value = inv.coins || 0;
}

async function toggleSlot(x, y) {
    const metadata = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(metadata[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[viewedPlayerId]) data.inventories[viewedPlayerId] = { items: [], coins: 0, enabledSlots: [] };
    
    const slots = data.inventories[viewedPlayerId].enabledSlots;
    const key = `${x},${y}`;
    const index = slots.indexOf(key);
    
    if (index > -1) slots.splice(index, 1);
    else slots.push(key);
    
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

window.addNewItem = async () => {
    const metadata = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(metadata[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[viewedPlayerId]) data.inventories[viewedPlayerId] = { items: [], coins: 0, enabledSlots: ["0,0"] };
    
    const inv = data.inventories[viewedPlayerId];
    const newItem = { id: crypto.randomUUID(), name: "ITEM", x: 0, y: 0, w: 1, h: 1, rotated: false };
    
    // Colocar en el primer slot libre que encuentre
    let found = false;
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 8; x++) {
            if (inv.enabledSlots.includes(`${x},${y}`)) {
                newItem.x = x; newItem.y = y;
                inv.items.push(newItem);
                found = true; break;
            }
        }
        if (found) break;
    }
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
};