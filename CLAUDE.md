# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Google Apps Script (GAS) project for automating Korean food product (곰탕/Gomtang) order processing and shipping invoice generation. Integrates data from Cybersky, EDI emails, and Coupang marketplace into standardized shipping formats.

## Development Commands

```javascript
// Daily automation functions (Main.gs)
updateCybersky()       // Import Cybersky data (prompts for date)
updateTodayEDI()       // Import today's EDI from Gmail
updateBoth()           // Run both imports simultaneously
runDataProcessor()     // Process A+B sheets into C sheet
runVerification()      // Validate data consistency
splitByProduct()       // Generate product-specific sheets

// Testing functions (TestFunctions.gs)
testDailyUpdate()      // Test full daily workflow
testCyberskyByDate()   // Test specific date (MMDD format prompt)
testEDIByDate()        // Test EDI for date (MMDD format prompt)
testFullProcessByDate() // Test complete pipeline for date
cleanTestSheets()      // Remove all TEST_ prefixed sheets

// UI functions
openCoupangUploader()  // Open Coupang upload dialog
openManualUploader()   // Open manual data upload dialog
openGooglePicker()     // Configure Drive file/folder settings
openSettings()         // Open settings dialog

// Configuration
setupTriggers()        // Set up 2 PM daily automation
initializeConfig()     // Load settings from PropertiesService
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
- Settings stored in `PropertiesService` (Script Properties)
- Initial values in `Main.gs` CONFIG object
- UI configuration via Settings dialog or Google Picker

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
- DriveApp / Drive API v3: File management and archival
- GmailApp: EDI attachment extraction
- HtmlService: Web UI for manual uploads
- PropertiesService: Configuration persistence

## Testing Strategy
- Test sheets prefixed with "TEST_" for isolation
- Date-specific testing with MMDD format (e.g., "0807")
- Full pipeline testing via `testFullProcessByDate()`
- Clean up with `cleanTestSheets()`

## UI Components
- **Menu System**: `onOpen()` in Main.gs creates menu items
- **HTML Dialogs**: CoupangUploader, ManualUploader, Settings, DriveExplorer, GooglePicker
- **Picker API**: Requires API key and project number in Script Properties

## Debugging and Logging Guidelines

When implementing new functions, always include comprehensive logging:

```javascript
function exampleFunction(param1, param2) {
  console.log('=== Function Start: exampleFunction ===');
  console.log('Parameters:', { param1, param2 });
  
  try {
    console.log('Step 1: Validating inputs');
    if (!param1) throw new Error('param1 is required');
    
    console.log('Step 2: Processing data');
    const result = processData(param1, param2);
    console.log('Processing result:', result);
    
    console.log('Step 3: Returning success');
    console.log('=== Function End: exampleFunction SUCCESS ===');
    return { success: true, data: result };
    
  } catch (error) {
    console.error('ERROR in exampleFunction:', error.toString());
    console.error('Error stack:', error.stack);
    console.log('=== Function End: exampleFunction FAILED ===');
    return { success: false, error: error.toString() };
  }
}
```

**Logging Standards:**
- Start/end markers with function name for easy filtering
- Log all input parameters (excluding sensitive data)
- Log each major step with descriptive messages
- Always log error details with stack traces
- Use structured logging with objects when possible
- Return consistent `{ success: boolean, data/error }` format

## Common Issues & Solutions
1. **EDI Email Not Found**: Check Gmail search query in `EDIData.getEDIFromEmail()`
2. **Sheet Column Mismatch**: Verify headers in `getSheetAColumnMapping()` and `getSheetBColumnMapping()`
3. **Drive Permission**: Enable Drive API v3 in Google Cloud Console
4. **Data Discrepancies**: Use `runVerification()` to identify mismatches
5. **Google Picker Not Working**: Ensure API key and project number are set via `__init_setPickerConfigOnce()`

## Recent Updates (2025-08-09)
### Enhanced Google Drive File Picker
- **Recursive Search**: Search now includes all subfolders in current context (root searches entire Drive)
- **Shared Drives Search**: When in "공유 드라이브" category, searches across ALL shared drives and their contents
- **New Folder Creation**: Added `createNewFolder()` function with shared drive support
- **Search Modes**: Added `searchMode` parameter ('recursive' default, 'current' for single folder)

### Key Functions Added
- `createNewFolder(parentFolderId, folderName)`: Creates folders with proper shared drive handling
- `searchDriveFiles()`: Enhanced with recursive search and multi-drive support
- UI: Added "새 폴더" button in picker dialog