# 48-HOUR SPRINT: RAG Evaluation Platform Video Demo

**Objective:** Record, edit, and deliver professional e2e demo video to customer by EOD day-after-tomorrow

**Status:** ✅ READY TO EXECUTE

---

## What You Have (Delivered Today)

### 1. **Deployment Package**
📄 `DEMO_DEPLOYMENT_WINDOWS_DOCKER.md`
- Complete Docker setup for Windows office laptop
- 7 steps, ~30 minutes total
- Pre-demo verification checklist
- Troubleshooting guide

### 2. **Detailed Demo Script**
📄 `DEMO_SCRIPT_VIDEO.md`
- Word-for-word script for 6-7 minute video
- 8 scenes with exact talking points
- Timing breakdown for each section
- Recording tips and best practices
- What to show, what NOT to show

### 3. **Recording & Transfer Guide**
📄 `VIDEO_RECORDING_TRANSFER_GUIDE.md`
- OBS Studio setup (free, professional quality)
- Audio/screen testing procedures
- Video compression (1.5GB → 300MB)
- 5 file transfer options
- Emergency backup plans
- Customer email template

### 4. **UI Enhancement**
✅ Added KB Enrichment Checkbox
- "Enrich with Knowledge Base context (coming soon)"
- Shows future vision to customer
- Demonstrates strategic direction
- Builds anticipation for Phase 2

### 5. **Verified Builds**
✅ Frontend: SUCCESS
✅ Backend: SUCCESS
✅ All endpoints working

---

## Complete E2E Demo Flow (What You'll Show)

```
START (10 sec)
   ↓
[SCENE 1] Open Platform
   ↓
[SCENE 2] Show Raw Data with Metrics (45 sec)
   - User prompt visible
   - LLM response visible
   - Metrics showing: 72% relevance, 65% precision, 58% recall
   ↓
[SCENE 3] Generate Recommendations (90 sec)
   - Click "Generate Recommendations"
   - See DeepEval analysis + LLM suggestions
   - Edit improved prompt
   - Save improvements
   ↓
[SCENE 4] BA Review Queue (60 sec)
   - Approved recommendations visible
   - Show approval workflow
   - Click "Approve"
   ↓
[SCENE 5] KB Chat & Badging (45 sec)
   - Ask question in Knowledge Base
   - Get LLM response with KB context
   - Badge response for review
   ↓
[SCENE 6] Create Template (90 sec)
   - Start template wizard
   - Walk through 5 steps
   - Show CrewAI template generation
   - Create template
   ↓
[SCENE 7] Template Library (30 sec)
   - Show newly created template
   - Highlight reusability
   ↓
[SCENE 8] Closing (20 sec)
   - Recap benefits
   - Show KB checkbox (future feature)
   ↓
END (~6 minutes total)
```

---

## Your 48-Hour Timeline

### **TODAY (T-2) - 2 Hours**

**Step 1: Prepare Office Laptop** (30 min)
```bash
# 1. Install Docker Desktop (if not already installed)
#    https://www.docker.com/products/docker-desktop
#
# 2. Clone project code
#    git clone <repo-url>
#    cd rag-eval-project
#
# 3. Follow DEMO_DEPLOYMENT_WINDOWS_DOCKER.md
#    Steps 1-5 (creates docker-compose.yml, Dockerfiles, .env)
#
# 4. Build & start
#    docker-compose build
#    docker-compose up -d
```

**Step 2: Verify Everything Works** (45 min)
- [ ] Frontend loads at http://localhost:3000
- [ ] Backend responds at http://localhost:5001/health
- [ ] Database connected
- [ ] Load sample raw data
- [ ] Generate recommendations (to cache for demo)
- [ ] Verify KB is populated
- [ ] Test template creation workflow

**Step 3: Prepare Demo Data** (30 min)
- Pre-load 2-3 sample records with metrics
- Generate recommendations (so they load instantly in video)
- Pre-create template example
- Pre-badge KB responses
- Everything pre-populated = smooth recording

**Step 4: Do Final Smoke Test** (15 min)
- Walk through entire workflow once
- Note any glitches
- Fix if needed
- System is now DEMO READY

✅ **End of Today:** System deployed, verified, ready to record

---

### **TONIGHT (T-2 Eve) - 1 Hour**

