# Video Recording & File Transfer Guide (48-Hour Sprint)

**Goal:** Record 6-7 minute e2e demo, compress, transfer to customer by EOD day-after-tomorrow

---

## PART 1: Recording Setup (30 min before recording)

### Step 1: Prepare Windows Environment (10 min)

```bash
# Close unnecessary apps
taskkill /F /IM Slack.exe
taskkill /F /IM Outlook.exe
taskkill /F /IM Teams.exe

# Enable Focus Assist (prevent notifications)
# Settings → System → Focus Assist → On

# Close browser extensions (disable ad blockers if they slow things down)
# Disable auto-updates in background
```

### Step 2: Test Audio & Screen (5 min)

**Audio Test:**
- Plug in headset mic
- Open Settings → Sound → Input
- Verify mic level is 75-85% (not too hot)
- Speak test phrase: "This is a test of the RAG Evaluation Platform"
- Check recording level is steady

**Screen Test:**
- Set display scaling to 100% (Settings → Display)
- Resolution: 1920×1080 or 1280×720
- Brightness: 80-90% (so video doesn't look washed out)
- Close all notifications

### Step 3: Pre-Demo Verification (15 min)

**Application Check:**
```bash
# Frontend
curl http://localhost:3000
# Should load successfully

# Backend
curl http://localhost:5001/health
# Should return 200 OK

# Database
# Verify sample data is loaded and visible
```

**Pre-populate Data:**
- Load 2-3 sample raw data records
- Generate recommendations beforehand (so it loads instantly in video)
- Have approved recommendations ready
- Pre-create 1 sample template (show it in library)

---

## PART 2: Recording Best Practices

### Use OBS Studio (Free, Professional Quality)

**Download:** https://obsproject.com/download

**Basic OBS Setup:**

1. **Add Video Source**
   - Scene → Add source → Display Capture
   - Select your monitor
   - Set resolution: 1920×1080

2. **Add Audio Source**
   - Scene → Add source → Audio Input Device
   - Select your headset mic
   - Adjust audio level to -6dB (so no clipping)

3. **Record Settings**
   - File → Settings → Output
   - Recording Path: Desktop or Documents
   - Recording Format: mp4
   - Encoder: NVIDIA NVENC or Intel Quick Sync (if available, for speed)
   - Bitrate: 5000 kbps (good quality, ~1.5GB for 6 min)

4. **Start Recording**
   - Click "Start Recording"
   - Wait 2 seconds before starting narration
   - Speak clearly, use the script provided

---

### Recording Script Flow (Follow DEMO_SCRIPT_VIDEO.md)

**Key Points:**
- **Pause 2 seconds** between major sections
- **Point cursor** to elements you're discussing
- **Click slowly** - let viewers follow
- **Speak at natural pace** - not rushed
- **One take is fine** - you can re-record sections if needed

**Timeline:**
- Opening: 10 sec
- Raw Data: 45 sec
- Generate Recommendations: 90 sec
- BA Review Queue: 60 sec
- KB Chat: 45 sec
- Create Template: 90 sec
- Template Library: 30 sec
- Closing: 20 sec
- **Total: ~6 minutes**

---

### Troubleshooting During Recording

| Issue | Solution |
|-------|----------|
| Microphone noise | Check levels, move away from fan/AC |
| Slow screen response | Close background apps, restart system |
| Lag between clicks | Use OBS, not built-in recorder |
| Audio/video out of sync | Use OBS (automatically synced) |
| Need to re-do section | Stop, pause, start new recording (easy to splice in editing) |

---

## PART 3: Post-Recording Editing (30-60 min)

### Option A: Basic Editing (Minimal, Fast)

**Using Windows Photos or CapCut (Free):**

1. **Import video** from Desktop
2. **Trim silence** at beginning/end
3. **Add intro slide** (10 sec):
   - "RAG Evaluation Platform - Live Demo"
   - Company logo
4. **Add outro slide** (10 sec):
   - Contact info
   - "Questions?"
5. **Export** as mp4

### Option B: Professional Editing (Better, Takes Longer)

**Using DaVinci Resolve (Free):**

1. Import video
2. Add intro/outro title slides
3. **Add subtitles** (auto-caption):
   - Right-click video → Caption
   - Auto-generate captions
   - Manual review for accuracy
4. **Add background music** (optional, 30-40% volume):
   - YouTube Audio Library (royalty-free)
   - Choose "Calm, Professional" track
5. **Color correction** (optional):
   - Inspector → Curves
   - Slightly brighten shadows
6. **Export:**
   - Format: H.264 (mp4)
   - Quality: High
   - Bitrate: 8000 kbps

---

## PART 4: Video Compression (File Size Reduction)

**Current size:** ~1.5GB (at 5000 kbps)  
**Goal:** ~300-400MB for easy email/transfer

### Using FFmpeg (Install if needed)

```bash
# Install FFmpeg
# Windows: Download from https://ffmpeg.org/download.html
# Or: choco install ffmpeg (if using Chocolatey)

# Compress video
ffmpeg -i demo-original.mp4 -crf 28 -preset slow -vf "scale=1920:1080" demo-compressed.mp4

# Explanation:
# -crf 28: Quality (lower = better, but bigger. 28 is good balance)
# -preset slow: Better compression (takes 2-3x longer)
# -vf scale: Keep resolution

# Result: ~300-400MB, still high quality
```

### Alternative: Online Compression (If FFmpeg doesn't work)

Use: https://www.online-convert.com/
- Upload mp4
- Select quality level: "medium" or "good"
- Download compressed file

**Typical sizes:**
- Original (5000 kbps): 1.5 GB
- Compressed (CRF 28): 350 MB
- Very compressed (CRF 32): 150 MB

---

## PART 5: File Transfer to Customer

### Option 1: OneDrive (Easiest)

```bash
# If OneDrive synced to office laptop:
# 1. Save video to OneDrive folder on current laptop
# 2. Sync completes automatically
# 3. From office laptop, video is in OneDrive folder
# 4. Send OneDrive link to customer
```

### Option 2: Google Drive

```bash
# 1. Compress video to ~300MB
# 2. Upload to Google Drive
# 3. Right-click → Share → Get shareable link
# 4. Email link to customer
# Note: Large files may take 10-15 min to upload
```

### Option 3: Dropbox

```bash
# 1. Install Dropbox on current laptop
# 2. Add video to Dropbox folder
# 3. Right-click → Share → Copy link
# 4. Email link to customer
```

### Option 4: Tech Support Handoff (If on network)

```bash
# Contact IT/tech support:
# "I need to transfer a 300MB video from my Mac to office network"
# 
# They can:
# 1. Setup SMB share from your Mac
# 2. Or move file via USB/external drive
# 3. Or use corporate Sharepoint
```

### Option 5: Email (If compressed small enough)

```bash
# Compress to <100MB
ffmpeg -i demo.mp4 -crf 32 -preset ultrafast demo-small.mp4

# Attach to email
# Note: May fail if email has size limits (usually 25MB)
# Better to use cloud storage + link
```

---

## PART 6: Final Delivery Checklist

Before sending to customer:

- [ ] Video plays smoothly with no stuttering
- [ ] Audio is clear and audible (test with speakers)
- [ ] No background noise or distracting sounds
- [ ] All features demonstrated working
- [ ] Video length: 5-7 minutes
- [ ] File size: 300-500 MB (manageable)
- [ ] Intro and outro slides added
- [ ] Subtitles added (bonus, for accessibility)
- [ ] Tested on different device/player
- [ ] Backup copy saved locally

---

## PART 7: Email to Customer (Template)

**Subject:** RAG Evaluation Platform - Live Demo Video

```
Dear [Customer Name],

I've prepared a comprehensive end-to-end demonstration of the RAG 
Evaluation Platform showcasing all key workflows:

✓ Raw Data Upload & Metrics Evaluation
✓ AI-Powered Recommendation Generation
✓ BA Review & Approval Queue
✓ Knowledge Base Chat & Badging
✓ Template Creation & Library

Video Duration: 6 minutes
File Size: 350 MB

[LINK: Google Drive / OneDrive / Dropbox link]

The demo shows how the platform helps RAG teams:
1. Identify prompt improvement opportunities
2. Generate domain-specific suggestions using AI
3. Maintain quality through BA approval workflow
4. Build reusable template library
5. Capture institutional knowledge in KB

Key capabilities demonstrated:
- DeepEval metrics analysis
- LLM-powered recommendations
- Seamless BA review workflow
- Template creation wizard
- Knowledge base integration (roadmap)

If you have any questions about specific features, please let me know.

Looking forward to your feedback!

Best regards,
[Your Name]
```

---

## Timeline Recap

| When | Task | Duration |
|------|------|----------|
| **Today (T-2)** | Deploy on office laptop, verify all works | 1-2 hours |
| **Tonight (T-2)** | Prepare environment, test audio | 30 min |
| **Tomorrow (T-1)** | Record video (5-7 min actual) | 1-2 hours |
| **Tomorrow eve (T-1)** | Edit, compress, test playback | 1-2 hours |
| **Day-after (T)** | Final review, send to customer EOD | 30 min |

---

## Emergency Backup Plans

**If recording fails:**
- You have the script and deployment
- Can record just key sections and stitch together
- Can use screen recording without narration, add voiceover later

**If video is too large:**
- Compress more aggressively (CRF 32-36)
- Split into two 3-minute videos
- Send via cloud link instead of email

**If customer can't access link:**
- Upload to multiple platforms (Drive + OneDrive + Dropbox)
- Send download link as backup
- Offer to host on company server

---

## Success Criteria

✅ Video shows complete e2e workflow  
✅ All features working without errors  
✅ Audio clear and professional  
✅ File size manageable (<500MB)  
✅ Delivered by EOD day-after-tomorrow  
✅ Customer can access and watch  
✅ Demo is compelling and shows value  

You've got this. Execute the plan step-by-step and you'll have a 
professional-quality demo video ready for your customer!

