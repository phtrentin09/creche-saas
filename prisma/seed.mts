// Recria os dados de desenvolvimento do zero. Rode prisma/limpar.ts antes
// se o banco já tiver dado — este script não é idempotente de propósito,
// pra não mascarar duplicidade.
import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "../lib/generated/prisma/index.js";

const prisma = new PrismaClient();

const SENHA_DONO = "senha12345";

function gerarSenhaAleatoria() {
  return randomBytes(9).toString("base64url");
}

// Meia-noite UTC de "hoje" no fuso do Brasil — mesma lógica de
// lib/formatacao.ts (duplicada aqui pra este script não depender de
// import com alias "@/", que o Node não resolve fora do Next.js).
function hojeUTC() {
  const dataISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  return new Date(`${dataISO}T00:00:00Z`);
}

async function main() {
  const senhaAtendente = gerarSenhaAleatoria();

  const tenant = await prisma.tenant.create({
    data: { nome: "Creche Teste A", capacidadeDiaria: 20 },
  });

  const dono = await prisma.usuario.create({
    data: {
      tenantId: tenant.id,
      nome: "Ana Dona",
      email: "ana@creche-a.com",
      senhaHash: await hash(SENHA_DONO, 12),
      papel: "dono",
    },
  });

  const atendente = await prisma.usuario.create({
    data: {
      tenantId: tenant.id,
      nome: "Bia Atendente",
      email: "atendente@creche-a.com",
      senhaHash: await hash(senhaAtendente, 12),
      papel: "atendente",
    },
  });

  const tutor = await prisma.tutor.create({
    data: { tenantId: tenant.id, nome: "Maria Tutora", telefone: "11999998888" },
  });

  const rex = await prisma.pet.create({
    data: {
      tenantId: tenant.id,
      tutorId: tutor.id,
      nome: "Rex",
      raca: "Vira-lata",
      porte: "medio",
      castrado: true,
    },
  });

  const planoMensal = await prisma.plano.create({
    data: {
      tenantId: tenant.id,
      nome: "Plano Mensal Basico",
      tipo: "mensal",
      valorCentavos: 35000,
      diaVencimento: 10,
    },
  });

  const planoPacote = await prisma.plano.create({
    data: {
      tenantId: tenant.id,
      nome: "Pacote 10 Diarias",
      tipo: "pacote",
      valorCentavos: 28000,
      qtdDiarias: 10,
    },
  });

  await prisma.assinatura.create({
    data: {
      tenantId: tenant.id,
      petId: rex.id,
      planoId: planoPacote.id,
      status: "ativa",
      saldoDiarias: 5,
    },
  });

  await prisma.agendamento.create({
    data: {
      tenantId: tenant.id,
      petId: rex.id,
      data: hojeUTC(),
      status: "agendado",
    },
  });

  console.log("Seed criado:");
  console.log(`  Creche: ${tenant.nome} (capacidade ${tenant.capacidadeDiaria})`);
  console.log(`  Dono:      ${dono.email} / senha: ${SENHA_DONO}`);
  console.log(`  Atendente: ${atendente.email} / senha: ${senhaAtendente}`);
  console.log(`  Tutor: ${tutor.nome} · Pet: ${rex.nome}`);
  console.log(`  Planos: "${planoMensal.nome}", "${planoPacote.nome}"`);
  console.log("  Assinatura ativa (pacote, saldo 5 diárias) e 1 agendamento hoje.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
