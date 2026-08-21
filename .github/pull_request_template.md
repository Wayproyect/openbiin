## Description

Please include a summary of the change and which BINs or ranges were added/modified. 

## Type of change

- [ ] New BIN addition
- [ ] Sub-Range modification / split
- [ ] Issuer / Country / Brand / Type correction
- [ ] Other (please describe):

## Checklist:

Before submitting this PR, please review the following rules:

- [ ] I have placed the modifications in the correct CSV file in `functions/data/` based on the first 2 digits of the BIN.
- [ ] The CSV file is sorted numerically by the `BIN6` column.
- [ ] If the BIN uses the full range, the `Ranges` column contains `00-99`.
- [ ] If the BIN uses a specific range, I used the `Ranges` column correctly (e.g. `00-19|50-99`) instead of creating duplicate `BIN6` rows.
- [ ] There are NO commas inside my data strings (e.g. `Issuer`). If there are, I removed them or encapsulated the string in quotes.
- [ ] My PR title is descriptive (e.g., `Add new Visa ranges for Chase Bank US`).

## Additional context

Add any other context or source references about the BIN data here (e.g. link to a public banking registry).
