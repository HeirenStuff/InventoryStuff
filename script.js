import OBR from "@owlbear-rodeo/sdk";

const METADATA_KEY = "com.heirenstuff.inventory/data";
let myId, myRole, viewedPlayerId;

OBR.onReady(async () => {
    myId = await OBR.player.getId();
    myRole = await OBR.player.getRole();
    viewedPlayerId = myId;

    const nameDisplay = document.getElementById('owner-name');
    nameDisplay.innerText = "Mi Inventario";

    if (myRole === "GM") {
        setupDMView();
    }

    OBR.scene.onMetadataChange((metadata) => {
        const data = metadata[METADATA_KEY] || { inventories: {} };
        render(data);
    });
});

async function setupDMView() {
    const selector = document.getElementById('player-selector');
    const controls = document.getElementById('dm-controls');
    selector.classList.remove('hidden');
    controls.classList.remove('hidden');

    const updateList = async () => {
        const players = await OBR.party.getPlayers();
        const currentPlayerName = await OBR.player.getName();
        selector.innerHTML = `<option value="${myId}">${currentPlayerName} (Tú)</option>`;
        players.forEach(p => {
            selector.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    };

    selector.onchange = (e) => {
        viewedPlayerId = e.target.value;
        const nameDisplay = document.getElementById('owner-name');
        nameDisplay.innerText = e.target.options[e.target.selectedIndex].text;
        OBR.scene.getMetadata().then(meta => render(meta[METADATA_KEY] || { inventories: {} }));
    };

    OBR.party.onChange(updateList);
    updateList();
}

function render(data) {
    const inv = data.inventories[viewedPlayerId] || { items: [], coins: 0 };
    const coinInput = document.getElementById('coin-count');
    const grid = document.getElementById('grid');

    coinInput.value = inv.coins;
    coinInput.disabled = (myRole !== "GM");
    coinInput.onchange = (e) => updateCoins(viewedPlayerId, parseInt(e.target.value));

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

function isSpaceAvailable(newItem, currentItems) {
    const w = newItem.rotated ? newItem.h : newItem.w;
    const h = newItem.rotated ? newItem.w : newItem.h;
    if (newItem.x < 0 || newItem.y < 0 || newItem.x + w > 8 || newItem.y + h > 12) return false;
    return !currentItems.some(item => {
        const itemW = item.rotated ? item.h : item.w;
        const itemH = item.rotated ? item.w : item.h;
        return newItem.x < item.x + itemW && newItem.x + w > item.x && newItem.y < item.y + itemH && newItem.y + h > item.y;
    });
}

async function updateCoins(playerId, amount) {
    const metadata = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(metadata[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[playerId]) data.inventories[playerId] = { items: [], coins: 0 };
    data.inventories[playerId].coins = amount;
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

window.addNewItem = async () => {
    const metadata = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(metadata[METADATA_KEY] || { inventories: {} }));
    if (!data.inventories[viewedPlayerId]) data.inventories[viewedPlayerId] = { items: [], coins: 0 };

    const newItem = { id: crypto.randomUUID(), name: "NUEVO OBJETO", x: 0, y: 0, w: 2, h: 1, rotated: false };
    
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
    else OBR.notification.show("No hay espacio en este inventario");
};