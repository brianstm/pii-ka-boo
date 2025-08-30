export function replacePlaceholdersFromOriginal(
  originalText: string,
  templatedText: string
): string {
  const names = Array.from(originalText.matchAll(/\b[A-Z][a-zA-Z]+\b/g)).map(
    (m) => m[0]
  );
  const emails = Array.from(
    originalText.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
  ).map((m) => m[0]);
  const urls = Array.from(
    originalText.matchAll(
      /\b((?:https?:\/\/|www\.)[\w-]+(?:\.[\w-]+)+(?:[\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?)\b/g
    )
  ).map((m) => m[0]);
  const phones = Array.from(originalText.matchAll(/[+]?\d[\d\s\-]{6,}\d/g)).map(
    (m) => m[0].replace(/[\s\-]/g, "")
  );
  const addresses = Array.from(
    originalText.matchAll(
      /\b\d+\s+(?:[A-Za-z0-9'.\-]+\s+)*(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Lane|Ln\.?|Drive|Dr\.?|Boulevard|Blvd\.?|Way|Court|Ct\.?|Place|Pl\.?|Terrace|Ter\.?)(?:\s+[A-Za-z.]+)?\b/gi
    )
  ).map((m) => m[0]);

  const buildMap = (key: string, values: string[]) => {
    const map = new Map<string, string>();
    values.forEach((val, idx) => {
      const i = idx + 1;
      map.set(`[${key}_${i}]`, val);
      map.set(`[${key}*${i}]`, val);
    });
    if (values[0]) {
      map.set(`[${key}]`, values[0]);
      map.set(`[${key}*1]`, values[0]);
      map.set(`[${key}_1]`, values[0]);
    }
    return map;
  };

  const nameMap = buildMap("NAME", names);
  const emailMap = buildMap("EMAIL", emails);
  const addressMap = buildMap("ADDRESS", addresses);
  const phoneMap = buildMap("PHONE", phones);
  const urlMap = buildMap("PERSONAL_URL", urls);

  let result = templatedText;

  const maps = [nameMap, emailMap, addressMap, phoneMap, urlMap];
  for (const m of maps) {
    for (const [ph, value] of m.entries()) {
      if (result.includes(ph)) {
        result = result.replaceAll(ph, value);
      }
    }
  }

  return result;
}
