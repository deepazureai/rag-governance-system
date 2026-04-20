# Sample Evaluation Records for Testing

This document contains actual sample evaluation records you can use to create your test JSON files locally.

## File 1: healthcare_rag_evaluations.json (75 records - HIGH QUALITY)

Each record represents one Q&A evaluation in healthcare domain. All metrics are above 80%.

```json
{
  "id": "hr-001",
  "userPrompt": "What are the symptoms of type 2 diabetes?",
  "context": "Type 2 diabetes is characterized by high blood sugar levels. Common symptoms include increased thirst, frequent urination, fatigue, and blurred vision. Risk factors include obesity, family history, and age over 45.",
  "response": "Type 2 diabetes symptoms include increased thirst, frequent urination, fatigue, blurred vision, and slow healing of cuts or bruises. If you experience these symptoms, consult a healthcare provider for proper diagnosis.",
  "retrievedDocuments": ["diabetes_guide_2024.pdf", "endocrinology_handbook.pdf"],
  "groundedness": 92.5,
  "relevance": 94.2,
  "contextPrecision": 88.7,
  "contextRecall": 91.3,
  "answerRelevancy": 89.6,
  "coherence": 93.1,
  "faithfulness": 90.8,
  "successRate": 98,
  "latency": 1200,
  "tokenEfficiency": 750,
  "errorRate": 0.5,
  "timestamp": "2024-04-20T10:30:00Z"
}
```

Continue with 74 more similar records with metrics:
- Groundedness: 85-95%
- Relevance: 85-96%
- Context Precision: 82-92%
- Context Recall: 85-94%
- Answer Relevancy: 82-94%
- Coherence: 85-95%
- Faithfulness: 82-93%
- Success Rate: 96-100%
- Latency: 800-2000ms
- Token Efficiency: 600-1000
- Error Rate: 0-2%

---

## File 2: financial_rag_evaluations.json (80 records - MODERATE QUALITY)

Each record represents financial analysis Q&A. Metrics range 75-92%.

```json
{
  "id": "fin-001",
  "userPrompt": "What is the current P/E ratio for Tech stocks?",
  "context": "As of Q1 2024, technology sector P/E ratios average 28.5, ranging from 22-35 depending on company size and profitability. Growth tech companies command higher multiples.",
  "response": "The average P/E ratio for technology stocks in Q1 2024 is approximately 28.5, with large-cap tech around 24-26 and growth-focused companies ranging 30-35. This suggests the sector trades at a premium to market average.",
  "retrievedDocuments": ["financial_report_2024.pdf", "tech_analysis_q1.pdf"],
  "groundedness": 87.3,
  "relevance": 85.1,
  "contextPrecision": 82.5,
  "contextRecall": 84.2,
  "answerRelevancy": 83.8,
  "coherence": 88.4,
  "faithfulness": 86.2,
  "successRate": 94,
  "latency": 1800,
  "tokenEfficiency": 920,
  "errorRate": 3.5,
  "timestamp": "2024-04-20T11:00:00Z"
}
```

Continue with 79 more records with metrics:
- Groundedness: 75-92%
- Relevance: 75-90%
- Context Precision: 70-88%
- Context Recall: 75-89%
- Answer Relevancy: 72-87%
- Coherence: 78-90%
- Faithfulness: 75-88%
- Success Rate: 90-97%
- Latency: 1500-3000ms
- Token Efficiency: 850-1200
- Error Rate: 2-6%

---

## File 3: customer_support_agent_evaluations.json (65 records - POOR QUALITY with Alerts)

⚠️ **THIS FILE INTENTIONALLY HAS LOW METRICS TO TRIGGER ALERTS**

Each record represents multi-agent customer support handling. Many metrics BELOW thresholds.

```json
{
  "id": "csa-001",
  "userPrompt": "Why was my order cancelled without notification?",
  "context": "Order tracking system shows order #12345 was cancelled due to payment failure on 2024-04-18. Customer should have received email notification.",
  "response": "Your order was cancelled due to a technical issue. Please contact support.",
  "retrievedDocuments": ["order_db.pdf", "payment_logs.pdf"],
  "groundedness": 62.1,
  "relevance": 68.5,
  "contextPrecision": 65.3,
  "contextRecall": 72.1,
  "answerRelevancy": 61.8,
  "coherence": 70.2,
  "faithfulness": 64.7,
  "successRate": 85,
  "latency": 4500,
  "tokenEfficiency": 2100,
  "errorRate": 12.5,
  "timestamp": "2024-04-20T12:00:00Z"
}
```

Continue with 64 more records with metrics:
- Groundedness: 58-72% (CRITICAL < 70%)
- Relevance: 65-78% (WARNING/CRITICAL)
- Context Precision: 60-72% (CRITICAL < 70%)
- Context Recall: 68-82% (MIXED)
- Answer Relevancy: 58-75% (CRITICAL/WARNING)
- Coherence: 68-80% (MIXED)
- Faithfulness: 60-75% (CRITICAL/WARNING)
- Success Rate: 80-92% (WARNING < 95%)
- Latency: 3800-5500ms (WARNING 3000-5000ms, CRITICAL > 5000ms)
- Token Efficiency: 1800-2400 (WARNING 1500-2000, CRITICAL > 2000)
- Error Rate: 8-15% (WARNING 5-10%, CRITICAL > 10%)

---

## How to Create These Files Locally

### Option 1: Manual Creation (Recommended for Learning)

