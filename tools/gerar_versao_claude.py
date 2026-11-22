"""Gera a versão do jogo para o link do Claude (Artifact) a partir do index.html.

Uso: python3 tools/gerar_versao_claude.py <arquivo_de_saida.html>

- remove os blocos <!-- APP:START --> ... <!-- APP:END --> (manifesto e modo offline, que só servem no app)
- troca o three.js local pelo do cdnjs (o link do Claude só aceita scripts de CDNs permitidos)
- tira <html>/<head>/<body>, que o Claude adiciona sozinho
"""
import re, sys
s = open('index.html', encoding='utf-8').read()
s = re.sub(r'<!-- APP:START.*?<!-- APP:END -->\n?', '', s, flags=re.S)
s = re.sub(r'<!-- THREE:START -->.*?<!-- THREE:END -->',
           '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', s, flags=re.S)
head, body = s.split('<head>\n', 1)[1].split('</head>', 1)
head = re.sub(r'<meta charset="utf-8">\n|<meta name="viewport"[^>]*>\n|<title>Mina Idle</title>\n', '', head)
body = body.replace('<body>\n', '', 1).replace('</body>\n</html>\n', '')
out = '<title>Mina Idle</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + head + body
open(sys.argv[1], 'w', encoding='utf-8').write(out)
print('ok', sys.argv[1])
