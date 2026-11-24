/**
 * Geração de cobrança Pix estática (BR Code / "Pix copia e cola") conforme o Manual de Padrões
 * para Iniciação do Pix do Banco Central (EMV QRCPS-MPM). Não depende de banco ou gateway:
 * o pagamento é conferido manualmente no extrato e confirmado no painel.
 */

function field(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Remove acentos e caracteres fora do padrão; corta no tamanho máximo. */
function clean(s: string, max: number): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .\-]/g, "").trim().slice(0, max);
}

export interface PixInput {
  key: string;
  receiverName: string;
  city: string;
  amountCents?: number;
  /** Identificador da cobrança (até 25 caracteres alfanuméricos) */
  txid?: string;
  description?: string;
}

export function buildPixPayload({ key, receiverName, city, amountCents, txid, description }: PixInput): string {
  const gui = field("00", "br.gov.bcb.pix") + field("01", key.trim()) + (description ? field("02", clean(description, 40)) : "");
  const tx = (txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  let p =
    field("00", "01") +
    field("26", gui) +
    field("52", "0000") +
    field("53", "986") +
    (amountCents && amountCents > 0 ? field("54", (amountCents / 100).toFixed(2)) : "") +
    field("58", "BR") +
    field("59", clean(receiverName, 25).toUpperCase()) +
    field("60", clean(city, 15).toUpperCase()) +
    field("62", field("05", tx)) +
    "6304";
  return p + crc16(p);
}
