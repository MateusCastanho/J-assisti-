# Episódio

Aplicativo leve para acompanhar filmes, séries e próximos lançamentos. Sem comentários, resenhas ou sinopses.

## GitHub Pages

Em Settings → Pages, selecione **Deploy from a branch**, branch **main** e pasta **/docs**, e salve. Os arquivos usam caminhos relativos, compatíveis com sites de projeto.

## Sua biblioteca

O site público começa vazio. No app anterior, clique em **Exportar backup**; aqui, use **Importar meu backup**. A importação é processada localmente. Não publique backups, o ZIP do TV Time ou dados de uso no repositório.

As alterações ficam neste navegador; não há sincronização entre aparelhos. Exporte backups para transferir ou recuperar a lista. Uma biblioteca vazia e os catálogos públicos são os únicos dados incluídos na hospedagem.

Séries encerradas com todos os episódios conferidos vão para Já assisti; séries atualizadas ficam em Em dia quando há dados suficientes do catálogo. As preferências de anime/dorama só afetam sugestões. É possível escolher uma capa por link no painel do título; nem todo título possui imagem no catálogo. Notas externas são manuais.

## Desenvolvimento

Node.js 22 ou superior. Sem instalação de dependências.

`npm start` — prévia em http://127.0.0.1:4173

`npm run check` — validação de JavaScript e testes

Fontes públicas: [TVmaze](https://www.tvmaze.com/api), [Wikidata](https://www.wikidata.org), Apple. Datas de estreia são previstas e a cobertura é parcial.

