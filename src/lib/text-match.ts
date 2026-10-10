import { sql, type AnyColumn, type SQL } from "drizzle-orm";
export { normalizeText } from "./normalize-text";

const ACCENTED = "áàâãäåéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ";
const PLAIN = "aaaaaaeeeeiiiiooooouuuucnaaaaaaeeeeiiiiooooouuuucn";

// Mesma regra de normalizeText no Postgres, sem depender da extensão unaccent.
export function normalizedSql(column: AnyColumn | SQL) {
  return sql`lower(translate(trim(${column}), ${ACCENTED}, ${PLAIN}))`;
}
