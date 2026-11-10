import en from "@/i18n/dictionaries/en.json";
import es from "@/i18n/dictionaries/es.json";
import fr from "@/i18n/dictionaries/fr.json";
import ptBR from "@/i18n/dictionaries/pt-BR.json";
import { locales, routing } from "@/i18n/routing";

type Dict = { [key: string]: string | Dict | Dict[] } | Dict[];

// Flattens { a: { b: "x" }, c: [{ d: "y" }] } into { "a.b": "x", "c.0.d": "y" }
function flatten(dict: Dict, prefix = ""): Record<string, string> {
  return Object.entries(dict).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === "string"
        ? { ...acc, [path]: value }
        : { ...acc, ...flatten(value, path) };
    },
    {},
  );
}

const dictionaries: [string, Dict][] = [
  ["pt-BR", ptBR],
  ["es", es],
  ["en", en],
  ["fr", fr],
];

// pt-BR is the default locale, so it's the source of truth for keys
const referenceKeys = Object.keys(flatten(ptBR)).sort();

describe("i18n dictionaries", () => {
  it("has a dictionary for every supported locale", () => {
    expect(dictionaries.map(([locale]) => locale).sort()).toEqual(
      [...locales].sort(),
    );
  });

  it("uses pt-BR as the default locale", () => {
    expect(routing.defaultLocale).toBe("pt-BR");
  });

  it.each(dictionaries)("%s has the same keys as pt-BR", (_locale, dict) => {
    const keys = Object.keys(flatten(dict)).sort();
    expect(keys).toEqual(referenceKeys);
  });

  it.each(dictionaries)("%s has no empty translations", (_locale, dict) => {
    const empty = Object.entries(flatten(dict))
      .filter(([, value]) => value.trim() === "")
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
