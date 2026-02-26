const fs = require("fs");

function getFileSizeBytes(filePath) {
  return fs.statSync(filePath).size;
}

function closestSquareDims(payloadLength, bytesPerPixel = 3) {
  const pixelsNeeded = Math.ceil(payloadLength / bytesPerPixel);
  const side = Math.ceil(Math.sqrt(pixelsNeeded)); // smallest square that fits
  const width = side;
  const height = Math.ceil(pixelsNeeded / width);
  return { pixelsNeeded, width, height };
}

// Extract and count word frequencies
function countWords(text) {
  const wordRegex = /\b\w+\b/g;
  const words = text.match(wordRegex) || [];
  const frequency = {};

  words.forEach((word) => {
    const lower = word.toLowerCase();
    frequency[lower] = (frequency[lower] || 0) + 1;
  });

  return frequency;
}

// Build dictionary mapping words to token IDs
function buildWordDictionary(text, minFrequency = 2) {
  const frequency = countWords(text);

  // Filter words that appear at least minFrequency times
  const frequentWords = Object.entries(frequency)
    .filter(([word, count]) => count >= minFrequency)
    .sort((a, b) => b[1] - a[1]); // Sort by frequency descending

  // Create mapping: word -> token ID (using UTF-16 encoding for IDs)
  const dictionary = {};
  frequentWords.forEach(([word, count], index) => {
    // Use special token format: \u{token_id}
    dictionary[word] = `\x00${index.toString(16).padStart(4, "0")}`; // null byte + hex ID
  });

  // Apply dictionary to text
  let compressedText = text;
  Object.entries(dictionary).forEach(([word, token]) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    compressedText = compressedText.replace(regex, token);
  });

  return { dictionary, compressedText };
}

// Restore original text using dictionary
function restoreDictionary(compressedText, dictionary) {
  // Create reverse mapping: token ID -> word
  const reverseDict = {};
  Object.entries(dictionary).forEach(([word, token]) => {
    reverseDict[token] = word;
  });

  // Replace tokens back with words
  let restored = compressedText;
  Object.entries(reverseDict).forEach(([token, word]) => {
    restored = restored.split(token).join(word);
  });

  return restored;
}

module.exports = {
  getFileSizeBytes,
  closestSquareDims,
  buildWordDictionary,
  countWords,
  restoreDictionary,
};