**Prepare Recording Environment**
- [ ] Download OBS Studio (https://obsproject.com/download)
- [ ] Test headset microphone
- [ ] Close unnecessary applications
- [ ] Enable Windows Focus Assist (prevent notifications)
- [ ] Set display scaling to 100%
- [ ] Brightness 80-90%
- [ ] OBS audio levels tested

✅ **End of Tonight:** Environment prepped, ready to record

---

### **TOMORROW (T-1) - 3 Hours**

**Recording Session** (1-1.5 hours)
- [ ] Open OBS Studio
- [ ] Load recording settings (1920×1080, 5000 kbps)
- [ ] Start recording
- [ ] Follow DEMO_SCRIPT_VIDEO.md word-for-word
- [ ] Pause 2 seconds between sections
- [ ] Speak clearly, at natural pace
- [ ] Stop recording
- [ ] Result: ~1.5GB mp4 file on Desktop

**Editing** (30-60 min)
- [ ] Add intro slide (10 sec): "RAG Evaluation Platform Demo"
- [ ] Add outro slide (10 sec): Company info, "Questions?"
- [ ] Trim silence at beginning/end
- [ ] Add auto-captions (optional, for accessibility)
- [ ] Export as mp4
- [ ] Result: ~1.5GB file

**Compression** (30-60 min)
- [ ] Use FFmpeg:
```bash
ffmpeg -i demo-original.mp4 -crf 28 -preset slow demo-compressed.mp4
```
- [ ] Verify quality is acceptable
- [ ] Result: ~300-400MB file

**Quality Check** (15 min)
- [ ] Play on different device
- [ ] Audio clear? ✓
- [ ] Video smooth? ✓
- [ ] All features visible? ✓
- [ ] Good enough to send? ✓

✅ **End of Tomorrow:** Video recorded, edited, compressed, ready

---

### **DAY-AFTER-TOMORROW (T) - 1 Hour**

**Final Delivery** (1 hour)
- [ ] One final playback test
- [ ] Upload to cloud (Google Drive / OneDrive / Dropbox)
- [ ] Generate shareable link
- [ ] Draft email to customer (use template in VIDEO_RECORDING_TRANSFER_GUIDE.md)
- [ ] Attach link, proof-read email
- [ ] Send by 5 PM (EOD)

✅ **End of Day-After-Tomorrow:** DELIVERED TO CUSTOMER

---

## Key Success Factors

### ✅ Pre-Recording Wins
- **Pre-load all data** → No upload delay in video
- **Generate recommendations beforehand** → Instant loading (they're cached)
- **Pre-populate KB** → Smooth chat experience
- **Pre-approve recommendations** → Instant queue update
- **All features tested** → No surprises during recording

### ✅ Recording Excellence
- **Use OBS Studio** (not built-in recorder) → Better quality, easier editing
- **Follow script exactly** → Professional delivery
- **Speak slowly** → Viewers can follow
- **Pause between sections** → Viewers can absorb
- **One take is fine** → You can re-record sections

### ✅ File Management
- **Compress aggressively** (CRF 28) → 1.5GB → 300MB
- **Test playback** → Ensure quality
- **Use cloud link** → Easier than email
- **Have backup copies** → Safety net

### ✅ Customer Delivery
- **Professional email** → Shows care
- **Multiple links** → If one fails, others work
- **Clear call-to-action** → "Please let me know questions"
- **Day-after-tomorrow EOD** → Meets deadline exactly

---

## What Will Impress Customer

When customer watches your video, they'll see:

✅ **Complete workflow** - Raw data → Templates in one flow  
✅ **AI-powered** - DeepEval metrics + LLM recommendations  
✅ **Human-in-loop** - BA review and approval workflow  
✅ **Knowledge base integration** - Semantic chat + badging  
✅ **Reusable outputs** - Templates for future use  
✅ **Professional UX** - Smooth, polished interface  
✅ **Future vision** - KB enrichment checkbox shows roadmap  

---

## Files You Need to Reference

1. **DEMO_DEPLOYMENT_WINDOWS_DOCKER.md** - Deploy on office laptop
2. **DEMO_SCRIPT_VIDEO.md** - Read while recording
3. **VIDEO_RECORDING_TRANSFER_GUIDE.md** - Recording & transfer steps

---

## Quick Checklist (Print This)

```
DAY 1 (TODAY):
☐ Deploy on office laptop (docker-compose up -d)
☐ Verify all endpoints work
☐ Load sample data
☐ Pre-generate recommendations
☐ Test entire workflow
☐ Close browser tabs, clean desktop

DAY 1 NIGHT:
☐ Download OBS Studio
☐ Test microphone
☐ Enable Focus Assist
☐ Set resolution to 1920×1080

DAY 2 (TOMORROW):
☐ Open OBS Studio
☐ Record following DEMO_SCRIPT_VIDEO.md (6-7 min)
☐ Edit (add intro/outro)
☐ Compress with FFmpeg (1.5GB → 300MB)
☐ Test playback

DAY 3 (DAY-AFTER-TOMORROW):
☐ Upload to Google Drive / OneDrive / Dropbox
☐ Create shareable link
☐ Draft email using template
☐ Send to customer by 5 PM EOD
```

---

## You've Got This

This is a **pragmatic, working demo** - not perfection. It shows:
- Real workflows
- Real data
- Real results
- Real value to customer

The customer doesn't need perfect lighting or Hollywood production. They need to see your platform works, solves their problem, and is ready for deployment.

**Timeline is tight but achievable.** Follow the plan step-by-step, and you'll deliver a professional-quality demo on time.

---

## Final Motivational Note

You're building an **innovative RAG evaluation platform** with AI recommendations, BA review workflows, and template creation. This demo will show that vision clearly.

The customer will see:
- Strategic thinking (KB integration shown)
- Technical execution (e2e workflow)
- Product maturity (template library)
- Future roadmap (KB enrichment checkbox)

You're 48 hours away from making a powerful impression.

**Let's do this! 🚀**

