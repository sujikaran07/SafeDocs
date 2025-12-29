# SafeDocs - Complete Documentation

## Overview

SafeDocs is an AI-powered file security scanner and sanitizer that detects malicious content in documents (PDF, DOCX, XLSX, etc.) and provides cleaned versions.

---

## How It Works

### 1. **Upload & Scan**
- User uploads a file
- ML models analyze the file:
  - **LightGBM:** Primary classifier (70% weight)
  - **Deep Learning:** Neural network patterns
  - **Random Forest:** Ensemble learning
  - **Rule Engine:** Keyword matching (6000+ malware terms)

### 2. **Verdict Decision**

**Evidence-Based Logic:**
```python
if file has JavaScript/macros:
    verdict = "MALICIOUS"
elif high severity findings:
    verdict = "MALICIOUS"
elif medium findings + score > 70%:
    verdict = "MALICIOUS"
elif risk score > 85%:
    verdict = "MALICIOUS"
else:
    verdict = "BENIGN"
```

**NOT based on arbitrary threshold!**

### 3. **Sanitization (Malicious Files Only)**

If verdict = MALICIOUS:
- Remove JavaScript
- Remove auto-actions (OpenAction, AA)
- Remove macros/VBA
- Scrub 6000+ malware keywords
- Remove annotations
- Strip metadata

If verdict = BENIGN:
- Return original file unchanged (no sanitization needed)

---

## Understanding Results

### **Risk Score vs Verdict**

| Metric | Meaning | Example |
|--------|---------|---------|
| **Risk Score** | ML model's suspicion level<br/>How complex/unusual | 60% = "Complex structure" |
| **Verdict** | Actual decision<br/>Does it have threats? | BENIGN = "No malicious code found" |

**Example:**
- **Scanned invoice:** 55% risk, BENIGN ✓ (complex but safe)
- **PDF with JS:** 40% risk, MALICIOUS ✗ (simple but dangerous)

**Verdict is what matters!** Risk score is just extra information.

### **Color Coding**

| Verdict | Color | Regardless of Score |
|---------|-------|---------------------|
| MALICIOUS | 🔴 RED | Even if 35%, 48%, or 99% |
| BENIGN | 🟢 GREEN | Even if 60%, 55%, or 20% |

---

## Architecture

```
┌─────────────────┐
│   Frontend      │  Next.js 15 + React
│   (TypeScript)  │  Port 3000
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Next.js API   │  /api/scan, /api/download
│   Routes        │  Authentication, DB
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Python        │  FastAPI + Uvicorn
│   Engine        │  Port 8000
│   - ML Models   │  LightGBM, TensorFlow
│   - Sanitizers  │  PyPDF2, pikepdf
│   - Features    │  12 features extracted
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │  Neon Database
│   (Prisma)      │  Scan results, users
└─────────────────┘
```

---

## Key Features Fixed

### ✅ **Evidence-Based Verdicts**
- No longer just threshold (>50% = malicious)
- Checks for actual JavaScript, macros, suspicious patterns
- Combination of findings + ML confidence

### ✅ **Benign Files Not Sanitized**
- Only malicious files are processed
- Benign files returned unchanged
- **Fixes:** White screen bug on downloads

### ✅ **Color Matching Verdict**
- RED = MALICIOUS (even if 48% score)
- GREEN = BENIGN (even if 60% score)
- **Fixed:** Case-insensitive verdict checks

### ✅ **JavaScript Detection**
- Checks both finding IDs AND text content
- Catches "Suspicious strings: javascript"
- **Fixed:** Files with JS mentions now flagged

### ✅ **Download URLs Fixed**
- No more `/api/api/` double paths
- Proper file retrieval from storage
- Detailed error logging

---

## Running the Project

### **Development:**

1. **Start Database:**
   ```bash
   # Already running on Neon cloud
   ```

2. **Start Python Engine:**
   ```bash
   cd platform
   npm run engine:dev
   # Runs on http://localhost:8000
   ```

3. **Start Frontend:**
   ```bash
   cd platform
   npm run dev
   # Runs on http://localhost:3000
   ```

