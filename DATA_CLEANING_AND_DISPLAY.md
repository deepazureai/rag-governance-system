## Data Cleaning and Display Implementation

### Overview
This document outlines the data sanitization pipeline and complete text display system implemented for raw data handling.

---

## 1. Data Sanitization Pipeline

### Problem Addressed
PostgreSQL table data contains special characters (, ; ~ @ # $ % ^ & etc.) that break the comma-delimited CSV pipeline and cause issues in metrics calculation and display.

### Solution: DataSanitizer Utility
Location: `backend/src/utils/dataSanitizer.ts`

The sanitizer removes unwanted special characters while **preserving comma delimiters** which are critical for data integrity.

#### Preserved Characters
- Alphanumeric: `a-zA-Z0-9`
- Whitespace: spaces, tabs, newlines
- **Comma (,)** - CSV delimiter (PRESERVED)
- Basic punctuation: `. - _ ( ) / : ; ' " ! ?`
- Business characters: `& @ #`

#### Removed Characters
All other special characters that don't fall into the above categories, including:
- Currency symbols: `$ € ¥`
- Math operators: `+ = * %`
- Special symbols: `~ ` ^ < > { } [ ] |`
- Non-ASCII characters

### Implementation Details

**Three Specialized Methods:**

1. **sanitizePrompt()** - For user prompts
   - Preserves natural language punctuation (!, ?, quotes)
   - Maintains sentence structure
   - Example: "What's the meaning of life?" → "What's the meaning of life?" (unchanged)

2. **sanitizeResponse()** - For LLM responses
   - Similar to prompt sanitization
   - Preserves newlines for multi-paragraph responses
   - Example: "Response:\nAnswer here" → "Response:\nAnswer here"

3. **sanitizeContext()** - For retrieved context
   - Preserves paragraph breaks (double newlines)
   - Maintains document structure
   - Cleans excessive whitespace while keeping formatting

4. **sanitizeRecord()** - For entire records
   - Applies field-specific sanitization based on field names
   - Intelligently identifies prompt, response, context fields
   - Keeps non-string values unchanged

### Integration Point
**File**: `backend/src/services/BatchProcessingService.ts` (Line 45-89)

During batch processing, raw data is sanitized **before storage in MongoDB**:

```typescript
const sanitizedQuery = DataSanitizer.sanitizePrompt(record.data.query || '');
const sanitizedResponse = DataSanitizer.sanitizeResponse(record.data.response || '');
const sanitizedContext = DataSanitizer.sanitizeContext(record.data.context || '');
const sanitizedRecordData = DataSanitizer.sanitizeRecord(record.data);

// Store sanitized data
return {
  query: sanitizedQuery,
  response: sanitizedResponse,
  context: sanitizedContext,
  recordData: sanitizedRecordData,
  // ... other fields
};
```

---

## 2. Complete Text Display System

### Problem Addressed
Previously, raw data display was truncated:
- Prompts shown in full
- Responses limited to preview
- Context truncated to 200 characters with ellipsis
- No character count display

### Solution: Expanded Modal Display
**File**: `src/components/dashboard/raw-data-detail-modal.tsx`

#### Changes Per Section

1. **User Prompt Section**
   - Added scrollable container: `max-h-96 overflow-y-auto`
   - Shows complete prompt text
   - Added character count display
   - Display: `<span>Length: {record.userPrompt?.length || 0} characters</span>`

2. **Context Retrieved Section**
   - Removed 200-character substring limit
   - Changed from `line-clamp-3` to full text display
   - Added scrollable container per context item: `max-h-64 overflow-y-auto`
   - Added null-safe rendering for empty context
   - Added character count per context item
   - Preserves relevance score badge styling

3. **LLM Response Section**
   - Removed truncation limit
   - Added scrollable container: `max-h-96 overflow-y-auto`
   - Shows complete response text
   - Added character count display
   - Preserves timestamp and copy functionality

#### Display Features
- **Scrollable**: Large content doesn't break layout, users scroll to read
- **Character Counts**: Users see full data size at a glance
- **Whitespace Preservation**: `whitespace-pre-wrap` maintains original formatting
- **Word Breaks**: `break-words` ensures text wraps properly
- **Color Coding**: Same terminal-style colors (green for prompt, yellow for response, purple for context)

---

## 3. Data Flow Example

### Before Implementation
```
PostgreSQL Data: "What's the AI? (question: ~test~) [important]"
                    ↓
                 [No sanitization]
                    ↓
MongoDB Storage: "What's the AI? (question: ~test~) [important]"
                    ↓
CSV Export:      BREAKS - special chars cause parsing errors
                    ↓
Display Modal:   "What's the AI? (question: ~te..." [TRUNCATED]
```

### After Implementation
```
PostgreSQL Data: "What's the AI? (question: ~test~) [important]"
                    ↓
            [DataSanitizer.sanitizePrompt()]
                    ↓
MongoDB Storage: "What's the AI? (question: test) [important]"
                    ↓
CSV Export:      Works correctly - comma delimiters intact
                    ↓
Display Modal:   "What's the AI? (question: test) [important]" [FULL TEXT, SCROLLABLE]
```

---

## 4. Validation

### Comma Delimiter Safety Check
Method: `isCommaDelimiterSafe(value: string): boolean`

Validates that data doesn't contain CSV-breaking characters:
```typescript
const isSafe = DataSanitizer.isCommaDelimiterSafe(sanitizedData);
// Returns true if data is safe for CSV export
```

---

## 5. Performance Considerations

- Sanitization happens **once during batch processing** (not on every display)
- No performance impact on data retrieval
- Sanitized data is stored permanently, no re-processing on display
- Scrollable containers use CSS (no JavaScript overhead)

---

## 6. Testing the System

### Manual Testing Workflow

1. **Create application** with PostgreSQL connection
2. **Add raw data** with special characters:
   ```
   prompt: "What's AI? ($$$IMPORTANT$$$)"
   response: "AI is... [~test~]"
   context: "Definition: "AI" is..."
   ```
3. **Run batch process** - Data sanitized automatically
4. **Check raw data display**:
   - Open raw data modal
   - Verify no special chars like `$$$`, `~~~`, `[`, `]` are visible
   - Verify text is complete and scrollable
   - Check character counts
5. **Export to CSV** - Should work without errors

---

## 7. Future Enhancements

- [ ] Add regex customization per application (if sanitization needs to be stricter/looser)
- [ ] Add data cleaning report showing what was removed
- [ ] Add before/after comparison view in UI
- [ ] Store original unsanitized data in archive for compliance/audit
