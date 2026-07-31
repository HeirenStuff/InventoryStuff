OBR.onReady(async () => {
    const name = await OBR.player.getName();
    const role = await OBR.player.getRole();
    
    document.getElementById("status").innerText = `Hola ${name}, eres ${role}`;
});