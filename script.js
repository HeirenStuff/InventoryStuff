// No uses import si usas el script tag de unpkg en el HTML
const METADATA_KEY = "com.heirenstuff.inventory/data";
let myId, myRole, viewedPlayerId;

OBR.onReady(async () => {
    console.log("Owlbear Rodeo detectado y listo.");
    
    try {
        myId = await OBR.player.getId();
        myRole = await OBR.player.getRole();
        viewedPlayerId = myId;

        const badge = document.getElementById('role-badge');
        badge.innerText = `MODO: ${myRole}`;
        badge.style.color = myRole === "GM" ? "#cc9a49" : "#aaa";

        if (myRole === "GM") {
            document.getElementById('gm-console').classList.remove('hidden');
            setupDMView();
        }

        setupEvents();
        
        OBR.scene.onMetadataChange((metadata) => {
            render(metadata[METADATA_KEY] || { inventories: {} });
        });

        const metadata = await OBR.scene.getMetadata();
        render(metadata[METADATA_KEY] || { inventories: {} });
        
    } catch (error) {
        console.error("Error inicializando:", error);
    }
});

function setupEvents() {
    ['gold', 'silver', 'copper'].forEach(type => {
        const input = document.getElementById(`coin-${type}`);
        input.onchange = (e) => {
            if (myRole === "GM") updateCurrency(viewedPlayerId, type, parseInt(e.target.value) || 0);
        };
    });
    document.getElementById('btn-add').onclick = () => addNewItem();
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

function render(data) {
    const inv = (data.inventories || {})[viewedPlayerId] || { items: [], coins: {}, enabledSlots: [] };
    const coins = inv.coins || { gold: 0, silver: 0, copper: 0 };
    const enabledSlots = inv.enabledSlots || [];

    document.getElementById('coin-gold').value = coins.gold || 0;
    document.getElementById('coin-silver').value = coins.silver || 0;
    document.getElementById('coin-copper').value = coins.copper || 0;

    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 8; x++) {
            const slot = document.createElement('div');
            const isEnabled = enabledSlots.includes(`${x},${y}`);
            slot.className = `slot ${isEnabled ? '' : 'locked'}`;
            if (myRole === "GM") slot.onclick = () => toggleSlot(x, y);
            grid.appendChild(slot);
        }
    }

    (inv.items || []).forEach(item => {
        const el = document.createElement('div');
        el.className = 'item';
        const w = item.rotated ? item.h : item.w;
        const h = item.rotated ? item.w : item.h;
        el.style.width = `${w * 40}px`;
        el.style.height = `${h * 40}px`;
        el.style.left = `${item.x * 41}px`;
        el.style.top = `${item.y * 41}px`;
        el.innerText = item.name;
        grid.appendChild(el);
    });
}

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
    idx > -1 ? slots.splice(idx, 1) : slots.push(key);
    data.inventories[viewedPlayerId].enabledSlots = slots;
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}

async function addNewItem() {
    const meta = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(meta[METADATA_KEY] || { inventories: {} }));
    const inv = data.inventories[viewedPlayerId] || { items: [], coins: {}, enabledSlots: [] };
    if (!inv.enabledSlots || inv.enabledSlots.length === 0) {
        OBR.notification.show("Primero habilita espacios clicando en el grid.");
        return;
    }
    const [x, y] = inv.enabledSlots[0].split(',');
    inv.items.push({ id: crypto.randomUUID(), name: "NUEVO", x: parseInt(x), y: parseInt(y), w: 1, h: 1, rotated: false });
    data.inventories[viewedPlayerId] = inv;
    await OBR.scene.setMetadata({ [METADATA_KEY]: data });
}