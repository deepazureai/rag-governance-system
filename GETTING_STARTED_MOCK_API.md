# Getting Started - Mock API (30 Seconds)

## The Fastest Way to See Everything Working

### Step 1: Create .env.local
```bash
echo "NEXT_PUBLIC_USE_MOCK_API=true" > .env.local
```

### Step 2: Start the App
```bash
npm run dev
```

### Step 3: Open Browser
```
http://localhost:3000
```

That's it! Everything works with mock data.

---

## What You Can Do Now

### 1. Dashboard
- Real-time KPI metrics (all with mock data)
- Performance trends
- Quality scores

### 2. Explore Page (★ Best Demo Feature)
- **Framework Selector** at top
- Select between RAGAS or Microsoft
- Enter any query
- Click "Evaluate"
- See real-looking metrics instantly
- Each evaluation shows different metrics

### 3. App Detail Page
- View evaluation results
- See performance metrics
- Check query history
- All populated with mock data

### 4. Benchmarks
- Compare RAGAS vs Microsoft metrics
- Multi-app comparison
- Visual performance trends

### 5. Governance
- Infrastructure metrics (tokens, latency, cost)
- Performance governance rules
- All with mock data

---

## Testing the Framework Selection Feature

**This is the coolest part with mock API:**

1. Go to **Explore** page (http://localhost:3000/explore)
2. See "Select Framework" dropdown at top
3. Select **RAGAS**
4. Enter query: "How do I reset my password?"
5. Click "Evaluate"
6. See metrics like:
   - Groundedness: 94%
   - Relevance: 91%
   - Fluency: 89%
   - Safety: 99%
7. Switch to **Microsoft**
8. Evaluate same query
9. See *different* metrics:
   - Groundedness: 92%
   - Relevance: 88%
   - Fluency: 91%
   - Safety: 100%
10. Both results saved in history

---

## What Works Out of the Box

✅ All 8 main pages fully functional
✅ All dashboard charts with mock data
✅ Framework selection and switching
✅ Query evaluation with metrics
✅ Performance charts
✅ Governance metrics
✅ Alert system
✅ Real-time progress simulation
✅ Batch processing (mocked)

---

## File Structure (What's Where)

```
src/
  api/
    mock-data.ts           ← Mock framework configs & results
    mock-handler.ts        ← Mock endpoint handlers
    client.ts              ← Updated with fallback logic
  hooks/
    useEvaluation.ts       ← Updated for mock support
  components/
    evaluation/
      framework-selector.tsx ← Framework chooser UI

backend/
  src/
    frameworks/            ← Ready for real implementation
    api/routes.ts          ← Real backend endpoints
    services/              ← Real backend services
```

---

## Switching to Real Backend (When Ready)

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### Step 2: Start Backend
```bash
cd backend
npm run dev
# Backend now running on http://localhost:5000
```

### Step 3: Update Frontend
```bash
# Update .env.local
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_URL=http://localhost:5000/api/evaluations
```

### Step 4: Restart Frontend
```bash
npm run dev
```

**Done!** Frontend now uses real backend instead of mock.

---

## Environment Variables Explained

### .env.local
```bash
# Use mock API (for development without backend)
NEXT_PUBLIC_USE_MOCK_API=true

# Backend URL (when backend is running)
# Only used if NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_URL=http://localhost:5000/api/evaluations
```

---

## How Mock API Works

```
You click "Evaluate"
       ↓
API Client makes request
       ↓
Backend not running? No problem!
       ↓
Mock Handler intercepts request
       ↓
Generates realistic metrics
       ↓
Returns JSON response
       ↓
UI displays results
```

**Result:** Fully functional app without backend!

---

## Demo Walkthrough (5 minutes)

1. **Start App** (30 sec)
   ```bash
   npm run dev
   ```

2. **View Dashboard** (1 min)
   - See all metrics
   - Check performance charts
   - View quality scores

3. **Test Framework Selection** (2 min)
   - Go to Explore
   - Select RAGAS
   - Enter query, evaluate
   - See results
   - Switch to Microsoft
   - Evaluate same query
   - Compare metrics

4. **Check Other Pages** (1.5 min)
   - Click through App Catalog
   - View benchmarks
   - Check governance

---

## FAQ

**Q: Is this real data?**
A: No, it's mock data for development. Uses realistic patterns.

**Q: Can I present this to stakeholders?**
A: Yes! Mock data is realistic enough for UI/UX demos.

**Q: Does it work offline?**
A: Yes! No backend needed, entirely client-side.

**Q: How do I switch to real backend?**
A: See "Switching to Real Backend" section above.

**Q: Can I deploy with mock API?**
A: Not recommended for production. Use real backend instead.

**Q: Are the metrics random?**
A: Yes, they vary slightly each time (realistic simulation).

---

## What Each Framework Shows

### RAGAS Framework
- Groundedness: How well grounded in sources
- Relevance: How relevant to query
- Coherence: Logical consistency
- Fluency: Natural language quality
- Factuality: Accuracy of facts
- Harmfulness: Absence of harmful content

### Microsoft SDK
- All of above, plus:
- Safety: Additional safety checks
- Completeness: Response thoroughness

---

## Performance

**With Mock API:**
- Load time: <1 second
- Evaluation time: ~1.5 seconds (simulated)
- No external API calls
- Perfect for laptops, tablets, any device

---

## Next Steps

1. **Right Now:** Start with `NEXT_PUBLIC_USE_MOCK_API=true`
2. **Explore:** Walk through all pages
3. **Test:** Try framework selection on Explore page
4. **When Ready:** Follow BACKEND_SETUP_COMPLETE.md to add real backend
5. **Deploy:** Switch to real API and deploy

---

## Tips & Tricks

### Tip 1: Quick Testing
```bash
# Mock mode enabled, just start and go
npm run dev
```

### Tip 2: See the Mock Responses
- Open browser DevTools (F12)
- Go to Network tab
- Make requests
- See mock responses in detail

### Tip 3: Test Both Frameworks Quickly
1. Explore page
2. Framework dropdown
3. Select RAGAS → Evaluate
4. Change to Microsoft → Evaluate
5. See different metrics for same query

### Tip 4: Switch Modes Without Restart
- Edit .env.local
- Refresh browser
- Instantly switches between mock/real

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| App won't load | Check .env.local has `NEXT_PUBLIC_USE_MOCK_API=true` |
| Mock not working | Delete .next folder, run `npm run dev` again |
| Still seeing backend errors | Backend might be running. Either start it or set USE_MOCK_API=true |
| Metrics look fake | They are! That's the point - good enough for UI testing |

---

## Summary

✅ **Works immediately** - 30 second setup
✅ **Full functionality** - All pages work
✅ **Realistic data** - Mock metrics look real
✅ **Easy testing** - Framework selection works great
✅ **Smooth upgrade** - One .env change to use real backend
✅ **Perfect for** - Demos, UI testing, development

**Start now:** `echo "NEXT_PUBLIC_USE_MOCK_API=true" > .env.local && npm run dev`
