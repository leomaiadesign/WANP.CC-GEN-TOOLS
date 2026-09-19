#!/bin/bash

# Vai para a pasta onde o arquivo .command está salvo
cd "$(dirname "$0")"

# Adiciona todas as mudanças
git add .

# Verifica se você passou uma mensagem de commit. Se não, usa a data atual.
if [ -z "$1" ]; then
  COMMIT_MSG="Atualização: $(date +'%Y-%m-%d %H:%M:%S')"
else
  COMMIT_MSG="$1"
fi

# Faz o commit com a mensagem
git commit -m "$COMMIT_MSG"

# Envia para o GitHub
git push origin main

echo "✅ Código atualizado no GitHub com sucesso!"
