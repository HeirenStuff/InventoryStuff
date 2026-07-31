const ID = "com.re.inventory/data";
let state = { myId: "", role: "PLAYER", viewId: "" };

const ITEMS = [
    { id: "p1", name: "Pistola", img: "https://i.ibb.co/LzNfG9m/pistol.png", w: 2, h: 2 },
    { id: "h1", name: "Hierba", img: "https://i.ibb.co/0M7V4y2/herb.png", w: 1, h: 1 },
    { id: "s1", name: "Escopeta", img: "https://i.ibb.co/vYm6X0p/shotgun.png", w: 3, h: 1 }
];

OBR.onReady(async () => {
    state.myId = await OBR.player.getId();
    state.role = await OBR.player.getRole();
    state.viewId = state.myId;

    initUI();
    
    // Observadores de cambio de rol y jugadores
    OBR.player.onChange(p => { state.role = p.role; updateGMVisibility(); });
    OBR.party.onChange(updatePlayerDropdown);
    OBR.scene.onMetadataChange(m => render(m[ID] || {}));

    // Sincronización inicial
    const meta = await OBR.scene.getMetadata();
    render(meta[ID] || {});
    updatePlayerDropdown();
});

function initUI() {
    updateGMVisibility();
    const cat = document.getElementById('catalog-select');
    ITEMS.forEach(i => cat.add(new Option(`${i.name} (${i.w}x${i.h})`, i.id)));
    
    document.getElementById('add-btn').onclick = addItem;
    ['gold', 'silver', 'copper'].forEach(c => {
        document.getElementById(`coin-${c}`).onchange = (e) => setCoins(c, e.target.value);
    });
}

function updateGMVisibility() {
    const isGM = state.role === "GM";
    document.getElementById('gm-panel').classList.toggle('hidden', !isGM);
    document.getElementById('role-badge').innerText = `MODO: ${state.role}`;
    document.getElementById('role-badge').style.color = isGM ? "#d4af37" : "#0f0";
}

async function updatePlayerDropdown() {
    if (state.role !== "GM") return;
    const players = await OBR.party.getPlayers();
    const sel = document.getElementById('player-select');
    const oldVal = sel.value;
    
    sel.innerHTML = `<option value="${state.myId}">Mi Inventario</option>`;
    players.forEach(p => sel.add(new Option(p.name, p.id)));
    sel.value = oldVal || state.myId;
    
    sel.onchange = (e) => {
        state.viewId = e.target.value;
        document.getElementById('view-title').innerText = e.target.options[e.target.selectedIndex].text.toUpperCase();
        OBR.scene.getMetadata().then(m => render(m[ID] || {}));
    };
}

function render(data) {
    const inv = data[state.viewId] || { items: [], coins: {}, slots: [] };
    
    // Monedas
    ['gold', 'silver', 'copper'].forEach(c => {
        document.getElementById(`coin-${c}`).value = inv.coins?.[c] || 0;
    });

    // Grid
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    for (let i = 0; i < 80; i++) {
        const x = i % 8, y = Math.floor(i / 8);
        const slot = document.createElement('div');
        slot.className = `slot ${inv.slots?.includes(`${x},${y}`) ? '' : 'locked'}`;
        if (state.role === "GM") slot.onclick = () => toggleSlot(x, y);
        grid.appendChild(slot);
    }

    // Items
    (inv.items || []).forEach(item => {
        const el = document.createElement('div');
        el.className = 'item';
        const w = item.rot ? item.h : item.w;
        const h = item.rot ? item.w : item.h;
        el.style.cssText = `width:${w*40}px; height:${h*40}px; left:${item.x*41}px; top:${item.y*41}px;`;
        el.innerHTML = `<img src="${item.img}">`;
        
        el.oncontextmenu = (e) => { e.preventDefault(); if (state.role === "GM") removeItem(item.uid); };
        el.onclick = (e) => { if (e.shiftKey) rotateItem(item.uid); };
        grid.appendChild(el);
    });
}

async function updateMeta(fn) {
    const m = await OBR.scene.getMetadata();
    const data = JSON.parse(JSON.stringify(m[ID] || {}));
    if (!data[state.viewId]) data[state.viewId] = { items: [], coins: {}, slots: [] };
    fn(data[state.viewId]);
    await OBR.scene.setMetadata({ [ID]: data });
}

const setCoins = (t, v) => updateMeta(inv => { if(!inv.coins) inv.coins={}; inv.coins[t] = parseInt(v) || 0; });
const toggleSlot = (x, y) => updateMeta(inv => {
    const k = `${x},${y}`;
    inv.slots = inv.slots?.includes(k) ? inv.slots.filter(s => s !== k) : [...(inv.slots || []), k];
});
const addItem = () => updateMeta(inv => {
    const template = ITEMS.find(i => i.id === document.getElementById('catalog-select').value);
    inv.items.push({ ...template, uid: crypto.randomUUID(), x: 0, y: 0, rot: false });
});
const removeItem = (uid) => updateMeta(inv => { inv.items = inv.items.filter(i => i.uid !== uid); });
const rotateItem = (uid) => updateMeta(inv => { 
    const i = inv.items.find(it => it.uid === uid);
    if(i) i.rot = !i.rot;
});