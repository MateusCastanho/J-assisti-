# Ativação da conta pessoal

O projeto Supabase está provisionado em São Paulo com cadastro público desativado, RLS e uma única conta autorizada pelo administrador. O backup pessoal foi importado apenas no banco privado. Nenhum histórico pessoal é publicado com o código.

1. Conectar o Supabase ao Codex e escolher/criar um projeto pertencente ao usuário. Não habilitar cobrança sem autorização.
2. Aplicar `migrations/202610260001_private_library.sql`.
3. Em Authentication, desabilitar **Allow new users to sign up**. Criar apenas a conta do proprietário em Users. Ele define a própria senha; não colocar senhas no chat, SQL ou repositório.
4. Em uma sessão administrativa, inserir o UUID confirmado da conta em `public.episodio_owner(user_id)`. O singleton impede dois proprietários. Não adotar automaticamente a primeira conta que entrar.
5. Executar `tests/access.sql`. A migração/teste ainda precisa ser validada em PostgreSQL real; os testes Node verificam apenas a reconciliação do cliente.
6. Preencher `docs/cloud-config.js` com Project URL e a chave **publishable** pública (ou anon legada). Nunca usar secret/service_role. Publicar o cliente somente após verificar login e isolamento.
7. Entrar no aparelho que já contém a biblioteca; a primeira sincronização combina o histórico local com a nuvem. Um aparelho vazio baixa a biblioteca. Exportar um backup antes da ativação como cópia adicional.
8. Testar em dois contextos: marcar/desmarcar episódios, incluir e remover título, reconectar após offline e confirmar que outra conta/anônimo não conseguem ler nem gravar. Confirmar a versão do SDK fixada em `docs/cloud.js` e acesso ao CDN antes da ativação.

Verificação no banco em 26/10/2026: escrita/leitura do proprietário, rejeição de versão antiga, rejeição de outra conta e de anônimo aprovadas em transação revertida. O teste `tests/access.sql` também foi executado com a conta real autorizada. O consultor de segurança não encontrou problemas de RLS ou permissões; informou que a [proteção contra senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) está desativada na configuração padrão do projeto. Nenhum recurso pago foi contratado para mudar isso.

## Comportamento

Uma única biblioteca privada por conta. Escrita por função com versão esperada e bloqueio de transação; versões antigas recebem conflito e o cliente refaz a reconciliação. A reconciliação usa a última cópia confirmada do aparelho para preservar desmarcações e remoções explícitas. Alterações simultâneas em campos diferentes são combinadas. Se ambos editarem o mesmo campo, a edição local que está sendo enviada prevalece; não há resolução manual de conflitos.

O aparelho guarda cópia local e último estado confirmado. A lista fica utilizável offline; a sincronização tenta novamente a cada 15 segundos enquanto a página está visível, ao voltar para a aba ou ao recuperar conexão. O indicador só diz Sincronizado após confirmação. Sair mantém a cópia local neste navegador e encerra somente a sessão deste aparelho.

Limitações: importação inteira é tratada como edição da biblioteca, então pode remover títulos que estavam na base daquele aparelho. O app é para uma única conta; trocar o projeto exige verificar a cópia local antes de combinar. Não há notificações push ou garantia de atualização enquanto a página está fechada.

Referências: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [chaves públicas](https://supabase.com/docs/guides/getting-started/api-keys), [cadastro fechado](https://supabase.com/docs/guides/auth/general-configuration).
