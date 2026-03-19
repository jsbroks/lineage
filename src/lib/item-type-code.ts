export const determineItemTypeCode = (itemType: {
  name: string;
  slug?: string;
}) => {
  const codeNormalized = itemType.name
    .replaceAll("’", "")
    .replaceAll("-", " ")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "");
  const words = codeNormalized.split(" ");
  if (words.length > 2) {
    return words.map((w) => w.charAt(0)).join("");
  }

  if (words.length === 2) {
    const firstWord = words[0] ?? "";
    const secondWord = words[1] ?? "";
    return firstWord.slice(0, 2) + secondWord.charAt(0);
  }

  return codeNormalized?.slice(0, 3) ?? "";
};
