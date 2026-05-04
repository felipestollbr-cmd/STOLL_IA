# STOLL — Agente de IA Autônomo — TODO

## Arquitetura & Banco de Dados
- [x] Planejar schema do banco de dados (conversas, tarefas, memória, preferências)
- [x] Criar tabelas: conversations, messages, tasks, agent_memory, user_preferences
- [x] Gerar e aplicar migrations SQL

## Backend (tRPC Procedures)
- [x] Criar procedure para enviar mensagem e chamar LLM com streaming
- [x] Criar procedure para listar histórico de conversas
- [x] Criar procedure para salvar/recuperar tarefas executadas
- [x] Criar procedure para gerenciar memória do agente
- [x] Criar procedure para atualizar configurações do usuário
- [x] Implementar integração com LLM (Gemini ou Ollama)
- [ ] Adicionar suporte a streaming de respostas

## Frontend — Tema Dark Cyberpunk
- [x] Configurar paleta de cores: fundo escuro, ciano, azul elétrico
- [x] Integrar logo do STOLL ao header
- [x] Criar layout principal com sidebar + área de conteúdo
- [x] Implementar componente de chat com renderização de markdown
- [x] Adicionar animações de loading e status do agente

## Componentes de Interface
- [x] Sidebar com navegação (Chat, Histórico, Memória, Configurações)
- [x] Painel de Chat com histórico de mensagens
- [ ] Painel de Tarefas com logs expansíveis
- [ ] Painel de Memória com conversas salvas e preferências
- [ ] Página de Configurações (modelo IA, persona, parâmetros)
- [x] Status em tempo real do agente (pensando, executando, ocioso)

## Autenticação & Segurança
- [x] Configurar autenticação Manus OAuth
- [x] Restringir acesso ao dono do projeto (owner-only)
- [x] Implementar logout
- [x] Proteger procedures com protectedProcedure

## Histórico & Busca
- [ ] Persistir histórico de conversas no banco de dados
- [ ] Implementar busca por data e conteúdo
- [ ] Criar filtros para histórico
- [ ] Exibir conversas anteriores

## Testes & Otimização
- [x] Escrever testes vitest para procedures
- [ ] Testar streaming de LLM
- [ ] Otimizar performance do chat
- [ ] Validar responsividade do design

## Entrega
- [ ] Criar checkpoint final
- [ ] Documentar instruções de uso
- [ ] Preparar assets finais (logo, screenshots)

## Refinamentos Necessários
- [ ] Aplicar migration SQL no banco de dados via webdev_execute_sql
- [ ] Implementar streaming real de respostas do LLM no backend
- [ ] Consumir streaming no frontend do chat
- [ ] Usar preferredModel para selecionar Gemini ou Ollama dinamicamente
- [ ] Integrar logo do STOLL (v1 ou v2) no header/sidebar
- [ ] Implementar navegação funcional entre Chat, Histórico, Memória, Configurações
- [ ] Conectar status do agente a eventos reais de execução
- [ ] Adicionar guarda owner-only nas procedures
- [ ] Bloquear UI para usuários não-owner
- [ ] Implementar painel de Tarefas com logs expansíveis
- [ ] Implementar painel de Memória com visualização de preferências
- [ ] Implementar página de Configurações funcional
