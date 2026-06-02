# RAG Evaluation Platform - End-to-End Demo Script (5-7 minutes)

**Target Audience:** Customer/stakeholders  
**Duration:** 5-7 minutes (tight, punchy)  
**Goal:** Show complete workflow from raw data → template creation

---

## DEMO SCRIPT (Read this verbatim for video)

### **SCENE 1: Opening (10 sec) - Platform Overview**

```
[SHOW: RAG Evaluation Platform homepage]

"Welcome to the RAG Evaluation Platform - an end-to-end solution 
for evaluating and improving your RAG system prompts.

Today I'll walk you through a complete workflow:
1. Evaluate raw prompt performance
2. Generate AI-powered recommendations
3. Approve improvements in BA Review
4. Create reusable prompt templates

Let's dive in."
```

---

### **SCENE 2: Raw Data (45 sec)**

```
[NAVIGATE TO: Raw Data tab]

"First, let's look at our raw data. Here we have user prompts and LLM 
responses from our RAG system, along with evaluation metrics:
- Answer Relevance: 72% (tells us if response answers the question)
- Retrieval Precision: 65% (tells us if we got right context)
- Context Recall: 58% (tells us if we recalled enough info)

These scores indicate room for improvement. 
Let's click on a record to see details..."

[CLICK: One of the records to open modal]

"Here's the original user prompt and the LLM response. 
Let's generate recommendations to improve this."
```

---

### **SCENE 3: Generate Recommendations (90 sec)**

```
[SHOW: Recommendation modal opened]

"In the Recommendations panel, we can see:
- The original prompt that was asked
- The LLM's response
- The metrics showing performance gaps

Now I'll click 'Generate Recommendations' to use our AI 
to suggest how to improve this prompt..."

[CLICK: Generate Recommendations button]
[WAIT: 5-10 seconds for generation]

"The platform is analyzing the metrics and using DeepEval 
to understand why performance is low.

[SHOW: Generated recommendations appear]

Great! Here are the AI-generated recommendations:
- Issue: 'Missing context boundaries in prompt'
  Suggestion: 'Add specific instructions for context limits'
  Expected Impact: '+8-12% relevance improvement'

- Issue: 'Ambiguous success criteria'
  Suggestion: 'Define exact validation requirements'
  Expected Impact: '+5-7% precision improvement'

Now let's edit these recommendations for our specific domain..."

[CLICK: In improved prompt textarea]

"I'll add domain-specific context to make this prompt 
more effective for our use case..."

[TYPE/PASTE: Better version of prompt]

"Notice we also have the option to integrate Knowledge Base 
context for even smarter recommendations - we'll explore that 
feature roadmap later.

Now let's save these improvements."

[CLICK: Save Improvements button]
[WAIT: Success message]

"Perfect! Improvements saved to our database."
```

---

### **SCENE 4: BA Review Queue (60 sec)**

```
[NAVIGATE TO: BA Review Queue tab]
[SHOW: Recommendations sub-tab]

"Our recommendations now appear in the BA Review Queue.
A Business Analyst can review, approve, or reject each improvement.

Here we can see:
- The original prompt (what was asked)
- The revised prompt (our improvement)
- Why it improves performance
- Status: Pending Review

Let me click 'Edit & Approve' to show the approval workflow..."

[CLICK: Edit & Approve button]

"In the approval flow, the BA can:
1. See side-by-side comparison
2. Add notes about the improvement
3. Approve, Reject, or Request Changes

Let me approve this recommendation..."

[CLICK: Approve button]
[WAIT: Success message]

"Excellent! This recommendation is now approved and ready 
to be turned into a reusable template."
```

---

### **SCENE 5: KB Chat & Badging (45 sec)**

```
[NAVIGATE TO: Knowledge Base tab]

"The platform also includes a Knowledge Base Chat feature.
This is where your team can have conversations with an AI 
that uses your knowledge base for context.

Let me ask a question..."

[CLICK: Chat input box]
[TYPE: "What are best practices for prompt engineering in RAG?"]
[CLICK: Send]

[WAIT: Response appears]

"The AI answered using our knowledge base as context.
If we think this response is valuable for the knowledge base, 
we can badge it for review.

Let me click the 'Badge Prompt' button..."

[CLICK: Badge Prompt button on response]

"I'll add a note about why this is valuable..."

[TYPE: "Excellent explanation of retrieval optimization"]
[CLICK: Save Badge]

"This badged response now appears in the BA Review Queue 
so it can be approved as a knowledge base entry."
```

---

### **SCENE 6: Create Template (90 sec)**

