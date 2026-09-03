-- DropForeignKey
ALTER TABLE "Assinatura" DROP CONSTRAINT "Assinatura_planoId_fkey";

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
