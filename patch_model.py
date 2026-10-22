import re

with open('model_comparison.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hardcoded text in warning box
warning_box_old = """      <div class="warning-box">
        ⚠️ <strong>Important:</strong> LSTM live-match accuracy (95.31%) cannot be directly compared
        with pre-match RF/XGB/FFNN accuracy (~50%). These are fundamentally different tasks —
        pre-match prediction uses only historical team stats, while LSTM uses real-time
        over-by-over in-match sequences where patterns are far more predictable.
      </div>"""
warning_box_new = """      <div class="warning-box">
        ⚠️ <strong>Important:</strong> LSTM live-match accuracy cannot be directly compared
        with pre-match RF/XGB/FFNN accuracy (~50%). These are fundamentally different tasks —
        pre-match prediction uses only historical team stats, while LSTM uses real-time
        over-by-over in-match sequences where patterns are far more predictable.
      </div>"""
content = content.replace(warning_box_old, warning_box_new)

# Replace insight
insight_old = """      const insight = isLive
        ? `LSTM achieved <strong>95.31% accuracy</strong> on the held-out live-match test set by learning
           over-by-over sequences. This is a fundamentally different (and easier) task than pre-match
           prediction — real-time match data contains far richer signals than historical team statistics alone.`
        : `Pre-match cricket prediction is inherently difficult. All models sit near <strong>~50% accuracy</strong>
           because cricket outcomes depend heavily on factors unavailable before the match (pitch behaviour,
           player form on the day, weather, individual brilliance). This is an honest baseline — not a flaw.
           <strong>Log Loss</strong> is a better metric here than accuracy: lower = more calibrated probabilities.`;"""

insight_new = """      // Get LSTM stats dynamically if available
      const lstmStats = isLive ? models.find(m => m.model.includes('LSTM')) : null;
      const lstmAcc = lstmStats ? lstmStats.accuracy + '%' : 'high accuracy';
      
      const insight = isLive
        ? `LSTM achieved <strong>${lstmAcc}</strong> on the held-out live-match test set by learning
           over-by-over sequences. This is a fundamentally different (and easier) task than pre-match
           prediction — real-time match data contains far richer signals than historical team statistics alone.`
        : `Pre-match cricket prediction is inherently difficult. All models sit near <strong>~50% accuracy</strong>
           because cricket outcomes depend heavily on factors unavailable before the match (pitch behaviour,
           player form on the day, weather, individual brilliance). This is an honest baseline — not a flaw.
           <strong>Log Loss</strong> is a better metric here than accuracy: lower = more calibrated probabilities.`;"""
content = content.replace(insight_old, insight_new)

# Replace training curves desc
curves_old = """            <h3 class="plot-title">LSTM Live Match — Training Curves</h3>
            <p class="plot-desc">LSTM trained on 20-step over sequences. 95.31% accuracy on held-out test set.</p>"""
curves_new = """            <h3 class="plot-title">LSTM Live Match — Training Curves</h3>
            <p class="plot-desc">LSTM trained on 20-step over sequences.</p>"""
content = content.replace(curves_old, curves_new)

# Replace matrix desc
matrix_old = """          <div class="matrix-card matrix-lstm">
            <div class="matrix-label dl-type">Deep Learning — LSTM</div>
            <h4>LSTM — Live Match (95.31% accuracy)</h4>"""
matrix_new = """          <div class="matrix-card matrix-lstm">
            <div class="matrix-label dl-type">Deep Learning — LSTM</div>
            <h4>LSTM — Live Match</h4>"""
content = content.replace(matrix_old, matrix_new)

with open('model_comparison.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied to model_comparison.html")
