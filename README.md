# Vitalog

Prontuário pessoal: o histórico de saúde de uma vida num lugar só — exames,
vacinas, alergias, condições, cirurgias e dispositivos implantados —
independente de o atendimento ter sido na rede pública ou privada.

Duas metades com propósitos diferentes:

- **Séries de exame.** Você envia o PDF que o laboratório já te mandou; o
  sistema extrai os resultados, normaliza contra um catálogo ancorado em LOINC
  e monta a linha do tempo. Aqui o valor está na tendência.
- **Triagem.** Tipo sanguíneo, alergias, comorbidades, cirurgias prévias e
  implantes, numa tela feita para ser lida em trinta segundos por alguém que
  não é você. Aqui o valor está em não faltar.

> **Projeto de portfólio.** Todos os dados de demonstração são sintéticos e os
> nomes de laboratório são fictícios. Não coloque dado real de saúde aqui.

---

## O painel de triagem

O que alguém precisa saber sobre você quando você talvez não esteja consciente
para contar. Três decisões de segurança valem destaque:

**Ausência de registro nunca é apresentada como ausência do fato.** Um campo
vazio, em triagem, é lido como "esta pessoa não tem alergia" — e o que ele
realmente diz é "ninguém registrou alergia nenhuma". A tela nunca fica vazia:
ela diz explicitamente que não sabe, e manda confirmar com o paciente.

**Tipo sanguíneo carrega a procedência.** Tipo informado pelo próprio paciente
não serve para transfundir, e a tela avisa isso em vez de exibir a letra como
se fosse fato. São três estados distintos — confirmado em laboratório, origem
duvidosa e sem registro — e achatá-los seria perigoso.

**Compatibilidade com ressonância distingue "não pode" de "não se sabe".** Um
marca-passo antigo numa ressonância pode matar, e "desconhecido" precisa gritar
tanto quanto "proibido".

## O problema dos exames

Guardar exame é fácil — o Google Drive resolve. O que ninguém consegue é
**comparar**: seus últimos 10 anos de colesterol estão espalhados por seis
laboratórios, cada um escrevendo o mesmo exame de um jeito diferente.

| Laboratório | Como imprime | Unidade |
|---|---|---|
| A | `Glicemia de Jejum` | mg/dL |
| B | `GLICOSE` | mg/dL |
| C | `Glicose (jejum)` | mg/dL |
| D | `GLIC` | mmol/L |

São quatro grafias, duas unidades e um exame só. Sem resolver isso, não existe
gráfico — existem quatro listas separadas, e três delas você nem sabe que são a
mesma coisa.

## A abordagem

O eixo do produto é **ingestão**, não cadastro. Personal health records morrem
quando dependem de digitação manual — foi assim com o Google Health e o
Microsoft HealthVault. Aqui o usuário nunca digita um resultado: ele joga o PDF
e confere o que foi lido.

```
PDF/foto ──► extração (Claude, saída estruturada) ──► normalização (determinística) ──► revisão humana ──► série
             │                                        │                                 │
             │ o que está IMPRESSO                     │ catálogo LOINC + conversão      │ nada entra
             │ nada de interpretação                   │ de unidade, sem chute           │ sem confirmação
```

A divisão importa: **o modelo só transcreve; o código interpreta.** O extrator
devolve `raw_name`, `value`, `unit` como estão no papel. Quem decide que
`"GLIC"` é `glucose-fasting`, que `5,5 mmol/L` são `99,1 mg/dL` e que isso está
acima da referência é código determinístico — testável, versionável, auditável.

## Decisões de projeto

**Normalização em duas passadas, sem similaridade difusa.** Primeiro casa o nome
exato normalizado; depois retira ruído conhecido (`sérico`, `dosagem de`,
`soro`) e tenta de novo. Nada de fuzzy matching por score: um casamento errado
contamina a série em silêncio, e isso é pior que não casar — o não-casado
aparece na fila de revisão.

**Unidade desconhecida não vira ponto no gráfico.** `toCanonical` devolve `null`
em vez de assumir. Prefere-se um buraco na série a um valor errado.

**A faixa de referência do laudo tem precedência sobre a do catálogo.**
Laboratórios calibram método e população de formas diferentes; a do catálogo é
só rede de segurança.

**O valor original nunca é sobrescrito.** `rawName`/`valueNum`/`rawUnit` ficam ao
lado de `canonicalValue`/`canonicalUnit`. Se a conversão estiver errada, o dado
de origem continua lá para reprocessar. O JSON bruto da extração também é
guardado em `lab_reports.extraction_raw`.

**Cor nunca é o único canal.** Verde e laranja são o par clássico de confusão em
daltonismo, e "dentro" vs "acima da referência" é exatamente a distinção que
mais importa num app de saúde. A paleta foi validada por script (banda de
luminosidade, piso de croma, separação CVD, contraste) e todo indicador carrega
glifo + rótulo textual. A linha do gráfico usa o teal de acento, nunca uma cor
de situação — reaproveitá-la destruiria o significado clínico.

**Postgres no Supabase, com o cliente criado sob demanda.** O `next build` não
deve precisar de banco — se o cliente nascesse na importação do módulo, o build
passaria a exigir `DATABASE_URL` e quebraria em CI. Aqui a conexão só nasce na
primeira query, e banco ausente vira uma tela com os passos de configuração em
vez de um stack trace.

**Duas URLs de banco, não uma.** `DATABASE_URL` aponta para o pooler de
transação do Supabase (6543) — é por onde a Vercel fala em runtime, e por isso o
cliente usa `prepare: false`: pgbouncer não suporta prepared statements. As
migrations usam `DIRECT_URL` (5432), porque o pooler de transação não aceita os
comandos DDL do drizzle-kit. Trocar as duas é o erro que só aparece em produção.

