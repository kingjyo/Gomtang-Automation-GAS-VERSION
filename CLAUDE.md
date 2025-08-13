# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Google Apps Script (GAS) project for automating Korean food product (곰탕/Gomtang) order processing and shipping invoice generation. Integrates data from Cybersky, EDI emails, and Coupang marketplace into standardized shipping formats.

## Core Development Commands

### Daily Pipeline Operations
```javascript
// Core automation workflow
updateCybersky()        // Import Cybersky data (A-Sheet)
updateTodayEDI()       // Import today's EDI from Gmail (B-Sheet) 
updateBoth()           // Run both imports + data processing
runDataProcessor()     // Process A+B sheets → C sheet (invoice)
runVerification()      // Cross-validate data consistency
splitByProduct()       // Generate product-specific sheets
```

### Advanced Automation Workflows
```javascript
// Recommended workflow (fully integrated)
executeSeamlessWorkflow()          // Part 1 → Auto-open Coupang → Part 2 → Email
processCoupangFileAndExecuteRemaining() // Process Coupang + remaining pipeline

// Semi-automation (manual Coupang step)
semiAutomationPipeline()           // Run until verification, email reminder
executePart1Pipeline()             // Cybersky → EDI → verification
executePart2Pipeline()             // Post-Coupang: split → Excel → email

// Traditional step-by-step
executePart1Pipeline()             // Data collection and verification
// [Manual Coupang upload via openCoupangUploader()]
executePart2Pipeline()             // Final processing and email
```

### UI Dialog Functions  
```javascript
// Main interface dialogs (accessed via menu)
openCoupangUploader()      // Upload Coupang marketplace data
openProductDownloader()    // Download product-specific Excel sheets
openLocalExcelUploader()   // Upload local Excel files for processing
openEmailSender()         // Email shipment notifications
openGooglePicker()        // Drive folder/file picker for setup
openSettings()           // Configure system parameters
```

### Testing & Debugging
```javascript
// Test functions (TestFunctions.gs)
testDailyUpdate()         // Test full daily workflow
testCyberskyByDate()      // Test specific date (MMDD format)
testEDIByDate()          // Test EDI for specific date  
testFullProcessByDate()   // Test complete pipeline for date
cleanTestSheets()        // Remove all TEST_ prefixed sheets

// Utility testing
testGetRecentEDI()       // Test Gmail EDI extraction
clearTemplates()         // Reset template sheets
```

### Configuration & Setup
```javascript
setupTriggers()          // Set up daily 2 PM automation
initializeConfig()       // Load settings from PropertiesService
createEmailSettingsSheet() // Create email configuration sheet

// Advanced Trigger Management (TriggerManagement.gs)
createTodayAutoTrigger(fileId, fileName, hour, minute)  // Create single-use trigger
executeTriggerCoupangAutomation()    // Trigger execution function
deleteTriggerAndCleanup()            // Clean up after trigger completion
scheduleRetryTrigger()               // Schedule 30-min retry on failure
retryTriggerAutomation()             // Retry trigger function (max 3 attempts)
```

## Architecture

### Core Data Pipeline
The system processes three main data flows:

**1. Data Import Phase**
- `CyberskyData.gs` → Fetches A-Sheet from source spreadsheet (order data)
- `EDIData.gs` → Extracts B-Sheet from Gmail attachments (shipping quantities)

**2. Processing Phase (`DataProcessor.gs`)**
- Removes '32' suffix from B-sheet order numbers for matching
- Concatenates address fields (ADDR1 + ADDR2) 
- Adjusts quantities based on B-sheet data vs A-sheet orders
- Filters out zero-quantity rows

**3. Output Generation**
- Creates C-Sheet standardized shipping invoice
- `Verification.gs`: Cross-validates totals between sheets
- `ProductSpliter.gs`: Generates product-specific breakdowns

