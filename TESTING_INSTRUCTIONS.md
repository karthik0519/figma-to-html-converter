# Testing Instructions for Decorative Line Fix

## Changes Made

I've implemented fixes to properly center the decorative line at the bottom of the sign-in form. The changes include:

### 1. Enhanced Visual Containment Detection
- Decorative lines (height < 10px, width > 20px) are now detected with a more lenient tolerance (20px instead of 10px)
- These lines are automatically grouped inside their visual containers
- Added logging to show when regrouping happens

### 2. Improved CSS Centering
- Decorative lines in flexbox containers automatically get `align-self: center`
- Any conflicting absolute positioning is removed
- Works for both flexbox and absolute positioned layouts

## How to Test

### Step 1: Restart the Server (if needed)
The server should auto-reload with `tsx watch`, but if you want to be sure:

```bash
# In the server directory
npm run dev
```

### Step 2: Convert the Figma File
1. Open your browser to `http://localhost:5173` (or wherever the client is running)
2. Enter the Figma URL: `https://www.figma.com/design/MxMXpjiLPbdHlratvH0Wdy/Softlight-Engineering-Take-Home-Assignment?node-id=0-1`
3. Enter your Figma API key
4. Click "Convert"

### Step 3: Check the Server Logs
Look for messages like:
```
✓ Regrouping decorative line "Line 1" (XXxYYpx) into "Sign in"
```

This confirms the line is being properly grouped inside the container.

### Step 4: Inspect the Generated HTML/CSS
1. Download the ZIP file or preview the HTML
2. Look for the decorative line element in the CSS
3. It should have:
   ```css
   align-self: center;
   ```
4. The line should NOT have `position: absolute` with `left: 0` (which would left-align it)

### Step 5: Visual Verification
The decorative line should now:
- ✅ Appear **inside** the sign-in frame (not outside)
- ✅ Be **centered horizontally**
- ✅ Be positioned at the **bottom** of the form

## Expected Results

### Before Fix:
- Line appeared left-aligned
- Line was outside the frame
- Line was treated as a sibling of the container

### After Fix:
- Line is centered
- Line is inside the frame
- Line is a child of the container
- CSS uses `align-self: center` for proper centering

## Troubleshooting

### If the line is still left-aligned:

1. **Check server logs** - Make sure you see the regrouping message
2. **Clear browser cache** - The old HTML might be cached
3. **Restart the server** - Force a fresh start:
   ```bash
   # Kill the server
   pkill -f "tsx watch"
   
   # Restart
   cd server
   npm run dev
   ```

### If you don't see regrouping messages:

The line might not meet the detection criteria. Check:
- Line height should be < 10px
- Line width should be > 20px
- Line should be within the container bounds (with 20px tolerance)

### If the CSS doesn't have `align-self: center`:

The parent container might not be detected as flexbox. Check:
- Parent should have multiple children arranged vertically
- Parent should be using flexbox layout strategy

## File Changes

The following files were modified:
- `server/src/parser/Parser.ts` - Enhanced visual containment detection
- `server/src/transformer/LayoutEngine.ts` - Improved decorative line centering
- `SPACING_AND_LINE_FIXES.md` - Documentation of fixes

## Next Steps

After testing, if the issue persists:
1. Share the server console output (especially the regrouping messages)
2. Share the generated CSS for the decorative line element
3. Share a screenshot of the result

This will help me provide a more targeted fix if needed.
