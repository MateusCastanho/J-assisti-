# Episódio

Aplicativo leve para acompanhar filmes, séries e próximos lançamentos. Sem comentários, resenhas ou sinopses.

## GitHub Pages

Em Settings → Pages, selecione **Deploy from a branch**, branch **main** e pasta **/docs**, e salve. Os arquivos usam caminhos relativos, compatíveis com sites de projeto.

## Sua biblioteca

O site público começa vazio. No app anterior, clique em **Exportar backup**; aqui, use **Importar meu backup**. A importação é processada localmente. Não publique backups, o ZIP do TV Time ou dados de uso no repositório.

O app permite uma conta pessoal com sincronização pelo Supabase. Entre com a mesma conta nos aparelhos; a cópia local continua utilizável offline. O indicador no topo diferencia alterações pendentes de gravações confirmadas na nuvem. Backups continuam disponíveis. O banco é privado; uma biblioteca vazia e catálogos públicos são os únicos dados incluídos na hospedagem.

Em **Para você**, as recomendações usam gêneros dos títulos assistidos, desejados e abandonados. Títulos presentes em qualquer lista são excluídos; as preferências de anime e dorama também se aplicam. O catálogo é parcial, com fontes TVmaze, Wikipédia e Wikidata. A explicação de cada sugestão indica o título do histórico que contribuiu para a recomendação; não é uma nota do Google ou do SeriesGraph.

A configuração do banco, os testes de acesso e as limitações de reconciliação estão em [supabase/README.md](supabase/README.md). Somente a chave pública de cliente vai para a hospedagem; chaves de administrador e backups pessoais nunca devem ser publicados.

Séries encerradas com todos os episódios conferidos vão para Já assisti; séries atualizadas ficam em Em dia quando há dados suficientes do catálogo. As preferências de anime/dorama só afetam sugestões. É possível escolher uma capa por link no painel do título; nem todo título possui imagem no catálogo. Notas externas são manuais.

## Desenvolvimento

Node.js 22 ou superior. Sem instalação de dependências.

`npm start` — prévia em http://127.0.0.1:4173

`npm run check` — validação de JavaScript e testes

Fontes públicas: [TVmaze](https://www.tvmaze.com/api), [Wikidata](https://www.wikidata.org), Apple. Datas de estreia são previstas e a cobertura é parcial.
