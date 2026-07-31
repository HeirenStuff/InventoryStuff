import OBR from "@owlbear-rodeo/sdk";

// 1. CONSTANTES Y VARIABLES GLOBALES
const METADATA_KEY = "com.heirenstuff.inventory/data";
let myId, myRole, viewedPlayerId;

// 2. INICIALIZACIÓN
OBR.onReady(async () => {
    myId = await OBR.player.getId();
    myRole = await OBR.player.getRole();
    viewedPlayerId = myId; 

    if (myRole === "GM") {
        setupDMView();
    }

    OBR.scene.onMetadataChange((metadata) => {
        const data = metadata[METADATA_KEY] || { inventories: {} };
        render(data);
    });
});

// 3. CONFIGURACIÓN VISTA DM
async function setupDMView() {
    const selector = document.getElementById('player-selector');
    const controls = document.getElementById('dm-controls');
    if (!selector || !controls) return;

    selector.classList.remove('hidden');
    controls.classList.remove('hidden');

    const updateList = async () => {
        const players = await OBR.party.getPlayers();
        selector.innerHTML = `<option value="${myId}">Mi Inventario (DM)</option>`;
        players.forEach(p => {
            selector.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    };

    selector.onchange = (e) => {
        viewedPlayerId = e.target.value;
        OBR.scene.getMetadata().then(meta => render(meta[METADATA_KEY] || { inventories: {} }));
    };

    OBR.party.onChange(updateList);
    updateList();
}

// 4. RENDERIZADO VISUAL
function render(data) {
    const inv = data.inventories[viewedPlayerId] || { items: [], coins: 0 };
    const coinInput = document.getElementById('coin-count');
    const grid = document.getElementById('grid');
    const ownerName = document.getElementById('owner-name');

    if (coinInput) {
        coinInput.value = inv.coins;
        coinInput.disabled = (myRole !== "GM");
        coinInput.onchange = (e) => updateCoins(viewedPlayerId, parseInt(e.target.value));
    }

    if (grid) {
        grid.innerHTML = '';
        const cellSize = 50;
        inv.items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'item';
            const w = item.rotated ? item.h : item.w;
            const h = item.rotated ? item.w : item.h;
            el.style.width = `${w * cellSize}px`;
            el.style.height = `${h * cellSize}px`;
            el.style.left = `${item.x * cellSize}px`;
            el.style.top = `${item.y * cellSize}px`;
            el.innerText = item.name;
            grid.appendChild(el);
        });
    }
}

// 5. LÓGICA DE COLISIONES
function isSpaceAvailable(newItem, currentItems) {
    const GRID_WIDTH = 8;
    const GRID_HEIGHT = 12;
    const w = newItem.rotated ? newItem.h : newItem.w;
    const h = newItem.rotated ? newItem.w : newItem.h;

    if (newItem.x < 0 || newItem.y < 0 || newItem.x + w > GRID_WIDTH || newItem.y + h > GRID_HEIGHT) return false;

    return !currentItems.some(item => {
        if (item.id === newItem.id) return false;
        const itemW = item.rotated ? item.h : item.w;
        const itemH = item.rotated ? item.w : item.h;
        return newItem.x < item.x + itemW && newItem.x + w > item.x && newItem.y < item.y + itemH && newItem.y + h > item.y;
    });
}

// 6. ACCIONES
async function updateCoins(playerId, amount) {
    const metadata = await OBR.scene.getMetadata();
    const data = metadata[METADATA_KEY] || { inventories: {} };
    if (!data.inventories[playerId]) data.inventories[playerId] = { items: [], coins: 0 };
    data.inventories[playerId].coins = amount;
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

window.addNewItem = async () => {
    if (myRole !== "GM") return;
    const metadata = await OBR.scene.getMetadata();
    const data = metadata[METADATA_KEY] || { inventories: {} };
    if (!data.inventories[viewedPlayerId]) data.inventories[viewedPlayerId] = { items: [], coins: 0 };

    const newItem = { id: Math.random().toString(36), name: "Item", x: 0, y: 0, w: 2, h: 1, rotated: false };
    
    let placed = false;
    for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 8; x++) {
            newItem.x = x; newItem.y = y;
            if (isSpaceAvailable(newItem, data.inventories[viewedPlayerId].items)) {
                data.inventories[viewedPlayerId].items.push(newItem);
                placed = true; break;
            }
        }
        if (placed) break;
    }
    if (placed) await OBR.scene.setMetadata({ [METADATA_KEY]: data });
    else OBR.notification.show("No hay espacio");
};