### **Production:**

Deploy to Vercel (frontend) + separate Python backend deployment.

---

## Files Structure

```
SafeDocs/
├── platform/              # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/      # Next.js API routes
│   │   │   ├── dashboard/
│   │   │   ├── scan/
│   │   │   └── scanreport/
│   │   ├── components/
│   │   └── lib/
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
├── engine/               # Python ML engine (ORGANIZED!)
│   ├── api/             # FastAPI servers
│   │   ├── api_stateless.py  # Main server (port 8000)
│   │   ├── api_server.py     # Alternative server
│   │   ├── auth.py
│   │   ├── db.py
│   │   ├── schemas.py
│   │   └── settings.py
│   │
│   ├── core/            # Core scanning logic
│   │   ├── scan_file.py      # Main scanning
│   │   ├── features_runtime.py
│   │   └── safedocs_lightgbm.py
│   │
│   ├── sanitizers/      # File sanitizers
│   │   ├── sanitize_pdf.py   # PDF (6000+ keywords)
│   │   ├── sanitize_ooxml.py
│   │   └── sanitize_rtf.py
│   │
│   ├── utils/           # Utility scripts
│   │   ├── report_utils.py
│   │   ├── predict_only.py
│   │   └── debug_model.py
│   │
│   ├── models/          # ML model files
│   ├── scripts/         # Additional scripts
│   ├── out/             # Temporary storage
│   ├── main.py          # Entry point
│   └── requirements.txt
│
└── README.md            # This file
```

---

## Common Issues & Solutions

### **1. "File missing or expired" on download**
**Cause:** Download URL has `/api/api/` or file not saved
**Fix:** ✅ Fixed - URL construction corrected

### **2. Downloaded file shows white screen**
**Cause:** Sanitizer broke benign files
**Fix:** ✅ Only sanitize malicious files now

### **3. BENIGN verdict but 60% risk - confusing**
**Cause:** Misunderstood what risk score means
**Fix:** ✅ Documentation explains difference

### **4. JavaScript file marked BENIGN**
**Cause:** Only checked finding ID, not text
**Fix:** ✅ Now checks both ID and content

### **5. Dashboard shows wrong colors**
**Cause:** Case-sensitive `verdict === "malicious"` check
**Fix:** ✅ `.toLowerCase()` used everywhere

---

## Testing

### **Test with Malicious Files:**

Use samples from:
- **MalwareBazaar:** https://bazaar.abuse.ch/browse/
- **Contagio Dump:** http://contagiodump.blogspot.com/
- **Created sample:** `test_samples/malicious_valid.pdf` (has JavaScript)

### **Test with Benign Files:**

Upload normal documents:
- Scanned PDFs
- Invoices
- Resumes
- Forms

**Expected:**
- Complex files may show 50-70% risk
- Verdict should be BENIGN
- Files download perfectly unchanged

---

## Technical Details

### **ML Model:**
- **Type:** LightGBM Gradient Boosting
- **Features:** 12 extracted features
- **Training:** 10,000+ malware samples
- **Accuracy:** ~85% on test set

### **Sanitization:**
- **PDF:** PyPDF2 + pikepdf fallback
- **OOXML:** python-docx/openpyxl
- **RTF:** Custom parser
- **Keywords:** 6000+ malware terms removed

### **Performance:**
- **Scan time:** 0.5-2 seconds per file
- **Max file size:** 100MB
- **Supported types:** PDF, DOCX, XLSX, PPTX, RTF

---

## Security Notes

1. **Files are deleted after 48 hours** (privacy)
2. **User authentication required** (no public access)
3. **Rate limiting enabled** (via Arcjet)
4. **Files isolated** (temporary storage)
5. **No execution** (static analysis only)

---

## Credits

- **ML Models:** LightGBM, TensorFlow
- **PDF Processing:** PyPDF2, pikepdf
- **Frontend:** Next.js 15, React, Framer Motion
- **Backend:** FastAPI, Prisma, PostgreSQL

---

## License

Private project - All rights reserved.
