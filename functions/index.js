const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const fs = require("fs");
const path = require("path");

setGlobalOptions({ maxInstances: 10 });

const memoryCache = {};

function matchesRange(rangeStr, numStr) {
  if (!rangeStr) return true;

  const num = parseInt(numStr, 10);
  if (isNaN(num)) return false;

  const blocks = rangeStr.split("|");
  for (const block of blocks) {
    const parts = block.split("-");
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (num >= start && num <= end) return true;
    } else {
      const val = parseInt(parts[0], 10);
      if (num === val) return true;
    }
  }
  return false;
}

exports.api_handler = onRequest(async (req, res) => {
  res.set("Cache-Control", "public, max-age=86400, s-maxage=2592000");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const pathParts = req.path.split("/").filter(Boolean);
  const requestedBin = pathParts[pathParts.length - 1];

  if (!requestedBin || requestedBin.length < 6) {
    res.status(400).json({ error: "Invalid BIN" });
    return;
  }

  const bin6 = requestedBin.substring(0, 6);
  const prefix = requestedBin.substring(0, 2);

  try {
    if (!memoryCache[prefix]) {
      const filePath = path.join(__dirname, "data", `${prefix}.csv`);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: "BIN not found", bin: requestedBin });
        return;
      }

      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.trim().split("\n");

      const prefixData = {};

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        let cols = [];
        let inQuotes = false;
        let curr = "";
        for (let char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cols.push(curr);
            curr = "";
          } else {
            curr += char;
          }
        }
        cols.push(curr);

        const [c_bin6, ranges, issuer, country, brand, type] = cols;

        if (!prefixData[c_bin6]) {
          prefixData[c_bin6] = [];
        }

        prefixData[c_bin6].push({
          bin: c_bin6,
          ranges: ranges || "",
          issuer: issuer || "",
          country: country || "",
          brand: brand || "",
          type: type || ""
        });
      }

      memoryCache[prefix] = prefixData;
    }

    const dataArray = memoryCache[prefix][bin6];

    if (!dataArray || dataArray.length === 0) {
      res.status(404).json({ error: "BIN not found", bin: requestedBin });
      return;
    }

    let results = [];
    if (requestedBin.length >= 8) {
      const rangeDigits = requestedBin.substring(6, 8);
      const exactMatches = dataArray.filter(d => d.ranges && matchesRange(d.ranges, rangeDigits));

      if (exactMatches.length > 0) {
        results = exactMatches;
      } else {
        const fallbacks = dataArray.filter(d => !d.ranges);
        if (fallbacks.length > 0) {
          results = fallbacks;
        } else {
          results = dataArray;
        }
      }
    } else {
      results = dataArray;
    }

    const finalResults = results.map(r => ({
      ...r,
      requested_bin: requestedBin
    }));

    res.status(200).json({
      bin: bin6,
      requested_bin: requestedBin,
      results: finalResults
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
