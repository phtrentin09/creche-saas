import { compare } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { redefinirSenhaAtendente } from "@/lib/equipe";
import { prisma } from "@/lib/prisma";

/**
 * "Recuperação de senha" da v1 é o dono redefinindo na tela de Equipe —
 * prova as duas travas que impedem isso de virar um jeito de qualquer
 * dono mexer em conta de qualquer creche: só atendente (não dono, nem o
 * próprio dono que chama) e só do MESMO tenant.
 */
describe("redefinirSenhaAtendente — só atendente do próprio tenant", () => {
  const sufixo = randomUUID();

  let tenant: { id: string };
  let outroTenant: { id: string };
  let atendente: { id: string };
  let dono: { id: string };

  beforeAll(async () => {
    tenant = await prisma.tenant.create({
      data: { nome: `Tenant Redefinir ${sufixo}`, capacidadeDiaria: 10 },
    });
    outroTenant = await prisma.tenant.create({
      data: { nome: `Tenant Redefinir Outro ${sufixo}`, capacidadeDiaria: 10 },
    });

    atendente = await prisma.usuario.create({
      data: {
        tenantId: tenant.id,
        nome: "Atendente",
        email: `atendente_${sufixo}@teste.com`,
        senhaHash: "hash-antigo",
        papel: "atendente",
      },
    });
    dono = await prisma.usuario.create({
      data: {
        tenantId: tenant.id,
        nome: "Dono",
        email: `dono_${sufixo}@teste.com`,
        senhaHash: "hash-antigo",
        papel: "dono",
      },
    });
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { tenantId: { in: [tenant.id, outroTenant.id] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenant.id, outroTenant.id] } } });
    await prisma.$disconnect();
  });

  it("redefine a senha do atendente do próprio tenant", async () => {
    await redefinirSenhaAtendente(tenant.id, atendente.id, "senhaNova123");

    const atualizado = await prisma.usuario.findUniqueOrThrow({ where: { id: atendente.id } });
    expect(await compare("senhaNova123", atualizado.senhaHash)).toBe(true);
  });

  it("não deixa redefinir a senha do dono", async () => {
    await expect(
      redefinirSenhaAtendente(tenant.id, dono.id, "senhaNova123"),
    ).rejects.toThrow("Atendente não encontrado.");

    const doNaoMudou = await prisma.usuario.findUniqueOrThrow({ where: { id: dono.id } });
    expect(doNaoMudou.senhaHash).toBe("hash-antigo");
  });

  it("não deixa um tenant redefinir senha de atendente de outro tenant", async () => {
    await expect(
      redefinirSenhaAtendente(outroTenant.id, atendente.id, "senhaInvasora123"),
    ).rejects.toThrow("Atendente não encontrado.");

    const atendenteIntacto = await prisma.usuario.findUniqueOrThrow({ where: { id: atendente.id } });
    expect(await compare("senhaInvasora123", atendenteIntacto.senhaHash)).toBe(false);
  });
});