### System Architecture Overview
```
Main.gs (Central Controller & UI Menu - onOpen() creates menu)
├── Core Data Processing
│   ├── CyberskyData.gs     → A-Sheet: Customer orders from source spreadsheet
│   ├── EDIData.gs          → B-Sheet: Shipping data from Gmail attachments  
│   ├── DataProcessor.gs    → Core business logic: A+B → C transformation
│   ├── Verification.gs     → Quality assurance: Cross-sheet validation
│   └── ProductSpliter.gs   → Product-specific sheet generation
├── Extended Functionality
│   ├── CoupangProcessor.gs → Coupang marketplace data processing
│   ├── EmailSender.gs      → Shipment notification system
│   └── ProductDownloader.gs → Product-specific Excel export
├── Testing & Development
│   └── TestFunctions.gs    → Isolated testing with TEST_ prefixed sheets
├── Automation & Config
│   ├── Triggers.gs         → Automated daily execution (2 PM)
│   └── Settings.gs         → PropertiesService configuration management
└── UI Components (HTML Dialogs)
    ├── CoupangUploader + CoupangUploaderDialog
    ├── EmailSender + EmailSenderDialog  
    ├── ProductDownloader + ProductDownloaderDialog
    ├── ExcelUploaderProcessor + ExcelUploaderDialog
    ├── GooglePicker + PickerDialog + PickerClient
    └── DriveExplorer + DriveExplorer. (file management)
```

### Critical Data Processing Rules
1. **Order Number Matching**: B-sheet order numbers have '32' suffix → must remove for A-sheet matching
2. **Address Concatenation**: Combine A-sheet ADDR1 + ADDR2 fields with space separator  
3. **Quantity Logic**: When A/B sheets match by order number, subtract 1 from A-sheet quantity
4. **Zero Row Filtering**: Remove processed rows where ORDERCNT ≤ 0
5. **MEM_ID Handling**: If MEM_ID ≠ 'KAL_CK_MMC', move ORDER_IDX → GROUP_IDX

### Workflow Dependencies
- **ProductSpliter** (not ProductSplitter): Object name matches filename without double 't'
- **Global Functions**: Helper functions (`getTodayDate()`, `convertToFullDate()`, `initializeConfig()`) are defined in Main.gs and shared across all files
- **Email Configuration**: Requires '이메일_설정' sheet with priority-based recipient management

### Sheet Structure & Naming Convention
- **A시트**: `YYYYMMDD_간편식_싸이버스카이` (Cybersky order data)
- **B시트**: `YYYYMMDD_간편식_EDI` (EDI shipping quantities)  
- **C시트**: `YYYYMMDD_간편식_수기송장` (Final standardized invoice)
- **검산시트**: `YYYYMMDD_검산결과` (Verification report)
- **Test sheets**: Prefixed with `TEST_` for isolation

## Testing & Debugging

### Test Isolation Strategy
- All test functions create sheets prefixed with `TEST_` to avoid affecting production data
- Use `testFullProcessByDate("0807")` for end-to-end pipeline testing with specific dates  
- `cleanTestSheets()` removes all test artifacts
- Production sheets never start with `TEST_` prefix

### Gmail EDI Search Logic
EDI data extraction searches Gmail with:
```javascript
// Primary search
`from:${sender} subject:"${targetDate}" has:attachment`

// Fallback for today (13:00-15:30 time window)
`(from:brdmc@naver.com OR from:suhyang@kas.co.kr) has:attachment after:${todayStart} before:${todayEnd}`
```

### Configuration Management  
- Settings stored in `PropertiesService.getScriptProperties()`
- Required: `SOURCE_SPREADSHEET_ID`, `FOLDER_ID`, `SENDER_POSTAL_CODE`, `SENDER_ADDRESS`
- Access via `getSettings()` / `saveSettings()` functions
- Must call `initializeConfig()` to load settings into CONFIG object

## Function Return Pattern
All major functions follow consistent error handling:

```javascript
function exampleFunction(param1, param2) {
  console.log('=== Function Start: exampleFunction ===');
  console.log('Parameters:', { param1, param2 });
  
  try {
    // Core logic here
    console.log('=== Function End: exampleFunction SUCCESS ===');
    return { success: true, data: result };
    
  } catch (error) {
    console.error('ERROR in exampleFunction:', error.toString());
    console.log('=== Function End: exampleFunction FAILED ===');
    return { success: false, error: error.toString() };
  }
}
```

