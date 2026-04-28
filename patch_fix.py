from pathlib import Path
p = Path("app/vote/candidate/page.tsx")
t = p.read_text(encoding="utf-8")
target = 'transactionHash || "CET-VOTE-2026-XXXX-XXXX-XXXX"\n\t\t\t\t\t\t<div class="mb-8">'
replacement = 'transactionHash || "CET-VOTE-2026-XXXX-XXXX-XXXX"\n\t\t\t\t\t\t\t</p>\n\t\t\t\t\t</div>\n\n\t\t\t\t\t<div class="mb-8">'
if target not in t:
    raise SystemExit("pattern not found")
p.write_text(t.replace(target, replacement), encoding="utf-8")
print("patched")
