# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Google Apps Script (GAS) project for automating Korean food product (곰탕/Gomtang) order processing and shipping invoice generation. Integrates data from Cybersky, EDI emails, and Coupang marketplace into standardized shipping formats.

## Core Development Commands

```javascript
// Daily automation pipeline
updateCybersky()        // Import Cybersky data (A-Sheet)
updateTodayEDI()       // Import today's EDI from Gmail (B-Sheet) 
updateBoth()           // Run both imports + data processing
runDataProcessor()     // Process A+B sheets → C sheet (invoice)
runVerification()      // Cross-validate data consistency
splitByProduct()       // Generate product-specific sheets

// Testing & debugging (TestFunctions.gs)
testDailyUpdate()         // Test full daily workflow
testCyberskyByDate()      // Test specific date (MMDD format)
testEDIByDate()          // Test EDI for specific date  
testFullProcessByDate()   // Test complete pipeline for date
cleanTestSheets()        // Remove all TEST_ prefixed sheets

// Configuration & UI
setupTriggers()       // Set up daily 2 PM automation
openSettings()        // Configure source spreadsheet/folder IDs
initializeConfig()    // Load settings from PropertiesService
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

### Module Dependencies
```
Main.gs (Central Controller & UI Menu)
├── CyberskyData.gs     → A-Sheet: Customer orders from source spreadsheet
├── EDIData.gs          → B-Sheet: Shipping data from Gmail attachments  
├── DataProcessor.gs    → Core business logic: A+B → C transformation
├── Verification.gs     → Quality assurance: Cross-sheet validation
├── TestFunctions.gs    → Isolated testing with TEST_ prefixed sheets
├── Triggers.gs         → Automated daily execution (2 PM)
└── UI Components       → HTML dialogs for manual operations
    ├── CoupangUploader → Coupang marketplace integration
    ├── Settings        → Configuration management
    └── GooglePicker    → Drive folder/file selection
```

### Critical Data Processing Rules
1. **Order Number Matching**: B-sheet order numbers have '32' suffix → must remove for A-sheet matching
2. **Address Concatenation**: Combine A-sheet ADDR1 + ADDR2 fields with space separator  
3. **Quantity Logic**: When A/B sheets match by order number, subtract 1 from A-sheet quantity
4. **Zero Row Filtering**: Remove processed rows where ORDERCNT ≤ 0
5. **MEM_ID Handling**: If MEM_ID ≠ 'KAL_CK_MMC', move ORDER_IDX → GROUP_IDX

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

## Product Name Normalization
The system handles various product name formats through `DataProcessor.convertProductName()` and `normalizeProductName()`:

- `"제동 사골곰탕 (1박스 5개입)"` → `"제동 사골곰탕 (5팩 1세트)"`  
- `"제동 사골곰탕 5개입"` → `"제동 사골곰탕 (5팩 1세트)"`
- Used for consistent display in C-Sheet and verification calculations

## Automation & Triggers
- **Daily Schedule**: 2 PM via `setupTriggers()` → calls `dailyUpdate()`
- **EDI Time Window**: Additional EDI check if current time is 13:00-15:30  
- **Logging**: All automation results logged to "업데이트_로그" sheet (keeps last 100 entries)
- **Manual Override**: All automation functions can be called manually via menu