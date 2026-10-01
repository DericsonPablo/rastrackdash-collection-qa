# Página de QA da coleta — RastrackDash Info

Fixture estática para testar a coleta de produção em uma origem HTTPS separada. A página não contém credenciais, IDs de fonte, bibliotecas externas ou rastreadores próprios. Ela não salva o código colado em cookies, armazenamento local ou servidor.

## QA manual

1. Publique **somente esta pasta** em uma origem HTTPS, por exemplo, GitHub Pages. Antes do teste, autorize a origem exata da página na fonte de teste do RastrackDash Info.
2. No fluxo oficial, gere uma fonte sintética de QA e copie o código completo de instalação. O código deve ter o script JSON `rastracking-nod-4.8.5-config` seguido pelo runtime `https://info.rastrack.app/rastracking-info.js`.
3. Abra a página publicada, cole os dois scripts e escolha **Carregar script de coleta**. A caixa de texto é limpa imediatamente. Se o código for rejeitado, obtenha novamente o snippet oficial; a página não executa HTML ou JavaScript colado.
4. Aguarde **Script carregado**. Essa mensagem confirma apenas o carregamento do arquivo JavaScript. Gere a navegação ou evento sintético previsto pelo roteiro de QA e confirme o recebimento no RastrackDash Info.
5. No DevTools, verifique que as requisições de coleta seguem para `https://info.rastrack.app` e que o token não aparece na URL. Registre apenas resultado, horário e evidências sem credenciais. Recarregue ou feche a aba para encerrar a sessão de QA.

## Segurança e ciclo de vida

- O parser aceita somente os dois scripts oficiais, com JSON de quatro chaves, versão 1, ID de fonte válido, token de 8 a 512 caracteres após `trim` e endpoint exatamente `https://info.rastrack.app`.
- O HTML colado nunca é anexado ao documento nem avaliado. Depois da validação, a página cria um novo bloco JSON e carrega apenas o runtime de URL fixa.
- O token validado permanece na memória/DOM da aba enquanto o runtime precisa dele. Não compartilhe capturas do DOM ou do painel Network que exponham cabeçalhos. Feche a aba após o teste e revogue ou gire a credencial sintética conforme o processo de QA.
- A política CSP permite arquivos locais, o runtime de URL fixa e conexões ao host do Info. A página não tem telemetria própria.

## Verificação local

Com Node.js instalado, execute `node --test qa.test.cjs` e `node --check qa.js`. O teste do parser usa apenas valores sintéticos gerados durante a execução.
