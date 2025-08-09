# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Google Apps Script (GAS) project for automating Korean food product (곰탕/Gomtang) order processing and shipping invoice generation. The system integrates data from Cybersky, EDI emails, and Coupang marketplace into standardized shipping formats.

## Development Commands

### Google Apps Script Development
- **Deploy**: Use the Google Apps Script editor (script.google.com) - no local build process
- **Test Functions**: Available in `TestFunctions.gs` - can be run directly from Apps Script editor
- **View Logs**: Use `View > Logs` in Apps Script editor or check "업데이트_로그" sheet
- **Trigger Setup**: Run `setupTriggers()` to enable daily automation at 2 PM

### Common Development Tasks
```javascript
// Test today's data processing
testDailyUpdate()

// Test specific date (MMDD format)
testCyberskyByDate()  // Prompts for date
testEDIByDate()       // Prompts for date

// Clear test data
cleanTestSheets()

// Reset templates
clearTemplates()
```

## Architecture

### Core Data Flow
1. **Data Import** (A-Sheet from Cybersky, B-Sheet from EDI)
   - `CyberskyData.gs`: Fetches from source spreadsheet
   - `EDIData.gs`: Extracts from Gmail attachments

2. **Processing Pipeline** 
   - `DataProcessor.gs`: Main consolidation logic
   - Key: Removes '32' suffix from B-sheet orders, concatenates addresses, adjusts quantities

3. **Output Generation** (C-Sheet standardized invoice)
   - `Verification.gs`: Cross-validation
   - `ProductSpliter.gs`: Product-specific sheets

### Module Dependencies
```
Main.gs (Central Controller)
├── CyberskyData.gs     → Fetches Sheet A from source spreadsheet
├── EDIData.gs          → Extracts Sheet B from Gmail
├── DataProcessor.gs    → Processes A+B → C (invoice)
├── CoupangProcessor.gs → Handles Coupang uploads
├── Verification.gs     → Quality control
└── Triggers.gs         → Automation scheduling
```

### Key Configuration
Located in `Main.gs`:
- `CONFIG.SOURCE_SPREADSHEET_ID`: Source data spreadsheet
- `CONFIG.FOLDER_ID`: Google Drive archive folder
- Settings are persisted via `PropertiesService`

## Important Technical Details

### Data Processing Rules
1. **Order Number Matching**: B-sheet numbers have '32' suffix that must be removed for matching
2. **Address Handling**: Concatenate columns G, H, I from A-sheet with spaces
3. **Quantity Adjustment**: When orders match between sheets, use B-sheet quantity for C-sheet
4. **Zero Filtering**: Remove rows where all product quantities are zero

### Sheet Structure
- **A시트 (Cybersky)**: Raw order data with customer details
- **B시트 (EDI)**: Shipping quantities from warehouse
- **C시트 (Invoice)**: Final standardized shipping document
- **검산시트**: Verification and discrepancy report

### Product Categories
The system handles three main product families:
- 사골고기곰탕 (Beef bone soup with meat)
- 사골곰탕 (Beef bone soup)
- 육포 (Beef jerky)

### Error Handling
- Manual upload fallback when automation fails
- Comprehensive logging in "업데이트_로그" sheet
- Date-specific testing for debugging historical data

## Google APIs Used
- SpreadsheetApp: Core spreadsheet operations
- DriveApp / Drive API v2: File management and archival
- GmailApp: EDI attachment extraction
- HtmlService: Web UI for manual uploads
- PropertiesService: Configuration persistence

## Testing Approach
Use `TestFunctions.gs` for isolated testing:
- Test data prefixed with "TEST_" for easy cleanup
- Date-specific testing available for historical debugging
- Full pipeline simulation with `testFullProcessByDate()`

## UI Components
- **Menu System**: Added via `onOpen()` in Main.gs
- **HTML Dialogs**: CoupangUploader, ManualUploader, Settings, DriveExplorer
- **Google Picker**: For file/folder selection (requires OAuth setup)

## Common Issues & Solutions
1. **EDI Email Not Found**: Check Gmail search terms and sender address in EDIData.gs
2. **Sheet Mapping Errors**: Verify column headers match expected format
3. **Drive Permission Issues**: Ensure script has Drive API enabled
4. **Quantity Mismatches**: Run `runVerification()` to identify discrepancies