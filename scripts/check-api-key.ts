/**
 * Verifica se a ANTHROPIC_API_KEY do .env.local está utilizável, antes de
 * gastar tempo (e um PDF) descobrindo isso no meio de um upload.
 *
 *   npm run api:check
 *
 * Separa os dois motivos de falha, que exigem soluções diferentes: chave
 * inválida ou do tipo errado (erro de autenticação) e conta sem crédito
 * (a autenticação passa, a chamada não).
 */
import "./load-env";
import Anthropic from "@anthropic-ai/sdk";

function describe(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    return `${err.status ?? "?"} ${err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("✗ ANTHROPIC_API_KEY não está definida no .env.local");
    process.exit(1);
  }

  const client = new Anthropic();

  // 1) Autenticação — este endpoint não consome tokens.
  try {
    const models = await client.models.list({ limit: 3 });
    console.log(`✓ autenticação OK (a API listou ${models.data.length} modelos)`);
  } catch (err) {
    console.log(`✗ autenticação falhou: ${describe(err)}`);
    console.log(
      "\n  Se a mensagem citar 'anthropic-workspace-id', a chave é do tipo\n" +
        "  identity-linked. Crie uma chave de workspace no console.",
    );
    process.exit(1);
  }

  // 2) Crédito — a menor chamada possível que realmente gera tokens.
  try {
    const res = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 64,
      output_config: { effort: "low" },
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: "Responda apenas: ok" }],
    });
    const text = res.content.find((b) => b.type === "text");
    console.log(`✓ crédito OK (resposta: "${text?.type === "text" ? text.text.trim() : ""}")`);
    console.log(`  tokens: ${res.usage.input_tokens} entrada / ${res.usage.output_tokens} saída`);
    console.log("\nA tela /enviar está pronta para uso.");
  } catch (err) {
    console.log(`✗ a chamada falhou: ${describe(err)}`);
    console.log("\n  Se citar crédito ou billing, adicione fundos no console.");
    process.exit(1);
  }
}

main();
