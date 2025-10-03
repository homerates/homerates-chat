(() => {
  const esc = s => String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  function tidy(text){
    let s = String(text||"").replace(/\r\n/g,"\n").trim();
    s = s.replace(/```[\s\S]*?```/g, m => m.replace(/```/g,""));
    s = s.replace(/^\s*#{1,6}\s*(.+)$/gm, (_m,t)=>"<strong>"+esc(t.trim())+"</strong>");
    s = s.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>");
    s = s.replace(/^[\-\u2022]\s+/gm, "• ");
    s = s.replace(/\n{3,}/g,"\n\n");
    return s.split(/\n{2,}/).map(block=>{
      const lines = block.split("\n");
      const lis = lines.filter(l=>/^\s*•\s+/.test(l)).map(l=>"<li>"+esc(l.replace(/^\s*•\s+/, ""))+"</li>").join("");
      if (lis) return "<ul>"+lis+"</ul>";
      return "<p>"+esc(block).replace(/\n/g,"<br/>")+"</p>";
    }).join("");
  }

  // Sidebar: projects in localStorage
  function loadProjects(){
    const nav = document.getElementById("projects");
    nav.innerHTML = "";
    const projects = JSON.parse(localStorage.getItem("hr_projects")||"{}");
    Object.keys(projects).forEach(name=>{
      const div = document.createElement("div");
      div.textContent = name;
      div.onclick = ()=> { renderThread(projects[name]); };
      nav.appendChild(div);
    });
  }
  function saveProject(name, thread){
    const projects = JSON.parse(localStorage.getItem("hr_projects")||"{}");
    projects[name] = thread;
    localStorage.setItem("hr_projects", JSON.stringify(projects));
    loadProjects();
  }

  function renderThread(threadArr){
    const thread = document.getElementById("thread");
    thread.innerHTML = "";
    (threadArr||[]).forEach(msg=> add(msg.role,msg.html,false));
  }

  function add(role, html, save=true){
    const wrap = document.createElement("div");
    wrap.className = "card";
    wrap.innerHTML = '<div class="msg '+role+'"><div class="who">'+(role==="user"?"U":"AI")+'</div><div class="bubble">'+html+'</div></div>';
    const thread = document.getElementById("thread");
    thread.appendChild(wrap);
    thread.scrollTop = thread.scrollHeight;
    if(save){
      currentThread.push({role,html});
      localStorage.setItem("hr_current", JSON.stringify(currentThread));
    }
  }

  let currentThread = JSON.parse(localStorage.getItem("hr_current")||"[]");

  function wire(){
    const form = document.getElementById("composer");
    const input = document.getElementById("query");
    const sendBtn = document.getElementById("send");

    renderThread(currentThread);
    loadProjects();

    const onSubmit = async (e)=>{
      e.preventDefault();
      const text = (input.value||"").trim();
      if(!text) return;
      input.value="";
      add("user", tidy(text));

      const ghost = document.createElement("div");
      ghost.className="card";
      ghost.innerHTML='<div class="msg assistant"><div class="who">AI</div><div class="bubble">…thinking</div></div>';
      document.getElementById("thread").appendChild(ghost);

      try{
        const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:text}]})});
        const raw=await r.text();
        let reply=""; try{ reply=(JSON.parse(raw)?.reply||"").trim(); }catch{ reply=raw; }
        ghost.remove();
        add("assistant", tidy(reply));
      }catch(err){
        ghost.remove();
        add("assistant",'<p style="color:#ef4444">Error: '+esc(err?.message||String(err))+'</p>');
      }
    };

    form.onsubmit=onSubmit;
    sendBtn.onclick=(e)=>{e.preventDefault(); form.requestSubmit();};
    input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
    input.focus();

    // new project button
    document.getElementById("newProject").onclick=()=>{
      const name=prompt("Project name?");
      if(name){
        saveProject(name,currentThread);
        currentThread=[];
        localStorage.setItem("hr_current","[]");
        document.getElementById("thread").innerHTML="";
      }
    };

    // mobile toggle
    const toggle=document.getElementById("toggleMenu");
    toggle.onclick=()=>document.getElementById("sidebar").classList.toggle("show");

    console.log("hr: composer wired v3600");
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",wire); else wire();
})();
