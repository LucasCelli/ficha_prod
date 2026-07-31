const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getFichaDeleteConfirmationCode(fichaId: string) {
  if (!UUID_PATTERN.test(fichaId)) return "";
  return fichaId.replaceAll("-", "").slice(-4).toUpperCase();
}
