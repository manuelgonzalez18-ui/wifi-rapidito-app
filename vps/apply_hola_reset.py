from pathlib import Path
import re

RESET_BLOCK = '''    # HOLA es un reinicio absoluto de la conversación: borra identidad y
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

'''


def patch_entry(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if "full_reset = (" in text:
        return

    # Current reconstructed entry: replace its direct HOLA reset with the
    # stricter full-reset block. This form remains valid after entry_compat.
    current = '''    if message.startswith("hola"):
        state["mode"] = "START"
        state["identity"] = None
        state["data"] = {}
        await bot.enviar_whatsapp(numero_cliente, bot.MENU_BIENVENIDA)
        return

'''
    if current in text:
        text = text.replace(current, RESET_BLOCK, 1)
        path.write_text(text, encoding="utf-8")
        return

    # Compatibility with the older historical block.
    old = '''    # Antes de identificar una cuenta, el bot histórico pide el usuario de
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
    if old in text:
        menu_block = '''    if message in {"menu", "menú", "volver"} or message.startswith("buenas"):
        if state.get("identity"):
            await bot.show_client_menu(numero_cliente, state, state["identity"])
        else:
            state["mode"] = "START"
            state["identity"] = None
            state["data"] = {}
            await bot.enviar_whatsapp(numero_cliente, bot.MENU_BIENVENIDA)
        return
'''
        text = text.replace(old, RESET_BLOCK + menu_block, 1)
        path.write_text(text, encoding="utf-8")
        return

    raise SystemExit(f"No se encontró un bloque HOLA compatible en {path}")


def patch_menu(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    marker = "_Para reiniciar completamente, escribe *HOLA*._"
    if marker in text:
        return
    old = 'Escribe el número de la opción 👇"""'
    new = 'Escribe el número de la opción 👇\\n\\n_Para reiniciar completamente, escribe *HOLA*._"""'
    if old not in text:
        raise SystemExit(f"No se encontró el texto de menú esperado en {path}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def main() -> None:
    root = Path(__file__).resolve().parent
    patch_entry(root / "bot_entry.py")
    patch_menu(root / "bot_flows.py")
    print("HOLA_RESET_PATCH_OK=1")


if __name__ == "__main__":
    main()
