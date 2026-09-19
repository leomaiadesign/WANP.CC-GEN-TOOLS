#!/bin/bash

# Vai para a pasta onde o arquivo .command está salvo
cd "$(dirname "$0")"

echo "⏳ Atualizando o GitHub..."

# Adiciona todas as mudanças
git add .

# Faz o commit com a mensagem da data atual
COMMIT_MSG="Atualização: $(date +'%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG"

# Envia para o GitHub e verifica se deu certo
if git push origin main; then
    echo ""
    echo "✅ Código atualizado no GitHub com sucesso!"
    # Toca um som de sucesso no Mac
    afplay /System/Library/Sounds/Glass.aiff &
else
    echo ""
    echo "❌ Erro ao enviar para o GitHub. Verifique sua conexão ou conflitos."
    afplay /System/Library/Sounds/Basso.aiff &
fi

echo ""
echo "Você pode fechar esta janela agora."
# Mantém a janela aberta até você apertar alguma tecla (para poder ler a mensagem de sucesso)
read -p "Pressione [Enter] para sair..."