1. Create folder: `/data/evaluations` on your local machine
2. Create three JSON files:
   - `healthcare_rag_evaluations.json`
   - `financial_rag_evaluations.json`
   - `customer_support_agent_evaluations.json`

3. For each file, create an array of records:

```json
[
  {
    "id": "unique-id",
    "userPrompt": "Question text",
    "context": "Retrieved context",
    "response": "System response",
    "retrievedDocuments": ["doc1", "doc2"],
    "groundedness": 85.5,
    "relevance": 88.2,
    "contextPrecision": 82.1,
    "contextRecall": 90.3,
    "answerRelevancy": 87.6,
    "coherence": 91.2,
    "faithfulness": 86.5,
    "successRate": 95,
    "latency": 1250,
    "tokenEfficiency": 850,
    "errorRate": 2,
    "timestamp": "2024-04-20T10:30:00Z"
  },
  ... 49-79 more records
]
```

### Option 2: Using Python Script

```python
import json
import random
from datetime import datetime, timedelta

def generate_records(app_type, count, base_metrics):
    records = []
    for i in range(count):
        record = {
            "id": f"{app_type}-{i+1:03d}",
            "userPrompt": f"Sample query {i+1}",
            "context": f"Sample context for query {i+1}",
            "response": f"Sample response for query {i+1}",
            "retrievedDocuments": [f"doc_{j}.pdf" for j in range(random.randint(1, 3))],
            "groundedness": base_metrics['groundedness'] + random.uniform(-5, 5),
            "relevance": base_metrics['relevance'] + random.uniform(-5, 5),
            "contextPrecision": base_metrics['contextPrecision'] + random.uniform(-5, 5),
            "contextRecall": base_metrics['contextRecall'] + random.uniform(-5, 5),
            "answerRelevancy": base_metrics['answerRelevancy'] + random.uniform(-5, 5),
            "coherence": base_metrics['coherence'] + random.uniform(-5, 5),
            "faithfulness": base_metrics['faithfulness'] + random.uniform(-5, 5),
            "successRate": base_metrics['successRate'] + random.uniform(-3, 3),
            "latency": int(base_metrics['latency'] + random.uniform(-500, 500)),
            "tokenEfficiency": int(base_metrics['tokenEfficiency'] + random.uniform(-100, 100)),
            "errorRate": max(0, base_metrics['errorRate'] + random.uniform(-1, 2)),
            "timestamp": (datetime.now() - timedelta(hours=random.randint(0, 72))).isoformat() + "Z"
        }
        records.append(record)
    return records

# Healthcare RAG - High metrics
healthcare_metrics = {
    'groundedness': 90, 'relevance': 92, 'contextPrecision': 88,
    'contextRecall': 91, 'answerRelevancy': 89, 'coherence': 92,
    'faithfulness': 90, 'successRate': 97, 'latency': 1200,
    'tokenEfficiency': 800, 'errorRate': 0.5
}

# Financial RAG - Moderate metrics
financial_metrics = {
    'groundedness': 85, 'relevance': 85, 'contextPrecision': 80,
    'contextRecall': 84, 'answerRelevancy': 82, 'coherence': 86,
    'faithfulness': 84, 'successRate': 94, 'latency': 1800,
    'tokenEfficiency': 920, 'errorRate': 3.5
}

# Customer Support Agent - Poor metrics (TRIGGERS ALERTS)
support_metrics = {
    'groundedness': 65, 'relevance': 70, 'contextPrecision': 68,
    'contextRecall': 75, 'answerRelevancy': 65, 'coherence': 72,
    'faithfulness': 67, 'successRate': 88, 'latency': 4200,
    'tokenEfficiency': 2000, 'errorRate': 10
}

# Generate and save
with open('healthcare_rag_evaluations.json', 'w') as f:
    json.dump(generate_records('hr', 75, healthcare_metrics), f, indent=2)

with open('financial_rag_evaluations.json', 'w') as f:
    json.dump(generate_records('fin', 80, financial_metrics), f, indent=2)

with open('customer_support_agent_evaluations.json', 'w') as f:
    json.dump(generate_records('csa', 65, support_metrics), f, indent=2)

print("✅ Sample datasets created successfully!")
```

---

## Expected Alert Triggers

### Healthcare RAG
- **Status**: ✅ All Green
- **Alerts**: 0
- **Action**: None needed

### Financial RAG
- **Status**: ⚠️ Yellow/Warning
- **Alerts**: 5-10 warnings
- **Action**: Monitor performance

### Customer Support Agent
- **Status**: 🔴 Red/Critical
- **Alerts**: 20-30 critical alerts
- **Expected Critical Alert Messages**:
  - "Groundedness metric 62% is CRITICAL (threshold: 70%)"
  - "Context Precision metric 65% is CRITICAL (threshold: 70%)"
  - "Answer Relevancy metric 62% is CRITICAL (threshold: 70%)"
  - "Latency 4500ms is WARNING (threshold: 3000ms)"
  - "Token Efficiency 2100 is CRITICAL (threshold: 2000)"
  - "Error Rate 12% is CRITICAL (threshold: 10%)"

---

## Testing Flow

1. Create three JSON files with above structure
2. Add to MongoDB local folder paths
3. Create applications in UI pointing to these files
4. Run batch processing
5. View dashboard - Customer Support Agent should show many red alerts
6. Check Settings > Alerts to see critical alerts
7. Configure email/webhook and verify notifications sent
8. Check Notification Logs to see delivery status
