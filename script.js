async function init() {
    OBR.onReady(async () => {
        const name = await OBR.player.getName();
        const role = await OBR.player.getRole();

        const nameElement = document.getElementById("player-name");
        const roleElement = document.getElementById("player-role");

        nameElement.innerText = name;
        roleElement.innerText = role;
        roleElement.className = role === "GM" ? "role-gm" : "role-player";
    });
}

init();