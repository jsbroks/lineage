export const determineItemTypeCode = (itemType: {
  name: string;
  slug: string;
}) => {
  const codeNormalized = itemType.name.replace(/[^a-zA-Z]/g, " ");
  const words = codeNormalized.toLowerCase().split(" ");
  if (words.length > 2) {
    return words.slice(0, 5).join("");
  }

  if (words.length === 2) {
    const firstWord = words[0] ?? "";
    const secondWord = words[1] ?? "";
    return (
      firstWord.slice(0, 2).toUpperCase() + secondWord.charAt(0).toUpperCase()
    );
  }

  return codeNormalized?.slice(0, 3).toUpperCase() ?? "";
};