```
[NAVIGATE TO: BA Review Queue → Templates tab]

"Now let's create a reusable prompt template from our 
approved recommendations.

I'll click 'Create Template from Recommendation'..."

[CLICK: Create Template button]

"This opens the Template Builder Wizard.

Step 1: Template Details
- Name: 'RAG Question Answering Template'
- Description: 'For improving RAG response quality'
- Category: 'Question Answering'

[FILL IN: Details]
[CLICK: Next]

Step 2: Framework Setup
- Framework: CrewAI
- Role: 'RAG Prompt Engineer'
- Goal: 'Generate high-quality answers using RAG context'

[FILL IN: Details]
[CLICK: Next]

Step 3: Data Sources
- Select which approved recommendations to include
- Select which KB documents to reference

[SELECT: Relevant items]
[CLICK: Next]

Step 4: Synthesis
- Combine approved prompts with KB context
- Generate CrewAI template structure
- Define success metrics

[SHOW: Generated template]

The platform automatically generates the CrewAI template 
with structured prompts and context management.

[CLICK: Next]

Step 5: Distribution
- Private (only you can use)
- Team (share with analysts)
- Public (available to all)

Let me make this Team visible...

[SELECT: Team]
[CLICK: Create Template]

[WAIT: Success message]

Done! Our template is now created and saved to the Template Library."
```

---

### **SCENE 7: Template Library (30 sec)**

```
[NAVIGATE TO: Templates tab → Template Library]

"Here's our Template Library. All approved prompts become 
reusable templates that can be applied to new raw data.

Our new 'RAG Question Answering Template' is now available 
and can be reused across the platform.

Each template tracks:
- Creation date
- Who created it
- How many times it's been used
- Performance improvement metrics
- Associated KB documents"

[SCROLL: Show templates in library]
```

---

### **SCENE 8: Closing (20 sec)**

```
[SHOW: Dashboard overview]

"That's the complete workflow:

1. Raw Data + Metrics → Identify improvement opportunities
2. AI Recommendations → Suggest improvements using DeepEval
3. BA Review Queue → Human approval and domain validation
4. Knowledge Base → Capture institutional knowledge
5. Template Library → Reuse approved prompts

This creates a closed-loop system where:
- Each evaluation improves your prompt quality
- Approved prompts become templates
- Templates improve future RAG performance
- The system continuously learns

The RAG Evaluation Platform helps you:
✓ Understand why prompts fail
✓ Get AI-powered suggestions
✓ Maintain quality through BA review
✓ Build a library of best practices
✓ Measure improvement over time

Thank you!"

[FADE TO: Company logo or closing slide]
```

---

## **Video Recording Tips**

### **Before Recording**

1. **Clean up desktop** - Close Slack, email, notifications
2. **Turn off notifications** - Windows key → Focus Assist → On
3. **Test audio** - Use headset mic, test volume levels
4. **Set resolution** - Record at 1920×1080 (1080p)
5. **Demo data ready** - Pre-load sample data, don't upload during video

### **During Recording**

1. **Speak clearly and slowly** - Pause 2 seconds between scenes
2. **Point to elements** - Use cursor to highlight what you're talking about
3. **Add transitions** - 1-2 second pause between major features
4. **One take is fine** - You can edit out mistakes or re-record sections
5. **Avoid rapid clicking** - Slow down to let viewers follow

### **Post-Recording**

1. **Edit in OBS or CapCut** - Add intro/outro slides (10 sec each)
2. **Add subtitles** - Use auto-captions for accessibility
3. **Compress video** - Use ffmpeg to reduce file size
4. **Add background music** - Optional but improves feel (royalty-free from YouTube Audio Library)
5. **Final check** - Ensure audio is clear, no awkward pauses

---

## **Timing Breakdown**

| Scene | Duration | Content |
|-------|----------|---------|
| Opening | 10 sec | Platform intro |
| Raw Data | 45 sec | Show metrics, open modal |
| Generate Recommendations | 90 sec | Generate, edit, save |
| BA Review Queue | 60 sec | Approve recommendations |
| KB Chat & Badging | 45 sec | Ask question, badge response |
| Create Template | 90 sec | Walk through wizard (5 steps) |
| Template Library | 30 sec | Show library, highlight new template |
| Closing | 20 sec | Recap benefits |
| **Total** | **~6 minutes** | **Perfect for video demo** |

---

## **Key Messages to Emphasize**

✅ **End-to-end automation** - From raw data to templates in minutes  
✅ **AI + Human collaboration** - AI suggestions, BA approval  
✅ **Measurable improvement** - Metrics show before/after impact  
✅ **Reusable templates** - Build library of best practices  
✅ **Knowledge base integration** - Leverage institutional knowledge  
✅ **Closed-loop learning** - System improves with each iteration  

---

## **What NOT to Show**

❌ Don't debug errors  
❌ Don't show slow loading  
❌ Don't discuss technical implementation details  
❌ Don't show empty/failed states  
❌ Don't go into API documentation  

---

## **File Transfer Instructions**

After recording and editing:

```bash
# Option 1: Compress for email
ffmpeg -i demo.mp4 -crf 28 -preset slow demo-compressed.mp4

# Option 2: Upload to cloud
# - OneDrive
# - Google Drive
# - Dropbox
# Share link with customer

# Option 3: Tech support handoff
# Send to tech support team for office network transfer
# They can move to office laptop via secure channel
```

---

## **Emergency Backup Plans**

**If live demo fails:**
- Have this recording pre-made
- No excuse needed - "I prepared a full walkthrough video"

**If one feature breaks:**
- Skip that section, focus on others
- "In this version, we're highlighting the core workflows"

**If performance is slow:**
- Record a working version
- Play recording instead of live demo

You've got this!

