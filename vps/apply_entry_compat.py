from pathlib import Path

path = Path(__file__).with_name("bot_entry.py")
text = path.read_text(encoding="utf-8")
replacements = {
    '    state = bot.SESSIONS.setdefault(numero_cliente, bot.new_session())\n': '    state = bot.state_for(numero_cliente)\n',
    '    message = bot.normalize_text(mensaje)\n': '    message = str(mensaje or "").strip().lower()\n',
}
for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new, 1)
    elif new not in text:
        raise SystemExit(f"Expected compatibility target not found: {old.strip()}")
path.write_text(text, encoding="utf-8")
print("BOT_ENTRY_COMPAT_OK=1")
