/** Pré-gera os recortes (fundo transparente) de todas as fotos principais e secundárias. */
import { prisma } from "../src/lib/db";
import { cutoutUrl } from "../src/lib/cutout";
(async () => {
  const imgs = await prisma.productImage.findMany({ where: { cutoutKey: null }, select: { id: true } });
  let n = 0;
  for (const i of imgs) { await cutoutUrl(i.id); if (++n % 100 === 0) console.log(`${n}/${imgs.length}`); }
  console.log(`Recortes gerados: ${n}`);
  await prisma.$disconnect();
})();
