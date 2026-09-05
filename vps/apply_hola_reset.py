from pathlib import Path

ENTRY_OLD = '''    # Antes de identificar una cuenta, el bot histórico pide el usuario de
    # WiFi Rapidito. Una vez identificado, MENU vuelve directamente al menú.
    if message in {"menu", "menú", "volver", "inicio"} or message.startswith("hola") or message.startswith("buenas"):
        if state.get("identity"):
            await bot.show_client_menu(numero_cliente, state, state["identity"])
        else:
            state["mode"] = "START"
            state["identity"] = None
            state["data"] = {}
            await bot.enviar_whatsapp(numero_cliente, bot.MENU_BIENVENIDA)
        return
'''

ENTRY_NEW = '''    # HOLA es un reinicio absoluto de la conversación: borra identidad y
    # cualquier flujo transitorio para volver al inicio, incluso si el cliente
    # ya estaba identificado. INICIO/REINICIAR tienen el mismo comportamiento.
    full_reset = (
        re.fullmatch(r"hola[!¡?.\\s]*", message) is not None
        or message in {"inicio", "reiniciar", "reset"}
    )
    if full_reset:
        state["mode"] = "START"
        state["identity"] = None
        state["data"] = {}
        await bot.enviar_whatsapp(numero_cliente, bot.MENU_BIENVENIDA)
        return

    # MENU/VOLVER conserva la comodidad de regresar al panel cuando ya existe
    # una cuenta identificada; si no, vuelve a la bienvenida.
    if message in {"menu", "menú", "volver"} or message.startswith("buenas"):
        if state.get("identity"):
            await bot.show_client_menu(numero_cliente, state, state["identity"])
        else:
            state["mode"] = "START"
            state["identity"] = None
            state["data"] = {}
            await bot.enviar_whatsapp(numero_cliente, bot.MENU_BIENVENIDA)
        return
'''


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"No se encontró el bloque esperado en {path}")
    path.write_text(text.replace(old, new, 1))


def main() -> None:
    root = Path(__file__).resolve().parent
    replace_once(root / "bot_entry.py", ENTRY_OLD, ENTRY_NEW)

    flows = root / "bot_flows.py"
    old_menu = 'Escribe el número de la opción 👇"""'
    new_menu = 'Escribe el número de la opción 👇\n\n_Para reiniciar completamente, escribe *HOLA*._"""'
    replace_once(flows, old_menu, new_menu)


if __name__ == "__main__":
    main()
