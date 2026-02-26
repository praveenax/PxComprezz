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

// Build dictionary mapping words to token IDs with better compression strategy
function buildWordDictionary(text, minFrequency = 2) {
  const frequency = countWords(text);

  // Calculate compression savings for each word
  const candidates = Object.entries(frequency)
    .filter(([word, count]) => count >= minFrequency && word.length > 2)
    .map(([word, count]) => {
      // Savings = (original_length - token_length) * occurrences
      // Token length uses variable encoding: 1 byte for IDs 0-127, 2 bytes for 128-16383, etc.
      const tokenLength = 1; // Start with 1 byte tokens for best savings
      const savings = (word.length - tokenLength) * count;
      return { word, count, savings, tokenLength };
    })
    .sort((a, b) => b.savings - a.savings);

  // Select words that provide positive savings
  const profitableWords = candidates.filter((w) => w.savings > 0).slice(0, 256); // Limit to 256 tokens

  // Create dictionary with variable-length encoding
  const dictionary = {};
  profitableWords.forEach(({ word }, index) => {
    // Single byte tokens for better compression (0x80-0xFF reserved for control)
    if (index < 128) {
      dictionary[word] = String.fromCharCode(0x80 + index);
    } else {
      dictionary[word] = `\x7f${String.fromCharCode(index - 128)}`;
    }
  });

  // Apply dictionary to text
  let compressedText = text;
  
  // Apply replacements in order of savings (most beneficial first)
  profitableWords.forEach(({ word }, index) => {
    const token = dictionary[word];
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    compressedText = compressedText.replace(regex, token);
  });

  // Apply run-length encoding for repeated characters
  compressedText = applyRunLengthEncoding(compressedText);

  return { dictionary, compressedText };
}

// Run-length encoding for repeated characters (3+ occurrences)
function applyRunLengthEncoding(text) {
  let result = "";
  let i = 0;

  while (i < text.length) {
    let char = text[i];
    let count = 1;

    while (i + count < text.length && text[i + count] === char && count < 255) {
      count++;
    }

    // Use RLE for sequences of 3+ characters (marker: 0x7E + count + char)
    if (count >= 3 && char !== "\x7e" && char !== "\x7f") {
      result += `\x7e${String.fromCharCode(count)}${char}`;
    } else {
      result += char.repeat(count);
    }

    i += count;
  }

  return result;
}

// Decompress run-length encoded text
function decompressRunLengthEncoding(text) {
  let result = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "\x7e" && i + 2 < text.length) {
      // RLE marker found
      const count = text.charCodeAt(i + 1);
      const char = text[i + 2];
      result += char.repeat(count);
      i += 3;
    } else {
      result += text[i];
      i++;
    }
  }

  return result;
}

// Restore original text using dictionary
function restoreDictionary(compressedText, dictionary) {
  // Decompress run-length encoding first
  let decompressed = decompressRunLengthEncoding(compressedText);

  // Create reverse mapping: token -> word
  const reverseDict = {};
  Object.entries(dictionary).forEach(([word, token]) => {
    reverseDict[token] = word;
  });

  // Replace tokens back with words
  let restored = decompressed;
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
  applyRunLengthEncoding,
  decompressRunLengthEncoding,
};
