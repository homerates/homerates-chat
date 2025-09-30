// Version: hr-chat-external-js-v2
(function init() {
  try {
    // Wait until DOM is ready (double safety in case defer is ignored)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  } catch (e) {
    showErr(e);
  }

  function start() {
    try {
      const messagesEl = byId('messages');
      const innerEl    = byId('messagesInner');
      const ta         = byId('composerInput');
      const sendBtn    = byId('sendBtn');
      const jumpBtn    = byId('jumpBtn');
      const newChatBtn = byId('newChatBtn');

      let atBottom = true;
      let messages = [
        { role: 'assistant', content: 'Welcome to HomeRates.ai — ask anything about buying, refinancing, or strategy. I’ll keep it plain and useful.' }
      ];

      // Replace static fallback content with live-rendered content
      render();

      // Scroll / jump
      messagesEl.addEventListener('scroll', () => {
        const tol = 24;
        atBottom = (messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight) < tol;
        jumpBtn.classList.toggle('show', !atBottom);
      });
      jumpBtn.addEventListener('click', () => scroll(true));

      // Composer
      ta.addEventListener('input', autosize);
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }});
      sendBtn.addEventListener('click', handleSend);
      newChatBtn.addEventListener('click', () => { messages = [messages[0]]; render(); ta.focus(); });

      function el(tag, cls, text){ const n=document.createElement(tag); if(cls) n.className=cls; if(text!=null) n.textContent=text; return n; }
      function render(){
        innerEl.innerHTML = '';
        for(const m of messages){
          const row=el('div','msgRow');
          const a=el('div','avatar '+(m.role==='assistant'?'avatar--assistant':'avatar--user'));
          const b=el('div','bubble '+(m.role==='assistant'?'bubble--assistant':'bubble--user'));
          b.textContent = m.content;
          row.append(a,b);
          innerEl.appendChild(row);
        }
        if (atBottom) scroll(false);
      }
      function scroll(s=true){ messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: s ? 'smooth' : 'auto' }); }
      function autosize(){
        ta.style.height='auto';
        const line=24, max=line*6+12;
        ta.style.height=Math.min(ta.scrollHeight,max)+'px';
        sendBtn.classList.toggle('composer__send--ready', !!ta.value.trim());
      }

      async function handleSend(){
        const text = ta.value.trim();
        if (!text) return;
        ta.value = ''; autosize();
        sendBtn.disabled = true;
        sendBtn.classList.remove('composer__send--ready');

        messages.push({ role:'user', content:text }); render();
        const ph = { role:'assistant', content:'' }; messages.push(ph); render();

        try {
          const reply = await callApi(text);
          await typeInto(ph, reply ?? localReply(text));
        } catch {
          await typeInto(ph, localReply(text));
        } finally {
          sendBtn.disabled = false;
          scroll(true);
        }
      }

      function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }
      async function typeInto(target, text){
        target.content = '';
        for(let i=0;i<=text.length;i++){
          target.content = text.slice(0,i);
          render();
          await delay(5);
        }
      }

      async function callApi(text){
        try{
          const r = await fetch('/api/chat', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ message: text })
          });
          if(!r.ok) return null;
          const raw = await r.text();
          try { const j = JSON.parse(raw); return j && j.reply ? j.reply : null; }
          catch { return null; }
        } catch { return null; }
      }

      // Local topic-aware fallback (used if API fails)
      function localReply(userText){
        const t=userText.toLowerCase();
        const pick=(arr,seed)=>{ const h=Math.max(1,hash(seed)); return arr[h%arr.length]; };
        function hash(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0; } return Math.abs(h); }

        if (/(^|\s)2\/1(\s|$)|buy\s*down|rate buydown/.test(t)) return pick([
          "A 2/1 buydown lowers the payment for year 1 and 2 (≈2% then ≈1% off the note rate) and then it reverts to the full rate. It targets early cash flow, not the home’s basis. If you give me price, down payment, credit score, and a rough tax/insurance, I’ll show the month-by-month impact vs. no buydown.",
          "Think of a 2/1 buydown as prepaying interest to make years 1–2 cheaper, then normal after. Helpful if income is ramping or you plan to refinance. Share target price, down %, and horizon; I’ll chart payment paths side-by-side.",
          "2/1 = payment relief now, full rate later. It doesn’t reduce what you owe, just when you feel it. Want me to compare 2/1 vs no buydown with your numbers?",
        ], userText);

        if (/seller credit|concession|price cut|price reduction/.test(t)) return pick([
          "Seller credit reduces your cash to close or can buy points; price cut reduces the loan amount. If payment relief is the goal, credits toward points (or a buydown) usually move the needle more near-term. Give me price, down %, credit score, and I’ll show both paths.",
          "Price cut shrinks principal forever; seller credit can be aimed at closing costs or points to drop the rate now. If you plan to keep the loan a long time, price cut can win; shorter horizon often favors credit→points. Want a break-even on your scenario?",
        ], userText);

        if (/\brate(s)?\b|apr|interest/.test(t)) return pick([
          "Rates move daily and by profile. To quote tightly I’d need: price, down %, credit score, property type/occupancy, and zip. If you drop those, I’ll return a clean estimate with APR and cash-to-close.",
          "Ballpark is doable, but precise pricing needs profile details (credit, LTV, occupancy, points vs zero-cost). Share those and I’ll outline options (par rate, buy a point, zero-cost) with payments.",
        ], userText);

        if (/refi|refinance/.test(t)) return pick([
          "Refi math hinges on your current rate, balance, and closing costs. If you share balance, current rate, credit score, and goal (payment drop, cash-out, term change), I’ll run a break-even and show options.",
          "We can test refi vs stay-put by comparing monthly savings against costs. Give me loan balance, current rate, and your credit tier; I’ll return a clear yes/no with payback months.",
        ], userText);

        if (/jumbo/.test(t)) return pick([
          "Jumbo rules vary by investor. Credit, reserves, and LTV drive it. If you share price, down %, credit score, and income type, I’ll check eligibility and estimated terms.",
          "Jumbo = stricter DTI and reserves. With your price/down %, credit tier, and debts, I can sketch whether it clears and what the payment looks like.",
        ], userText);

        if (/\bfico\b|credit score|credit report/.test(t)) return pick([
          "Rate tiers often step at 740/760/780+. If you’re close to a tier, one tweak can move pricing. Share your approximate score and I’ll show the delta.",
          "Score impacts both rate and MI. If you give me score range (e.g., 720–740) and down %, I’ll outline the pricing band you’re in and what moves it.",
        ], userText);

        if (/\bdti\b|debt[- ]?to[- ]?income/.test(t)) return pick([
          "DTI is (total monthly debts + new housing) ÷ gross income. If you list your monthly debts, income, and target payment, I’ll check if it fits and by how much.",
          "Give me monthly income and debts (loans/cc/auto), and I’ll calculate a safe housing payment and whether it clears common DTI caps.",
        ], userText);

        if (/closing costs|points|discount points|origination/.test(t)) return pick([
          "Closing costs = lender + third-party + prepaids. Points are optional to lower rate. If you prefer zero-points or zero-cost, say the word and I’ll price it that way.",
          "We can trade points for rate: pay more today to save monthly. Tell me horizon (how long you’ll keep the loan) and I’ll show the break-even for 0, 1, or 2 points.",
        ], userText);

        if (/pre[- ]?approval|preapproval/.test(t)) return pick([
          "Pre-approval = docs + credit pull + automated underwriting. If you share income type (W-2/1099), assets, and target price, I’ll outline the doc list and timeline.",
          "Happy to set you up: basic app, credit check, income/asset docs → letter. Tell me occupancy (primary/second/investment) and timing and I’ll map next steps.",
        ], userText);

        if (/down ?payment|ltv|loan[- ]to[- ]value/.test(t)) return pick([
          "Down payment changes both payment and MI/eligibility. If you give me price and down %, I’ll show the payment and how much MI (if any) appears.",
          "We can test 5% vs 10% vs 20% down and see payment/MI trade-offs. Drop price and down %, I’ll chart the difference.",
        ], userText);

        if (/tax(es)?|insurance|pmi|mi|hoa/.test(t)) return pick([
          "Taxes, insurance, and (if <20% down) MI can be a third of the payment. If you share zip, price, and down %, I’ll estimate escrow and total PITI.",
          "Let’s include everything: principal+interest+taxes+insurance(+HOA/+MI). Give me zip and price; I’ll add realistic taxes/insurance so there are no surprises.",
        ], userText);

        const variants=[
          `Got it. Want me to run numbers? Send: price, down %, credit score range, zip (for taxes), and HOA if any. I’ll reply with payment, cash-to-close, and options.`,
          `I can model this. Share price, down %, score band, and time horizon. If you’re comparing two options, name them and I’ll show the break-even.`,
          `Heard. Give me price, down %, score, and whether it’s primary/second/investment. I’ll return a clean estimate with payment and cash-to-close.`,
        ];
        const preface = userText.length<=200 ? `You asked: “${userText}”\n\n` : '';
        return preface + pick(variants, userText);
      }

      // utils
      function byId(id){
        const el = document.getElementById(id);
        if (!el) throw new Error(`Missing element: #${id}`);
        return el;
      }

    } catch (e) {
      showErr(e);
    }
  }

  function showErr(e){
    try {
      const box = document.getElementById('err');
      if (box) {
        box.classList.add('show');
        if (e && e.message) box.innerHTML += `<div style="margin-top:6px;">${e.message}</div>`;
      }
      // Also log to console for quick copy/paste
      console.error('Init error:', e);
    } catch (_) {}
  }
})();
