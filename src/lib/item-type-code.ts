export const determineItemTypeCode = (itemType: {
  name: string;
  slug?: string;
}) => {
  const codeNormalized = itemType.name.replace(/[^a-zA-Z]/g, " ");
  const words = codeNormalized.toUpperCase().split(" ");
  if (words.length > 2) {
    return words.slice(0, 5).join("");
  }

  if (words.length === 2) {
    const firstWord = words[0] ?? "";
    const secondWord = words[1] ?? "";
    return firstWord.slice(0, 2) + secondWord.charAt(0);
  }

  return codeNormalized?.slice(0, 3) ?? "";
};