## Rodando

Precisa de um Postgres — local ou no [Supabase](https://supabase.com) (o plano
gratuito basta; as duas URLs estão em `Settings → Database → Connection string`).

Com Postgres local, as duas URLs são a mesma:

```bash
createdb -h localhost -U postgres vitalog
# DATABASE_URL e DIRECT_URL = postgresql://postgres:SENHA@localhost:5432/vitalog
```

```bash
npm install
cp .env.example .env.local   # cole DATABASE_URL (6543) e DIRECT_URL (5432)
npm run db:seed              # migrations + catálogo + conta de exemplo
npm run dev
```

Abra `http://localhost:3000/painel` — a conta de exemplo já tem 7 anos de exames.
**Não é preciso API key da Anthropic para explorar**; ela só é necessária para
enviar um laudo de verdade em `/enviar`.

```bash
npm test               # 33 testes: catálogo, unidades, normalização — sem rede e sem banco
npm run lint
npm run typecheck    # next typegen + tsc

npm run db:verify       # inspeciona o banco real: tabelas, colunas, índices, contagens
npm run db:review-case  # insere um pendente para exercitar /revisar sem chave de API
npm run api:check       # verifica se a ANTHROPIC_API_KEY autentica e tem crédito
```

Se o banco não estiver configurado, o app não quebra: mostra uma tela com os
passos que faltam.

## Instalável no celular

O app é um PWA: no iPhone, **Compartilhar → Adicionar à Tela de Início**; no
Android, o Chrome oferece **Instalar app**. Abre em tela cheia, sem barra do
navegador, e o `start_url` aponta para `/painel` — app instalado abre onde se
trabalha, não na página que explica o projeto.

Os ícones são gerados por `scripts/generate-icons.py`, sem dependência de
biblioteca de imagem. São três variantes porque cada plataforma recorta de um
jeito: a `maskable` tem margem extra (o Android recorta em círculo ou squircle)
e a da Apple é quadrada e opaca (o iOS arredonda sozinho, e cantos
transparentes virariam bordas pretas na tela de início).

Não há service worker: o app é inteiramente movido a dados do banco, então um
cache offline mostraria números desatualizados — o que num histórico de saúde é
pior do que uma tela de erro honesta.

## Estrutura

| Caminho | O quê |
|---|---|
| `src/lib/clinical/catalog.ts` | Catálogo de analitos: LOINC, unidade canônica, faixas, aliases |
| `src/lib/extraction/schema.ts` | Contrato Zod da saída do extrator |
| `src/lib/extraction/extract.ts` | Chamada ao Claude com saída estruturada |
| `src/lib/extraction/normalize.ts` | Resolução de analito e fila de revisão |
| `src/lib/extraction/units.ts` | Conversão de unidade e marcação contra a referência |
| `src/db/schema.ts` | Schema Drizzle |
| `src/components/SeriesChart.tsx` | Série temporal com faixa de referência |
| `src/app/revisar/actions.ts` | Confirmação da revisão e aprendizado de alias |
| `src/lib/env.ts` | Validação de ambiente com falha imediata e legível |
| `scripts/seed.ts` | Catálogos + conta de demonstração |
| `scripts/verify-db.ts` | Inspeção do schema aplicado no Postgres |
| `src/app/emergencia/page.tsx` | Painel de triagem |
| `src/app/manifest.ts` | Manifest do PWA |
| `scripts/generate-icons.py` | Gera os ícones do app a partir da marca |

## Estado atual

Funcionando: catálogo e normalização (33 testes), schema Postgres e migrations,
conta de demonstração, painel, série temporal por analito com tabela, carteira de
vacinas com alerta de reforço, upload com retry e contagem de tokens, e a tela de
conferência que **grava a correção e ensina o alias ao catálogo**.

Pendente e conhecido:

- **O caminho de extração não foi exercitado contra a API real** — foi escrito
  contra a documentação do SDK, com typecheck e build limpos, mas sem `ANTHROPIC_API_KEY`
  não houve como rodar um PDF de ponta a ponta. É o único trecho ainda não verificado
  em execução; todo o resto (schema, migrations, séries, conferência, aprendizado de
  alias) já rodou contra um PostgreSQL 18 de verdade.
- **Os códigos LOINC não foram conferidos um a um** contra a base oficial. Estão
  marcados como tal no catálogo. O agrupamento das séries não depende deles (usa
  o `id` canônico); eles servem para interoperar com outros sistemas.
- **Sem autenticação nem controle de permissão.** É a lacuna mais importante:
  um prontuário precisa que o paciente decida quem vê o quê, e que a triagem
  continue acessível numa emergência mesmo assim. Hoje tudo opera sobre um
  usuário fixo (`demo-user`).
- Alergias, condições, cirurgias e dispositivos só entram pelo seed — falta a
  interface de cadastro e edição.
- Atendimentos estão no modelo de dados mas ainda não têm tela.
- Arquivo enviado não é persistido em storage (só o JSON extraído).
- Sem limite de taxa no endpoint de upload — cada extração custa dinheiro.
- Faixas de referência ainda não variam por sexo e idade, embora o schema já
  guarde os dois campos.

## LGPD

Dado de saúde é dado pessoal sensível (Art. 5º, II), o que exige consentimento
específico e destacado e um padrão de segurança acima do comum. Este projeto não
implementa esse padrão e **não deve receber dado real de ninguém**. Para virar
produto seria preciso, no mínimo: criptografia em repouso, log de auditoria de
todo acesso, política de retenção e exclusão, e o compromisso explícito de não
vender nem treinar modelo com os dados.

Nada aqui interpreta resultado ou substitui avaliação médica.
