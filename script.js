import OBR from "@owlbear-rodeo/sdk";

const grid = document.getElementById('grid');
const coinInput = document.getElementById('coin-count');

// 1. Inicializar la extensión
OBR.onReady(() => {
    console.log("Inventario RE conectado");
    
    // Comprobar si el usuario es el DM
    OBR.player.getRole().then(role => {
        if (role === "GM") {
            document.getElementById('dm-controls').classList.remove('hidden');
        }
    });

    // Escuchar cambios en los datos de la escena
    OBR.scene.onMetadataChange((metadata) => {
        // Aquí actualizaremos visualmente el inventario cuando el DM cambie algo
        renderInventory(metadata["com.tuusuario.inventory/data"]);
    });
});


//Logica del inventario
function renderInventory(data) {
    const container = document.getElementById('grid');
    const cellSize = 50; // Tamaño de cada cuadro en px
    container.innerHTML = ''; 
  
    data.items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'item';
      el.innerText = item.name;
      
      // Si está rotado, invertimos w y h para el estilo
      const displayW = item.rotated ? item.h : item.w;
      const displayH = item.rotated ? item.w : item.h;
  
      el.style.width = `${displayW * cellSize}px`;
      el.style.height = `${displayH * cellSize}px`;
      el.style.left = `${item.x * cellSize}px`;
      el.style.top = `${item.y * cellSize}px`;
      
      // Solo el DM podría tener el botón de rotar en el item
      el.onclick = () => rotateItem(item.id); 
      
      container.appendChild(el);
    });
  }

async function updateCoins(amount) {
    const role = await OBR.player.getRole();
    if (role !== "GM") return; // Si no es DM, se cancela.
  
    const metadata = await OBR.scene.getMetadata();
    const currentData = metadata["com.tu_extension.inventory"] || { coins: 0, items: [] };
    
    await OBR.scene.setMetadata({
      "com.tu_extension.inventory": {
        ...currentData,
        coins: amount
      }
    });
  }

  /**
 * Comprueba si un ítem puede colocarse en una posición específica.
 * @param {Object} newItem - El ítem con x, y, w, h y rotated.
 * @param {Array} currentItems - Lista de ítems existentes en el inventario.
 * @returns {boolean} - true si el espacio está libre.
 */

function isSpaceAvailable(newItem, currentItems) {
    const GRID_WIDTH = 8; // Define el ancho de tu cuadrícula
    const GRID_HEIGHT = 12; // Define el alto de tu cuadrícula

    // Calcular dimensiones reales según rotación
    const finalW = newItem.rotated ? newItem.h : newItem.w;
    const finalH = newItem.rotated ? newItem.w : newItem.h;

    // 1. Validar límites de la cuadrícula
    if (newItem.x < 0 || newItem.y < 0 || 
        newItem.x + finalW > GRID_WIDTH || 
        newItem.y + finalH > GRID_HEIGHT) {
        return false;
    }

    // 2. Validar colisión con otros ítems (AABB Collision)
    for (const item of currentItems) {
        // No chocar consigo mismo si estamos moviendo uno existente
        if (item.id === newItem.id) continue;

        const itemW = item.rotated ? item.h : item.w;
        const itemH = item.rotated ? item.w : item.h;

        if (
            newItem.x < item.x + itemW &&
            newItem.x + finalW > item.x &&
            newItem.y < item.y + itemH &&
            newItem.y + finalH > item.y
        ) {
            return false; // Hay una colisión
        }
    }

    return true; // Espacio libre
}

// DM añade item
async function addItemAsGM(name, w, h) {
    const role = await OBR.player.getRole();
    if (role !== "GM") return;

    const metadata = await OBR.scene.getMetadata();
    const data = metadata["com.tu_extension.inventory"] || { coins: 0, items: [] };

    const newItem = {
        id: crypto.randomUUID(),
        name: name,
        x: 0,
        y: 0,
        w: w,
        h: h,
        rotated: false
    };

    // Intentar buscar el primer espacio libre automáticamente
    let placed = false;
    for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 8; x++) {
            newItem.x = x;
            newItem.y = y;
            if (isSpaceAvailable(newItem, data.items)) {
                data.items.push(newItem);
                placed = true;
                break;
            }
        }
        if (placed) break;
    }

    if (placed) {
        await OBR.scene.setMetadata({ "com.tu_extension.inventory": data });
    } else {
        OBR.notification.show("No hay espacio en el inventario");
    }
}