from pathlib import Path

path = Path(__file__).with_name("bot_entry.py")
text = path.read_text(encoding="utf-8")
replacements = {
    '    state = bot.SESSIONS.setdefault(numero_cliente, bot.new_session())\n': '    state = bot.state_for(numero_cliente)\n',
    '    message = bot.normalize_text(mensaje)\n': '    message = str(mensaje or "").strip().lower()\n',
    '        if bot.is_yes(mensaje):\n            identity = await bot.find_client_by_whatsapp_phone(numero_cliente)\n            if identity:\n                await bot.show_client_menu(numero_cliente, state, identity)\n            else:\n                state["mode"] = "ASK_USERNAME"\n                await bot.enviar_whatsapp(\n                    numero_cliente,\n                    "No pude identificar este WhatsApp automáticamente.\\n\\nEscribe tu *usuario de acceso* para continuar.",\n                )\n            return\n': '        if bot.is_yes(mensaje):\n            state["identity"] = None\n            state["data"] = {}\n            state["mode"] = "CLIENT_USERNAME"\n            await bot.enviar_whatsapp(\n                numero_cliente,\n                "Escribe tu *usuario asignado en WispHub* para identificar tu cuenta.",\n            )\n            return\n',
    '            state["mode"] = "ASK_USERNAME"\n            await bot.enviar_whatsapp(numero_cliente, "Escribe tu *usuario de acceso* de WispHub.")\n': '            state["identity"] = None\n            state["data"] = {}\n            state["mode"] = "CLIENT_USERNAME"\n            await bot.enviar_whatsapp(\n                numero_cliente,\n                "Escribe tu *usuario asignado en WispHub* para identificar tu cuenta.",\n            )\n',
    '    if mode == "ASK_USERNAME":\n        identity = await find_client_by_username(mensaje)\n        if identity:\n            await bot.show_client_menu(numero_cliente, state, identity)\n        else:\n            await bot.enviar_whatsapp(\n                numero_cliente,\n                "No encontré ese usuario. Verifica que esté escrito correctamente o escribe *MENU* para empezar de nuevo.",\n            )\n        return\n': '    if mode == "CLIENT_USERNAME":\n        await bot.enviar_whatsapp(numero_cliente, "🔎 Buscando tu cuenta en WispHub...")\n        identity = await find_client_by_username(mensaje)\n        if identity:\n            status = str(identity.get("status") or "").strip() or "Sin estado disponible"\n            await bot.enviar_whatsapp(\n                numero_cliente,\n                f"✅ *¡Te encontré!*\\n\\n👤 {bot.display_name(identity)}\\n📊 Estado: *{status}*",\n            )\n            await bot.show_client_menu(numero_cliente, state, identity)\n        else:\n            await bot.enviar_whatsapp(\n                numero_cliente,\n                "No encontré ese *usuario en WispHub*. Verifica que esté escrito correctamente o escribe *HOLA* para reiniciar.",\n            )\n        return\n',
}
for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new, 1)
    elif new not in text:
        # Some targets may already have been transformed by a previous compatibility pass.
        if 'ASK_USERNAME' in old and 'CLIENT_USERNAME' in text:
            continue
        raise SystemExit(f"Expected compatibility target not found: {old.strip()}")
path.write_text(text, encoding="utf-8")
print("BOT_ENTRY_COMPAT_OK=1")
