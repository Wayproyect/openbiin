import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'functions', 'data');
const AUDIT_STATE_FILE = path.join(__dirname, '..', 'audit.md');
const TIMEOUT_MS = 48 * 60 * 1000; // 48 minutes to allow graceful exit and commit before 50min github timeout

// Configuration
const BIN_API_HOST = process.env.BIN_API_HOST;
const BIN_API_KEY = process.env.BIN_API_KEY;

if (!BIN_API_HOST || !BIN_API_KEY) {
  console.error("Missing BIN_API_HOST or BIN_API_KEY environment variables.");
  process.exit(1);
}

// Ensure titles are nicely formatted
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

// Fetch helper with API KEY
async function fetchApi(endpoint, options = {}) {
  const url = `${BIN_API_HOST}${endpoint}`;
  const headers = {
    'x-api-key': BIN_API_KEY,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

async function checkStatus() {
  console.log("Checking API Status...");
  try {
    const data = await fetchApi('/status');
    if (data.status === 'logged_in') {
      console.log("API is logged_in. Proceeding with audit.");
      return true;
    } else {
      console.error(`API status is '${data.status}'. Exiting with error so GitHub Actions fails.`);
      process.exit(1);
    }
  } catch (err) {
    console.error("Failed to check status:", err);
    process.exit(1);
  }
}

function loadState() {
  if (fs.existsSync(AUDIT_STATE_FILE)) {
    try {
      const content = fs.readFileSync(AUDIT_STATE_FILE, 'utf8');
      const jsonStr = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonStr && jsonStr[1]) {
        return JSON.parse(jsonStr[1]);
      }
    } catch (err) {
      console.error("Error reading audit state, starting from 0:", err);
    }
  }
  return { fileIndex: 0, rowIndex: 0 };
}

function saveState(state) {
  const md = `# Audit State\n\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n`;
  fs.writeFileSync(AUDIT_STATE_FILE, md, 'utf8');
}

function parseCSVLine(line) {
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
  return {
    bin6: cols[0],
    ranges: cols[1],
    issuer: cols[2],
    country: cols[3],
    brand: cols[4],
    type: cols[5],
    originalLine: line
  };
}

function formatCSVLine(row) {
  let { bin6, ranges, issuer, country, brand, type } = row;
  
  // Apply rules
  if (issuer) {
    issuer = toTitleCase(issuer.replace(/,/g, ''));
  } else {
    issuer = 'Unknown';
  }
  
  brand = (brand || 'Unknown').toLowerCase();
  type = (type || 'Unknown').toLowerCase();
  country = (country || 'Unknown').toUpperCase();
  ranges = ranges || '00-99';
  
  return `${bin6},${ranges},${issuer},${country},${brand},${type}`;
}

async function runAudit() {
  const startTime = Date.now();
  await checkStatus();

  let state = loadState();
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.csv')).sort();

  if (files.length === 0) {
    console.log("No CSV files found in functions/data/");
    return;
  }

  // Handle case where state is beyond the file list (start over)
  if (state.fileIndex >= files.length) {
    console.log("Audit reached the end. Restarting from 0.");
    state = { fileIndex: 0, rowIndex: 0 };
  }

  let currentFileIndex = state.fileIndex;
  let currentRowIndex = state.rowIndex;

  let timeIsUp = false;

  for (let i = currentFileIndex; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(DATA_DIR, filename);
    console.log(`Auditing file: ${filename}`);

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    if (lines.length <= 1) continue; // Only headers or empty

    const headers = lines[0];
    let rows = [];
    
    // Parse existing rows
    for (let j = 1; j < lines.length; j++) {
      if (!lines[j].trim()) continue;
      rows.push(parseCSVLine(lines[j]));
    }

    let fileWasUpdated = false;
    let newRows = []; // To hold the updated rows for this file
    
    // We process sequentially, storing everything in `newRows`
    // Wait, since we are doing splits, a single old row might become multiple new rows,
    // or we might combine things. Let's build a clean list.
    
    for (let r = 0; r < rows.length; r++) {
      // Check timeout
      if (Date.now() - startTime > TIMEOUT_MS) {
        console.log("Time limit reached (48 minutes). Gracefully exiting.");
        timeIsUp = true;
        
        // Push remaining unprocessed rows to newRows
        for (let rem = r; rem < rows.length; rem++) {
          newRows.push(rows[rem]);
        }
        
        // Save current row index
        currentRowIndex = r;
        break; // break the row loop
      }

      // If we are resuming, skip rows we already audited
      if (i === currentFileIndex && r < currentRowIndex) {
        newRows.push(rows[r]);
        continue;
      }

      const row = rows[r];
      const bin6 = row.bin6;

      try {
        console.log(`Querying BIN API for: ${bin6}`);
        const response = await fetchApi('/bin', {
          method: 'POST',
          body: JSON.stringify({ bin: bin6 })
        });

        // The response might contain 'data' and 'ranges'
        // If we get an array in 'ranges' (split BIN logic)
        if (response.ranges && Array.isArray(response.ranges) && response.ranges.length > 0) {
          console.log(`[ALERT] Split BIN detected for ${bin6}. Implementing automatic split logic.`);
          
          let splitRows = [];
          for (const rng of response.ranges) {
            // Ensure object structure matches what we expect
            const newRow = {
              bin6: bin6,
              ranges: rng.range || rng.ranges || '00-99',
              issuer: rng.issuer || rng.bank || row.issuer,
              country: rng.country || row.country,
              brand: rng.brand || row.brand,
              type: rng.type || row.type
            };
            splitRows.push(newRow);
          }

          // Combine ranges if issuer, country, brand, and type are IDENTICAL
          // to respect the rule: "append the new range using a pipe | instead of creating a duplicate row"
          let combinedRows = [];
          for (const sr of splitRows) {
            const matchIndex = combinedRows.findIndex(cr => 
              cr.issuer === sr.issuer && 
              cr.country === sr.country && 
              cr.brand === sr.brand && 
              cr.type === sr.type
            );

            if (matchIndex >= 0) {
              // Append range with pipe
              combinedRows[matchIndex].ranges += `|${sr.ranges}`;
            } else {
              combinedRows.push(sr);
            }
          }

          // Format them properly
          combinedRows.forEach(cr => {
            cr.originalLine = formatCSVLine(cr);
            newRows.push(cr);
          });
          
          fileWasUpdated = true;

        } else if (response.data) {
          // Standard single response
          const apiData = response.data;
          
          let newRow = {
            bin6: bin6,
            ranges: apiData.range || apiData.ranges || row.ranges || '00-99',
            issuer: apiData.issuer || apiData.bank || row.issuer,
            country: apiData.country || row.country,
            brand: apiData.brand || row.brand,
            type: apiData.type || row.type
          };
          
          newRow.originalLine = formatCSVLine(newRow);
          
          if (newRow.originalLine !== row.originalLine) {
            console.log(`[UPDATE] BIN ${bin6}:`);
            console.log(`  OLD: ${row.originalLine}`);
            console.log(`  NEW: ${newRow.originalLine}`);
            fileWasUpdated = true;
          }
          
          newRows.push(newRow);
        } else {
          // Unrecognized response, keep old row
          newRows.push(row);
        }

      } catch (err) {
        console.error(`Error querying BIN ${bin6}:`, err.message);
        // On error, keep the old row so we don't lose data, and move on.
        newRows.push(row);
      }
      
      // Update row index so if we exit, we know where we were
      currentRowIndex = r + 1;
    }

    if (fileWasUpdated) {
      // Re-sort the CSV numerically by BIN6 just to be safe
      newRows.sort((a, b) => a.bin6.localeCompare(b.bin6));

      let newFileContent = headers + '\n';
      for (const nr of newRows) {
        newFileContent += nr.originalLine + '\n';
      }

      fs.writeFileSync(filePath, newFileContent.trim() + '\n', 'utf8');
      console.log(`Successfully applied updates to ${filename}.`);
    }

    if (timeIsUp) {
      state.fileIndex = i;
      state.rowIndex = currentRowIndex;
      break; // Exit file loop
    } else {
      // Finished this file, move to next file at row 0
      currentFileIndex = i + 1;
      currentRowIndex = 0;
      state.fileIndex = currentFileIndex;
      state.rowIndex = 0;
    }
  }

  // Save the state
  if (!timeIsUp && state.fileIndex >= files.length) {
    console.log("Audit complete. Will restart from 0 next time.");
    saveState({ fileIndex: 0, rowIndex: 0 });
  } else {
    saveState(state);
  }

  console.log("Execution finished successfully.");
  process.exit(0);
}

runAudit();
