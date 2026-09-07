# Vitalog Triagem — Android

App nativo em Kotlin + Jetpack Compose que mostra o **prontuário de triagem**
guardado no aparelho.

## Por que existe um app nativo

O site já é instalável como PWA, então um invólucro em torno dele não
acrescentaria nada. Este app existe por uma razão que o site não consegue
atender: **funcionar sem sinal**.

A tela de triagem é lida exatamente quando as coisas deram errado — acidente,
mal súbito, pronto-socorro. É o pior momento possível para depender de rede.
O app guarda o prontuário localmente e o exibe com o aparelho em modo avião;
a rede serve só para atualizar.

Por isso a ordem é sempre cache primeiro, rede depois. E falha de rede nunca
apaga o que está guardado: prontuário de três meses atrás é infinitamente
melhor que tela vazia — o que a interface faz é dizer a idade dele com
honestidade, e marcar "offline" quando não conseguiu atualizar.

## Rodando

Abra a pasta `android/` no Android Studio e rode. Ou pela linha de comando:

```bash
cd android
./gradlew assembleDebug
```

O APK sai em `app/build/outputs/apk/debug/`.

A origem dos dados está em `app/build.gradle.kts`, no `buildConfigField`
`API_BASE`. Aponta para a produção; para desenvolver contra o Next local,
troque por `http://10.0.2.2:3000` (o endereço do host visto de dentro do
emulador) e libere tráfego em texto claro no manifest.

## Estrutura

| Caminho | O quê |
|---|---|
| `data/Record.kt` | Modelos serializáveis, espelho de `/api/emergencia` |
| `data/TriageRepository.kt` | Cache em DataStore + atualização por rede |
| `TriageViewModel.kt` | Estado da tela; cache primeiro, rede depois |
| `ui/TriageScreen.kt` | A tela de triagem |
| `ui/Theme.kt` | Mesmas cores da versão web |

## Decisões que valem explicar

**Cor não é canal único, aqui também.** As três cores de situação são as mesmas
da web, onde foram validadas contra daltonismo — e todo indicador carrega glifo
e texto. Um prontuário que muda de linguagem visual entre navegador e telefone
confunde quem o lê sob pressa.

**Ausência de registro nunca vira ausência do fato.** Campo vazio em triagem é
lido como "esta pessoa não tem alergia", quando o que ele diz é "ninguém
registrou". A tela nunca fica vazia: declara que não sabe e manda confirmar.

**O prontuário local fica fora de backup em nuvem** e de transferência entre
aparelhos (`data_extraction_rules.xml`). É dado de saúde: existe naquele
aparelho porque o dono instalou o app, e não deve viajar sozinho para outro.

**Uma permissão só**: `INTERNET`. Um app que guarda dado de saúde e pede mais do
que precisa perde a confiança antes de provar utilidade.

## Pendências

- **Sem autenticação.** O endpoint devolve o prontuário do usuário de
  demonstração, com dados sintéticos, sem credencial. É a mesma lacuna da
  versão web e vale o mesmo aviso: antes de existir gente real aqui, precisa de
  autenticação e escopo por paciente.
- Sem tela de bloqueio nem atalho rápido — um app de emergência deveria ser
  alcançável sem destravar o aparelho.
- Somente leitura: cadastro e edição continuam na web.
