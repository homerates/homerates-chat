(() => {
  const esc = s => String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  function tidy(text){
    let s = String(text||"").replace(/\r\n/g,"\n").trim();
    s = s.replace(/`[\s\S]*?`/g, m => m.replace(/`/g,""));
    s = s.replace(/^\s*#{1,6}\s*(.+)$/gm, (_m,t)=>"<strong>"+esc(t.trim())+"</strong>");
    s = s.replace(/\*\*(.+?)\*\*/g,"<strong></strong>").replace(/\*(.+?)\*/g,"<em></em>");
    s = s.replace(/^[\-\u2022]\s+/gm, "• ");
    s = s.replace(/\n{3,}/g,"\n\n");
    return s.split(/\n{2,}/).map(block=>{
      const lines = block.split("\n");
      const lis = lines.filter(l=>/^\s*•\s+/.test(l)).map(l=>"<li>"+esc(l.replace(/^\s*•\s+/, ""))+"</li>").join("");
      if (lis) return "<ul>"+lis+"</ul>";
      return "<p>"+esc(block).replace(/\n/g,"<br/>")+"</p>";
    }).join("");
  }

  function wire() {
    const form   = document.getElementById("composer");
    const input  = document.getElementById("query") || document.getElementById("input");
    const thread = document.getElementById("thread");
    const sendBtn= document.getElementById("send");
    if (!form || !input || !thread) { console.warn("hr: missing elements", {form:!!form,input:!!input,thread:!!thread}); return; }

    function add(role, html){
      const wrap = document.createElement("div");
      wrap.className = "card";
      wrap.innerHTML = '<div class="msg '+role+'"><div class="who">'+(role==="user"?"U":"AI")+'</div><div class="bubble">'+html+'</div></div>';
      thread.appendChild(wrap);
      thread.scrollTop = thread.scrollHeight;
    }

    if (form.__hr_wired) form.removeEventListener("submit", form.__hr_wired);
    if (input.__hr_key)  input.removeEventListener("keydown", input.__hr_key);

    const onSubmit = async (e)=>{
      e.preventDefault();
      const text = (input.value||"").trim();
      if (!text) return;
      input.value = "";
      add("user", tidy(text));

      const ghost = document.createElement("div");
      ghost.className = "card";
      ghost.innerHTML = '<div class="msg assistant"><div class="who">AI</div><div class="bubble">…thinking</div></div>';
      thread.appendChild(ghost); thread.scrollTop = thread.scrollHeight;

      try{
        const r = await fetch("/api/chat", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ messages:[{ role:"user", content:text }] })
        });
        const raw = await r.text();
        let reply = ""; try { reply = (JSON.parse(raw)?.reply||"").trim(); } catch { reply = raw; }
        ghost.remove();
        add("assistant", tidy(reply||raw));
      }catch(err){
        ghost.remove();
        add("assistant", '<p style="color:#ef4444">Error contacting API: '+(err?.message||String(err))+"</p>");
      }
    };

    form.addEventListener("submit", onSubmit);
    form.__hr_wired = onSubmit;

    const onKey = (e)=>{ if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } };
    input.addEventListener("keydown", onKey);
    input.__hr_key = onKey;

    if (sendBtn && !sendBtn.__hr_click) {
      sendBtn.addEventListener("click", (e)=>{ e.preventDefault(); form.requestSubmit(); });
      sendBtn.__hr_click = true;
    }

    console.log("hr: composer wired 251002-194715");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();