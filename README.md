# OpenBIIN Database

Welcome to **OpenBIIN**, an open, community-driven database for Bank Identification Numbers (BIN) and Issuer Identification Numbers (IIN).

This repository serves as the core data layer for identifying the issuing bank, country, card brand, and card type (Credit, Debit, Prepaid) of payment cards using their first 6 digits (BIN6).

## Data Architecture

To ensure fast lookups, prevent repository bloat, and avoid merge conflicts, the data is split into multiple CSV files based on the first two digits of the BIN. These files are located in `functions/data/`.

For example:
* `21.csv` contains all BINs starting with `21`.
* `41.csv` contains all BINs starting with `41` (e.g., Visa).
* `55.csv` contains all BINs starting with `55` (e.g., MasterCard).

### CSV Schema

Each CSV file strictly follows this structure:

`BIN6, Ranges, Issuer, Country, Brand, Type`

| Column | Description |
|---|---|
| **BIN6** | The base 6-digit Bank Identification Number. |
| **Ranges** | Pipe-separated (`\|`) contiguous blocks of remaining PAN digits issued by the institution (e.g., `00-19\|50-99`). This compresses the data and reduces row count. |
| **Issuer** | The name of the issuing bank or financial institution. |
| **Country** | The 2-character ISO 3166-1 alpha-2 country code (e.g., `CA`, `US`, `MX`). |
| **Brand** | The payment network brand (e.g., `visa`, `mastercard`, `amex`). |
| **Type** | The type of the card. Strictly limited to: `credit`, `debit`, `prepaid`. |

## Consumption & API

The project exposes a public REST API to query the BIN database. You can query using the first 6 digits (BIN6) or 8 digits (for sub-range precision).

### Endpoint
`GET https://openbiin.web.app/api/{bin}`

### Example Request (cURL)
```bash
curl https://openbiin.web.app/api/457100
```

### Example Response (6 digits - Multiple Issuers)
When querying a 6-digit BIN, the API returns an array of all possible issuers for that prefix:
```json
{
  "bin": "457100",
  "requested_bin": "457100"
  "results": [
    {
      "bin": "457100",
      "ranges": "00-10",
      "issuer": "Bank Norwegian ASA",
      "country": "DK",
      "brand": "visa",
      "requested_bin": "457100",
      "type": "debit"
    },
    {
      "bin": "457100",
      "ranges": "40-45|51-53",
      "issuer": "Nordea",
      "country": "DK",
      "brand": "visa",
      "requested_bin": "457100",
      "type": "debit"
    }
  ]
}
```

### Example Response (8 digits - Precise Match)
If you query an 8-digit BIN, the API precisely filters the sub-ranges and returns only the exact matching issuer:
```json
{
  "bin": "45710042",
  "requested_bin": "45710042",
  "results": [
    {
      "bin": "457100",
      "ranges": "40-45|51-53",
      "issuer": "Nordea",
      "country": "DK",
      "brand": "visa",
      "requested_bin": "45710042",
      "type": "debit"
    }
  ]
}
```

## Contributing

We welcome contributions to keep the database up to date! To maintain consistency, please follow these rules when modifying the data:

### How to modify the data

1. **Locate the correct file:** Find the CSV file in `functions/data/` that matches the first two digits of the BIN (e.g., `45.csv` for `457100`).
2. **Keep it sorted:** Always insert new rows so that the CSV remains numerically sorted by the `BIN6` column.
3. **Sub-Ranges (`Ranges` column):** 
   - If a BIN uses the full range, write `00-99` (Do not leave it blank).
   - If an issuer only uses a specific 8-digit range (e.g., `45710005`), specify it as `05` in the `Ranges` column. 
   - If they use multiple ranges, separate them with a pipe `|` (e.g., `00-19|50-99`).
4. **No commas in data:** Never use commas inside any of the columns. If an `Issuer` name contains a comma, either remove it or encapsulate the entire string in quotes.
5. **Language:** All pull requests and documentation must be in English.
