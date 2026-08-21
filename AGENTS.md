# OpenBIIN Project Rules

This file contains rules and instructions for Antigravity and any other AI agents contributing to this repository.

## Language Requirements
- All communication with users may be in the user's preferred language (e.g., Spanish).
- However, **all files, code, commits, and documentation within the repository MUST be written in English.**

## Data Formatting Guidelines
- The database consists of CSV files named by the first two digits of the BIN (e.g., `21.csv`, `41.csv`, `59.csv`).
- **Do not create CSV files with other naming conventions.**
- The CSV header and columns must strictly be: `BIN6, Ranges, Issuer, Country, Brand, Type`

### Column Rules
1. **BIN6**: Must be exactly 6 digits.
2. **Ranges**: Represents the rest of the PAN digits. Use the pipe character `|` to separate distinct contiguous blocks. Example: `00-19|50-99`.
3. **Issuer**: The name of the bank or financial institution. Ensure title case.
4. **Country**: A 2-letter ISO 3166-1 alpha-2 code (e.g., `US`, `MX`, `ES`).
5. **Brand**: Always use lowercase for brands (e.g., `visa`, `mastercard`, `amex`).
6. **Type**: Always use lowercase. Must be exactly one of: `credit`, `debit`, `prepaid`.

### Updating Data
- **Always keep the CSV files numerically sorted by the `BIN6` column.**
- Before adding a new BIN, check if the `BIN6` already exists. If it does, and you are adding a new sub-range, append the new range to the existing `Ranges` column using a pipe `|` instead of creating a duplicate row.
- Never use commas inside any of the columns. If an `Issuer` name contains a comma, either remove it or encapsulate the entire string in quotes.
