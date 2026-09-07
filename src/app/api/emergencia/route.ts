import { NextResponse } from "next/server";
import { DEMO_USER_ID, getEmergencyRecord } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Prontuário de triagem em JSON, para o app Android consumir e guardar
 * localmente.
 *
 * O app precisa funcionar sem sinal — é o motivo dele existir — então a
 * resposta é propositalmente pequena e autocontida: nada de referências que
 * exijam uma segunda chamada.
 *
 * ┌─ SEM AUTENTICAÇÃO ───────────────────────────────────────────────────────┐
 * │ Este endpoint devolve o prontuário do usuário de demonstração, com dados │
 * │ sintéticos, sem exigir credencial. Serve enquanto o projeto opera num    │
 * │ único usuário fixo. Antes de existir gente real aqui, ele precisa de     │
 * │ autenticação e de escopo por paciente — está registrado no README.       │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export async function GET() {
  try {
    const record = await getEmergencyRecord(DEMO_USER_ID);
    if (!record.user) {
      return NextResponse.json({ error: "Sem prontuário." }, { status: 404 });
    }

    return NextResponse.json(
      {
        syncedAt: new Date().toISOString(),
        patient: {
          name: record.user.name,
          birthDate: record.user.birthDate,
          sex: record.user.sex,
          bloodType: record.user.bloodType,
          bloodTypeSource: record.user.bloodTypeSource,
          isDemo: record.user.isDemo,
        },
        allergies: record.allergies.map((a) => ({
          substance: a.substance,
          category: a.category,
          severity: a.severity,
          reaction: a.reaction,
          notedAt: a.notedAt,
        })),
        conditions: record.conditions.map((c) => ({
          name: c.name,
          icd10: c.icd10,
          status: c.status,
          criticalForTriage: c.criticalForTriage,
        })),
        devices: record.devices.map((d) => ({
          name: d.name,
          manufacturer: d.manufacturer,
          model: d.model,
          implantedAt: d.implantedAt,
          mriSafe: d.mriSafe,
          notes: d.notes,
        })),
        procedures: record.procedures.map((p) => ({
          name: p.name,
          kind: p.kind,
          performedAt: p.performedAt,
          facility: p.facility,
        })),
      },
      // Sem cache: um prontuário desatualizado servido por CDN é pior que uma
      // falha de rede — o app tem o próprio cache e sabe dizer a idade dele.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Falha ao ler o prontuário." }, { status: 503 });
  }
}
