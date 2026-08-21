import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini SDK
// Requires GEMINI_API_KEY environment variable to be set
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function runAudit() {
  const dataDir = path.join(__dirname, '..', 'functions', 'data');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));

  if (files.length === 0) {
    console.log("No CSV files found in functions/data/");
    return;
  }

  // Pick a random CSV file to audit
  const randomFile = files[Math.floor(Math.random() * files.length)];
  const filePath = path.join(dataDir, randomFile);

  console.log(`Targeting file: ${randomFile}`);

  // Read and parse CSV
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const headers = lines[0];

  let rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    let cols = [];
    let inQuotes = false;
    let curr = "";
    for (let char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        cols.push(curr);
        curr = "";
      } else {
        curr += char;
      }
    }
    cols.push(curr);

    rows.push({
      bin6: cols[0],
      ranges: cols[1],
      issuer: cols[2],
      country: cols[3],
      brand: cols[4],
      type: cols[5],
      originalLine: line
    });
  }

  // Prioritize incomplete rows
  let incompleteRows = rows.filter(r =>
    !r.issuer || r.issuer === 'Unknown' ||
    !r.country || r.country === 'Unknown' ||
    !r.brand || r.brand === 'Unknown' ||
    !r.type || r.type === 'Unknown'
  );

  let targets = [];
  if (incompleteRows.length > 0) {
    targets = incompleteRows.slice(0, 10);
  } else {
    // If all are perfectly filled, just randomly audit 10 rows
    const shuffled = rows.sort(() => 0.5 - Math.random());
    targets = shuffled.slice(0, 10);
  }

  if (targets.length === 0) {
    console.log("No rows available to audit.");
    return;
  }

  console.log(`Auditing ${targets.length} BINs...`);

  const prompt = `You are an autonomous data curation agent for the OpenBIIN database. 
Your task is to audit and correct the following Bank Identification Numbers (BINs) against reliable banking data sources using your web search capability.

RULES (CRITICAL):
1. "bin6" must be exactly 6 digits.
2. "ranges" must be pipe-separated contiguous blocks (e.g. 00-19|50-99). Use 00-99 if the BIN covers the full PAN range.
3. "issuer" must be Title Case. Never use commas inside the string.
4. "country" must be a 2-letter ISO 3166-1 alpha-2 code (e.g., US, DK, MX).
5. "brand" must be entirely lowercase (e.g., visa, mastercard, amex).
6. "type" must be entirely lowercase and strictly one of: credit, debit, prepaid.

Input Data to Audit:
${JSON.stringify(targets.map(t => ({ bin6: t.bin6, ranges: t.ranges, issuer: t.issuer, country: t.country, brand: t.brand, type: t.type })), null, 2)}

Provide your response ONLY as a raw JSON array containing the audited objects. Do NOT include markdown blocks (\`\`\`json). The objects MUST have the exact keys: "bin6", "ranges", "issuer", "country", "brand", "type". If a field is verified and correct, return it as is. If it's incorrect or incomplete, return the corrected value.`;

  try {
    console.log(`Calling Gemini API (gemini-3.1-flash-lite) directly...`);
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1
      }
    };

    const fetchResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const responseData = await fetchResponse.json();

    if (!fetchResponse.ok) {
      console.error("API Error Response:", JSON.stringify(responseData, null, 2));
      process.exit(1);
    }

    let rawText = responseData.candidates[0].content.parts[0].text;

    // Clean up potential markdown formatting from the model output
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/```/g, '').trim();
    }

    const auditedData = JSON.parse(rawText);

    // Update the rows
    let updatedCount = 0;
    for (const audited of auditedData) {
      const rowIndex = rows.findIndex(r => r.bin6 === audited.bin6);
      if (rowIndex !== -1) {
        // Enforce rules on output before writing
        let cleanIssuer = (audited.issuer || '').replace(/,/g, '');
        let cleanBrand = (audited.brand || '').toLowerCase();
        let cleanType = (audited.type || '').toLowerCase();
        let cleanRanges = audited.ranges || '00-99';
        let cleanCountry = (audited.country || '').toUpperCase();

        // Safety check for type
        if (!['credit', 'debit', 'prepaid'].includes(cleanType)) {
          cleanType = rows[rowIndex].type; // Revert to old if invalid
        }

        const newLine = `${audited.bin6},${cleanRanges},${cleanIssuer},${cleanCountry},${cleanBrand},${cleanType}`;

        if (rows[rowIndex].originalLine !== newLine) {
          console.log(`[UPDATE] BIN ${audited.bin6}:`);
          console.log(`  OLD: ${rows[rowIndex].originalLine}`);
          console.log(`  NEW: ${newLine}`);
          rows[rowIndex].originalLine = newLine;
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      // Re-sort the CSV numerically by BIN6 to enforce repository rules
      rows.sort((a, b) => a.bin6.localeCompare(b.bin6));

      let newFileContent = headers + '\n';
      for (const row of rows) {
        newFileContent += row.originalLine + '\n';
      }

      fs.writeFileSync(filePath, newFileContent.trim() + '\n', 'utf8');
      console.log(`Successfully applied ${updatedCount} updates to ${randomFile}.`);
    } else {
      console.log(`All ${targets.length} BINs were verified successfully with no changes needed.`);
    }
  } catch (error) {
    console.error("Audit failed:", error);
    process.exit(1);
  }
}

runAudit();