**Required return format**: `{ success: boolean, data/error: any }`

## Extended Features

### Coupang Integration (`CoupangProcessor.gs`)
- Processes Coupang marketplace Excel files via `processCoupangFile()`
- Converts uploaded files to Google Sheets format
- Integrates Coupang delivery data with manual invoice system
- Supports Base64 file upload through HTML dialog

### Email Notification System (`EmailSender.gs`)
- Automated shipment notifications via `processExcelAndSendEmail()`
- Extracts shipment data from current spreadsheet
- Supports date-specific processing (MMDD or YYYYMMDD formats)
- Integrates with `ProductDownloader.getEmailRecipients()` for recipient management
- Requires '이메일_설정' sheet for configuration

### Product-Specific Export (`ProductDownloader.gs`)
- Downloads product-specific sheets as Excel files
- Supported products: `['사골고기곰탕', '사골곰탕', '육포']`
- Creates consolidated Excel files for individual product categories
- Handles both current date and date-specific exports

## Product Name Normalization
The system handles various product name formats through `DataProcessor.convertProductName()` and `normalizeProductName()`:

- `"제동 사골곰탕 (1박스 5개입)"` → `"제동 사골곰탕 (5팩 1세트)"`  
- `"제동 사골곰탕 5개입"` → `"제동 사골곰탕 (5팩 1세트)"`
- Used for consistent display in C-Sheet and verification calculations

## Automation & Triggers

### Trigger Configuration Options
```javascript
setupTriggers()              // Full automation: daily 2 PM execution
setupSemiAutomationTrigger() // Semi-auto: daily 1:30 PM until verification
manualCompleteAutomation()   // Manual full pipeline with date selection
```

### Automation Modes
1. **Full Automation** (2 PM daily): Complete pipeline including Coupang data handling
2. **Semi-Automation** (1:30 PM daily): Stops at verification, emails reminder for Coupang upload
3. **Seamless Workflow**: Interactive execution with automatic Coupang uploader opening

### Logging & Monitoring
- All automation results logged to "업데이트_로그" sheet (keeps last 100 entries)
- Email alerts for verification failures via `sendVerificationFailureAlert()`
- Coupang upload reminders via `sendCoupangUploadReminder()`
- Manual override available for all automation functions via menu

## UI Dialog Architecture
The system uses paired `.gs` processor files with corresponding HTML dialog files:

### File Pairing Pattern
- **CoupangProcessor.gs** ↔ **CoupangUploaderDialog** → Marketplace data upload
- **EmailSender.gs** ↔ **EmailSenderDialog** → Shipment notification interface  
- **ProductDownloader.gs** ↔ **ProductDownloaderDialog** → Product export interface
- **ExcelUploaderProcessor.gs** ↔ **ExcelUploaderDialog** → Local file upload
- **GooglePicker.gs** + **PickerClient.gs** ↔ **PickerDialog** → Drive integration
- **Settings.gs** → Direct dialog integration for configuration

### Dialog Communication Pattern
HTML dialogs use `google.script.run` to call corresponding processor functions and return results via success/error callbacks.

## Development Guidelines

### Code Maintenance
- **Function Naming**: Use consistent object names matching filenames (e.g., `ProductSpliter.splitByProduct()`)
- **Error Handling**: All functions must return `{ success: boolean, data/error: any }` format
- **Logging Pattern**: Use `console.log('=== Function Start/End: functionName ===')` for debugging
- **Test Isolation**: Prefix all test sheets with `TEST_` to avoid production data conflicts

### Common Issues to Avoid
- **Duplicate Functions**: Remove duplicate function definitions (common in Main.gs after merges)
- **Object Name Mismatches**: Ensure object names match their filename (ProductSpliter vs ProductSplitter)
- **Missing Dependencies**: Global helper functions in Main.gs are shared across all files

**After completing tasks, always report the modified file names only (e.g., "Modified files: Main, ProductDownloader")**