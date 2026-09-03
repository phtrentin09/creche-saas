-- DropForeignKey
ALTER TABLE "Agendamento" DROP CONSTRAINT "Agendamento_petId_fkey";

-- DropForeignKey
ALTER TABLE "Assinatura" DROP CONSTRAINT "Assinatura_petId_fkey";

-- DropForeignKey
ALTER TABLE "Vacina" DROP CONSTRAINT "Vacina_petId_fkey";

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacina" ADD CONSTRAINT "Vacina_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
