const $ = id => document.getElementById(id);
const stateKey = "smartstudy_v4";
let state = JSON.parse(localStorage.getItem(stateKey) || "null") || {
  user:null, subjects:[], completed:{}, sessions:0, focusSeconds:0,
  focusRunning:false, focusLast:0, materials:[], plan:[]
};
function save(){
  localStorage.setItem(stateKey, JSON.stringify(state));
}


// Reliable Fisher-Yates shuffle used by the quiz generator.
function shuffle(items){
  const a=Array.isArray(items)?items.slice():[];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

function showPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
  window.scrollTo(0,0);
}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.querySelectorAll("[data-page-jump]").forEach(b=>b.onclick=()=>showPage(b.dataset.pageJump));

function setupAuth(){
  document.querySelectorAll(".auth-tab").forEach(t => {
    t.addEventListener("click", () => {
      switchAuth(t.dataset.auth);
    });
  });

  document.querySelectorAll("[data-switch]").forEach(b => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuth(b.dataset.switch);
    });
  });

  const loginBtn = $("loginBtn");
  const registerBtn = $("registerBtn");

  if(loginBtn){
    loginBtn.type = "button";
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      login();
    });
  }

  if(registerBtn){
    registerBtn.type = "button";
    registerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      register();
    });
  }
}
function switchAuth(which){
  $("loginForm").classList.toggle("hidden",which!=="login");
  $("registerForm").classList.toggle("hidden",which!=="register");
  document.querySelectorAll(".auth-tab").forEach(t=>t.classList.toggle("active",t.dataset.auth===which));
}
function login(){
  const email=$("loginEmail").value.trim().toLowerCase(), pass=$("loginPassword").value;
  if(!email||!pass){$("loginMsg").textContent="Enter your email and password.";return;}
  const users=JSON.parse(localStorage.getItem("smartstudy_users")||"{}");
  if(!users[email]||users[email].password!==pass){$("loginMsg").textContent="Incorrect email or password.";return;}
  state.user=users[email];
localStorage.setItem("smartstudy_logged_in", "true");
save();
openApp();
}
function register(){
  const name=$("regName").value.trim(),email=$("regEmail").value.trim().toLowerCase(),p=$("regPassword").value,c=$("regConfirm").value;
  if(!name||!email||!p||!c){$("registerMsg").textContent="Please fill all fields.";return;}
  if(p.length<6){$("registerMsg").textContent="Password must contain at least 6 characters.";return;}
  if(p!==c){$("registerMsg").textContent="Passwords do not match.";return;}
  const users=JSON.parse(localStorage.getItem("smartstudy_users")||"{}");
  if(users[email]){ $("registerMsg").textContent="An account with this email already exists.";return; }
  users[email]={name,email,password:p}; localStorage.setItem("smartstudy_users",JSON.stringify(users));
  state.user=users[email];
localStorage.setItem("smartstudy_logged_in","true");
save();
openApp();
}
function openApp(){
  $("authScreen").classList.add("hidden"); $("app").classList.remove("hidden");
  const n=state.user?.name||"Student";
  $("profileName").textContent=n; $("topName").textContent=n; $("helloName").textContent=n.split(" ")[0];
  $("avatar").textContent=n[0].toUpperCase(); $("settingsName").value=n; $("settingsEmail").value=state.user?.email||"";
  renderAll();
}
function logout(){
  state.user=null;
  save();

  $("app").classList.add("hidden");
  $("authScreen").classList.remove("hidden");

  switchAuth("login");
}
$("logoutBtn").addEventListener("click", logout);
function addSubject(){
  const name=$("subjectName").value.trim();
  const topics=$("subjectTopics").value.split(",").map(x=>x.trim()).filter(Boolean);
  const difficulty=$("subjectDifficulty").value, priority=$("subjectPriority")?.value||"Medium", exam=$("subjectExam").value;
  if(!name||!topics.length){$("subjectMsg").textContent="Enter a subject and at least one topic.";return;}
  state.subjects.push({id:Date.now(),name,topics,difficulty,priority,exam}); save();
  $("subjectModal").classList.add("hidden");
  ["subjectName","subjectTopics","subjectExam"].forEach(id=>$(id).value=""); renderAll();
}
$("addSubjectBtn").onclick=()=>{$("subjectModal").classList.remove("hidden");$("subjectMsg").textContent=""};
$("closeModal").onclick=()=>$("subjectModal").classList.add("hidden"); $("saveSubject").onclick=addSubject;
function toggleTopic(sid,topic){const k=sid+"::"+topic;state.completed[k]=!state.completed[k];save();renderAll();}
function deleteSubject(id){state.subjects=state.subjects.filter(s=>s.id!==id);state.materials=state.materials.filter(m=>m.subjectId!==id);save();renderAll();}

function progressData(){
  let total=0,done=0;
  state.subjects.forEach(s=>s.topics.forEach(t=>{total++;if(state.completed[s.id+"::"+t])done++;}));
  return {total,done,pct:total?Math.round(done/total*100):0};
}
function renderSubjects(){
  $("subjectBadge").textContent=state.subjects.length;
  $("subjectCards").innerHTML=state.subjects.length ? state.subjects.map(s=>`
    <div class="subject-card">
      <span class="tag">${esc(s.difficulty)}</span><h3>${esc(s.name)}</h3>
      <small class="muted">${s.topics.length} topics · Priority ${esc(s.priority||"Medium")}${s.exam?` · Exam ${esc(s.exam)}`:""}</small>
      <ul>${s.topics.map(t=>{const done=!!state.completed[s.id+"::"+t];return `<li><label style="display:flex;gap:7px;align-items:center;margin:0;color:${done?"#15d0a1":"#8497b3"}"><input type="checkbox" ${done?"checked":""} onchange="toggleTopic(${s.id},'${esc(t).replace(/'/g,"\\'")}')" style="width:auto">${esc(t)}</label></li>`}).join("")}</ul>
      <button class="delete" onclick="deleteSubject(${s.id})">Remove subject</button>
    </div>`).join("") : `<div class="empty" style="grid-column:1/-1">No subjects yet. Add your first subject to start planning.</div>`;
  const options='<option value="">Choose subject</option>'+state.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");
  $("focusSubject").innerHTML=options;
  $("materialSubject").innerHTML=options;
  $("quizSubject").innerHTML=options;
}

function renderDashboard(){
  const p=progressData();
  $("dashSubjects").textContent=state.subjects.length; $("dashTopics").textContent=p.total; $("dashCompletion").textContent=p.pct+"%";
  $("dashCompletedText").textContent=p.done+" topics completed"; $("dashHours").textContent=(state.sessions*0.75).toFixed(1)+" hrs";
  $("dashStreak").textContent=(state.sessions?Math.min(state.sessions,30):0)+" Days"; $("streakText").textContent=(state.sessions?Math.min(state.sessions,30):0)+" Day";
  $("masteries").innerHTML=state.subjects.length?state.subjects.map(s=>{let d=s.topics.filter(t=>state.completed[s.id+"::"+t]).length,p=s.topics.length?Math.round(d/s.topics.length*100):0;return `<div class="mastery"><div class="mastery-head"><span>${esc(s.name)}</span><b>${p}%</b></div><div class="bar"><i style="width:${p}%"></i></div></div>`}).join(""):`<div class="empty">Add subjects to see mastery.</div>`;
  $("todayPlan").innerHTML=state.plan.length?state.plan.slice(0,8).map(x=>`<div class="plan-row"><div class="time">${x.time}</div><div class="task"><strong>${esc(x.topic)}</strong><small>${esc(x.subject)} · ${x.duration} min</small></div></div>`).join(""):`<div class="empty">No plan yet. Open AI Schedule and generate one.</div>`;
}

function timeFor(i,pref,session=45,breakMin=10){
  const base={Morning:8,Afternoon:13,Evening:18,Flexible:10}[pref]||10;
  const total=base*60+i*(session+breakMin);
  return String(Math.floor(total/60)%24).padStart(2,"0")+":"+String(total%60).padStart(2,"0");
}
function daysUntil(dateStr){
  if(!dateStr)return 999;
  const d=new Date(dateStr+"T23:59:59");
  if(Number.isNaN(d.getTime()))return 999;
  return Math.ceil((d-Date.now())/86400000);
}
function difficultyWeight(value){
  return ({Hard:3,Medium:2,Easy:1}[value]||2);
}
function priorityWeight(value){
  return ({High:3,Medium:2,Low:1}[value]||2);
}
function taskUrgency(examDate){
  const d=daysUntil(examDate);
  if(d<=2)return 4;
  if(d<=7)return 3;
  if(d<=14)return 2;
  return 1;
}
function formatExamCountdown(dateStr){
  if(!dateStr)return "No target exam date";
  const d=daysUntil(dateStr);
  if(d<0)return "Exam date passed";
  if(d===0)return "Exam is today";
  return `${d} day${d===1?"":"s"} until exam`;
}
function generateSchedule(){
  if(!state.subjects.length){
    alert("Add at least one subject first.");
    return;
  }

  const msg=$("scheduleInputMsg");
  if(msg)msg.textContent="";

  const hours=Number($("studyHours").value);
  const session=Number($("sessionDuration").value);
  const breakMin=Number($("breakDuration").value);
  const pref=$("preferredTime").value;
  const targetExam=$("examDate").value;

  if(!Number.isFinite(hours)||hours<1||hours>12){
    if(msg)msg.textContent="Study hours must be between 1 and 12.";
    return;
  }
  if(!Number.isFinite(session)||session<15||session>180){
    if(msg)msg.textContent="Session duration must be between 15 and 180 minutes.";
    return;
  }
  if(!Number.isFinite(breakMin)||breakMin<0||breakMin>60){
    if(msg)msg.textContent="Break duration must be between 0 and 60 minutes.";
    return;
  }

  // Build one task for every unfinished topic.
  const tasks=[];
  state.subjects.forEach(s=>{
    const subjectExam=s.exam||targetExam;
    s.topics.forEach((topic,index)=>{
      const key=s.id+"::"+topic;
      if(state.completed[key])return;

      const score=
        difficultyWeight(s.difficulty)*2 +
        priorityWeight(s.priority||"Medium")*2 +
        taskUrgency(subjectExam) +
        (subjectExam&&targetExam&&subjectExam===targetExam?1:0);

      tasks.push({
        id:key,
        subjectId:s.id,
        subject:s.name,
        topic,
        topicIndex:index,
        exam:subjectExam,
        difficulty:s.difficulty,
        priority:s.priority||"Medium",
        score
      });
    });
  });

  if(!tasks.length){
    state.plan=[];
    save();
    $("scheduleMeta").textContent="All saved topics are completed.";
    $("scheduleInsights").classList.add("hidden");
    $("scheduleOutput").innerHTML='<div class="empty">All current topics are completed. Add new topics or uncheck a topic in My Subjects to create another plan.</div>';
    renderDashboard();
    return;
  }

  // Highest-need topics are considered first. A small subject balancing bonus
  // prevents the same subject from occupying every block.
  tasks.sort((a,b)=>b.score-a.score || a.topicIndex-b.topicIndex);

  const totalMinutes=Math.round(hours*60);
  let remaining=totalMinutes;
  const slots=[];
  const usedBySubject={};

  while(remaining>=15 && tasks.length && slots.length<100){
    let bestIndex=0;
    let bestValue=-Infinity;

    tasks.forEach((t,i)=>{
      const used=usedBySubject[t.subjectId]||0;
      const balancePenalty=Math.min(used*0.45,3);
      const value=t.score-balancePenalty;
      if(value>bestValue){
        bestValue=value;
        bestIndex=i;
      }
    });

    const task=tasks.splice(bestIndex,1)[0];
    const duration=Math.min(session,remaining);
    slots.push({
      subject:task.subject,
      topic:task.topic,
      duration,
      time:timeFor(slots.length,pref,session,breakMin),
      exam:task.exam,
      difficulty:task.difficulty,
      priority:task.priority
    });
    usedBySubject[task.subjectId]=(usedBySubject[task.subjectId]||0)+1;
    remaining-=duration;
    if(remaining>0)remaining=Math.max(0,remaining-breakMin);
  }

  state.plan=slots;
  save();

  const subjectCount=new Set(slots.map(x=>x.subject)).size;
  const examForPlan=targetExam || slots.find(x=>x.exam)?.exam || "";
  $("scheduleMeta").textContent=
    `${hours} hours/day · ${slots.length} focused blocks · ${subjectCount} subject${subjectCount===1?"":"s"} · ${pref}`;

  const insight=$("scheduleInsights");
  insight.classList.remove("hidden");
  insight.innerHTML=`
    <div><b>${slots.length}</b><span>Study blocks</span></div>
    <div><b>${subjectCount}</b><span>Subjects covered</span></div>
    <div><b>${formatExamCountdown(examForPlan)}</b><span>Exam timeline</span></div>
  `;

  $("scheduleOutput").innerHTML=slots.map((x,i)=>`
    <div class="schedule-block personalized-block">
      <div class="schedule-main">
        <strong>${i+1}. ${esc(x.time)} · ${esc(x.subject)}</strong>
        <span class="priority-chip ${String(x.priority).toLowerCase()}">${esc(x.priority)} priority</span>
      </div>
      <p>${esc(x.topic)} · ${x.duration} minutes focused study${i<slots.length-1&&breakMin>0?" + "+breakMin+" min break":""}</p>
      <small>${esc(x.difficulty)} difficulty${x.exam?" · Exam "+esc(x.exam):""}</small>
    </div>
  `).join("") + (tasks.length ? `<div class="schedule-more">Remaining ${tasks.length} unfinished topic${tasks.length===1?"":"s"} will be scheduled on the next planning day.</div>` : "");

  renderDashboard();
}
$("generateScheduleBtn").onclick=generateSchedule;

/* =========================
   REAL AI ASSISTANT
   ========================= */
let assistantHistory=[];
let assistantBusy=false;

function assistantStorageKey(){
  return "smartstudy_ai_chat_" + ((state && state.user && state.user.email) ? state.user.email.toLowerCase() : "guest");
}

function loadAssistantHistory(){
  try{
    const raw=localStorage.getItem(assistantStorageKey());
    const parsed=raw?JSON.parse(raw):[];
    assistantHistory=Array.isArray(parsed)?parsed.filter(m=>m&&typeof m.role==="string"&&typeof m.content==="string").slice(-24):[];
  }catch(e){assistantHistory=[];}
  renderAssistantHistory();
}

function saveAssistantHistory(){
  try{localStorage.setItem(assistantStorageKey(),JSON.stringify(assistantHistory.slice(-24)));}catch(e){}
}

function setAssistantStatus(text,mode="online"){
  const label=$("assistantStatus"),dot=$("assistantStatusDot");
  if(label)label.textContent=text;
  if(dot)dot.className="status-dot"+(mode==="busy"?" busy":mode==="offline"?" offline":"");
}

function formatAIText(text){
  let x=esc(String(text||""));
  x=x.replace(/```([\s\S]*?)```/g,(m,code)=>`<pre><code>${code.trim()}</code></pre>`);
  x=x.replace(/`([^`]+)`/g,"<code>$1</code>");
  x=x.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");
  x=x.replace(/^###\s(.+)$/gm,"<strong>$1</strong>");
  x=x.replace(/^##\s(.+)$/gm,"<strong>$1</strong>");
  x=x.replace(/^#\s(.+)$/gm,"<strong>$1</strong>");
  x=x.replace(/\n/g,"<br>");
  return x;
}

function renderAssistantHistory(){
  const box=$("chatMessages"); if(!box)return;
  if(!assistantHistory.length){
    box.innerHTML='<div class="chat ai"><b>SmartStudy AI</b><p>Hi! I’m your AI study assistant. Ask me anything about your studies, concepts, revision, exams, or study planning.</p></div>';
  }else{
    box.innerHTML=assistantHistory.map(m=>`<div class="chat ${m.role==="user"?"user":"ai"}"><b>${m.role==="user"?"You":"SmartStudy AI"}</b><p>${m.role==="user"?esc(m.content):formatAIText(m.content)}</p></div>`).join("");
  }
  box.scrollTop=box.scrollHeight;
}

function addChat(text,user,html=false){
  const box=$("chatMessages"); if(!box)return;
  box.insertAdjacentHTML("beforeend",`<div class="chat ${user?"user":"ai"}"><b>${user?"You":"SmartStudy AI"}</b><p>${html?text:esc(text)}</p></div>`);
  box.scrollTop=box.scrollHeight;
}

function showTyping(){
  const box=$("chatMessages"); if(!box)return;
  if($("aiTyping"))return;
  box.insertAdjacentHTML("beforeend",'<div class="chat ai typing" id="aiTyping"><b>SmartStudy AI</b><p><i></i><i></i><i></i></p></div>');
  box.scrollTop=box.scrollHeight;
}
function hideTyping(){const el=$("aiTyping");if(el)el.remove();}

function getStudyContext(){
  const subjects=(state.subjects||[]).map(s=>({subject:s.name,topics:s.topics||[]}));
  const completed=Object.entries(state.completed||{}).filter(([,v])=>v).map(([k])=>k);
  return {subjects,completedTopics:completed.slice(0,100)};
}

// Offline study-assistant fallback for project demos when no API key is configured.
function localAssistantFallback(q){
  const x=q.toLowerCase().trim();
  if(/osi/.test(x)) return `## OSI Model

The OSI (Open Systems Interconnection) model divides network communication into 7 layers:

1. **Physical** – raw bits and the physical medium.
2. **Data Link** – frames, MAC addressing and local error detection.
3. **Network** – logical addressing and routing, such as IP.
4. **Transport** – end-to-end delivery; TCP and UDP work here.
5. **Session** – manages communication sessions.
6. **Presentation** – translation, formatting, compression and encryption concepts.
7. **Application** – network services used by applications, such as HTTP and DNS.

### Memory trick
**Please Do Not Throw Sausage Pizza Away** = Physical, Data Link, Network, Transport, Session, Presentation, Application.

### Exam point
For a 5-mark answer, write the definition, list the 7 layers in order, and give one main function of each layer.`;
  if(/multiplex|tdm|fdm|wdm/.test(x)) return `## Multiplexing

Multiplexing allows multiple signals to share one communication medium. A **multiplexer (MUX)** combines signals at the sender side, while a **demultiplexer (DEMUX)** separates them at the receiver side.

### Main types
- **FDM:** separates signals using different frequency bands.
- **TDM:** separates signals using different time slots.
- **WDM:** uses different wavelengths of light in optical fiber.

### Memory trick
**FDM = Frequency, TDM = Time, WDM = Wavelength.**`;
  if(/search(ing)? algorithm|binary search|linear search/.test(x)) return `## Searching Algorithms

Searching means finding a required element in a collection of data.

### Linear Search
Checks elements one by one. It works on sorted or unsorted data. Worst-case time complexity: **O(n)**.

### Binary Search
Works on **sorted** data. It checks the middle element and repeatedly removes half of the remaining search range. Time complexity: **O(log n)**.

### Easy comparison
Linear Search = one by one.
Binary Search = half, half, half.`;
  if(/sorting|bubble sort|merge sort|quick sort|insertion sort/.test(x)) return `## Sorting Algorithms

Sorting arranges data in a chosen order.

- **Bubble Sort:** compares adjacent elements; basic version is O(n²).
- **Selection Sort:** repeatedly selects the smallest remaining element.
- **Insertion Sort:** inserts each new element into the sorted portion.
- **Merge Sort:** divide-and-conquer approach with O(n log n) time.
- **Quick Sort:** partitions around a pivot; average-case complexity is commonly O(n log n).

Tell me which sorting algorithm you want and I can explain it step by step.`;
  if(/dns|domain name/.test(x)) return `## DNS

DNS (Domain Name System) translates human-readable domain names into IP addresses.

### Simple flow
Domain name → DNS lookup → IP address → connection to the server.

DNS is an Application-layer protocol in the OSI model.`;
  if(/routing|router/.test(x)) return `## Routing

Routing is the process of selecting a path for packets from a source network to a destination network. A **router** forwards packets between networks using routing information.

### Types
- Static routing: configured manually.
- Dynamic routing: routes are learned and updated using routing protocols.`;
  if(/8085|microprocessor/.test(x)) return `## 8085 Microprocessor

The 8085 is an 8-bit microprocessor. Its architecture includes the ALU, accumulator, registers, program counter, stack pointer, instruction register/decoder, timing and control unit, and address/data buses.

I can also explain 8085 architecture block-by-block, addressing modes, instructions, or interrupts.`;
  if(/study plan|study routine|revision/.test(x)) return `## Study Strategy

1. **5 min:** choose one exact goal.
2. **25–40 min:** learn the concept actively.
3. **10 min:** close the notes and recall.
4. **10 min:** solve questions or MCQs.
5. **5 min:** note what needs revision.

Tell me the subject and topic if you want a more specific routine.`;
  return `## SmartStudy AI

I can help with academic concepts, exam answers, programming basics, revision and study planning.

For a detailed answer, send the **subject + topic + what you want**. For example:

- Computer Networks – explain multiplexing in detail
- 8085 – explain architecture for 5 marks
- C++ – explain pointers with an example

You can keep asking follow-up questions; the prototype keeps the conversation history.`;
}

async function sendAssistant(){
  if(assistantBusy)return;
  const input=$("assistantInput");
  const q=input ? input.value.trim() : "";
  if(!q)return;

  assistantBusy=true;
  const send=$("sendAssistant");
  if(send){send.disabled=true;send.textContent="Thinking...";}
  input.value="";
  assistantHistory.push({role:"user",content:q});
  assistantHistory=assistantHistory.slice(-24);
  addChat(q,true);
  showTyping();
  setAssistantStatus("Thinking…","busy");

  try{
    const response=await fetch("/api/chat",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({messages:assistantHistory,studyContext:getStudyContext()})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`Server error (${response.status})`);
    const answer=String(data.answer||"").trim();
    if(!answer)throw new Error("The AI returned an empty answer.");
    hideTyping();
    assistantHistory.push({role:"assistant",content:answer});
    assistantHistory=assistantHistory.slice(-24);
    saveAssistantHistory();
    addChat(formatAIText(answer),false,true);
    setAssistantStatus("AI Assistant · Online","online");
  } catch(err){ 
  hideTyping();

  console.error("REAL AI ERROR:", err);

  const errorMessage = err?.message || "Unknown API error";

  assistantHistory.pop();
  saveAssistantHistory();

  addChat(
    "⚠️ <b>AI connection error</b><br><br>" +
    esc(errorMessage) +
    "<br><br>" +
    "<small>Check your server, .env file, API key, and model name.</small>",
    false,
    true
  );

  setAssistantStatus("AI Assistant · Error","offline");
}
  
  finally{
    assistantBusy=false;
    if(send){send.disabled=false;send.textContent="Send";}
    input.focus();
  }
}

function clearAssistant(){
  assistantHistory=[];
  saveAssistantHistory();
  renderAssistantHistory();
  setAssistantStatus("AI Assistant · Demo mode","offline");
}

/* Delegated handlers make the Assistant work even after dynamic UI updates. */
document.addEventListener("click",(e)=>{
  const send=e.target.closest("#sendAssistant");
  if(send){e.preventDefault();sendAssistant();return;}
  const clear=e.target.closest("#clearAssistant");
  if(clear){e.preventDefault();clearAssistant();return;}
  const quick=e.target.closest(".quick button[data-prompt]");
  if(quick){e.preventDefault();const input=$("assistantInput");if(input){input.value=quick.dataset.prompt||"";sendAssistant();}return;}
});
document.addEventListener("keydown",(e)=>{
  if(e.target && e.target.id==="assistantInput" && e.key==="Enter" && !e.shiftKey){e.preventDefault();sendAssistant();}
});

const quizBank={
  "searching algorithms":[
    ["Which searching algorithm requires sorted data for its standard efficient implementation?",["Linear Search","Binary Search","Hash Search","Depth First Search"],1,"Binary Search halves a sorted search interval."],
    ["Worst-case time complexity of Linear Search is:",["O(1)","O(log n)","O(n)","O(n log n)"],2,"In the worst case, Linear Search checks every element."],
    ["Binary Search repeatedly:",["Swaps adjacent items","Divides the search interval in half","Sorts the array","Counts duplicates"],1,"Each comparison discards one half of the remaining sorted range."],
    ["Typical time complexity of Binary Search is:",["O(n)","O(n²)","O(log n)","O(2ⁿ)"],2,"The search range is halved at every step."],
    ["Which search checks elements sequentially?",["Binary Search","Linear Search","Interpolation Search","Tree Search"],1,"Linear Search visits elements one by one."],
    ["For [2,4,6,8,10], which method can find 8 efficiently?",["Binary Search","Only Linear Search","Bubble Search","None"],0,"The array is sorted, so Binary Search can be used."],
    ["A major requirement of Binary Search is:",["Unsorted data","Sorted data","A graph","A stack"],1,"The standard Binary Search method relies on ordering."],
    ["Linear Search can be used on:",["Only sorted lists","Only linked lists","Sorted or unsorted lists","Only trees"],2,"It does not require sorted order."],
    ["After comparing the middle element in Binary Search, one can often:",["Discard one half","Delete the array","Sort everything","Stop always"],0,"The comparison tells which half can contain the target."],
    ["Which is generally faster on a large sorted array?",["Linear Search","Binary Search","Bubble Sort","Insertion Sort"],1,"Binary Search reduces the search range logarithmically."]
  ],
  "sorting algorithms":[
    ["Which algorithm repeatedly swaps adjacent out-of-order elements?",["Merge Sort","Bubble Sort","Binary Search","DFS"],1,"Bubble Sort compares adjacent elements and swaps them when needed."],
    ["Which sorting algorithm uses divide and conquer?",["Merge Sort","Linear Search","Bubble Sort only","Selection Search"],0,"Merge Sort divides the input and then merges sorted halves."],
    ["Average-case complexity of Quick Sort is commonly:",["O(1)","O(log n)","O(n log n)","O(n²)"],2,"With balanced partitions, Quick Sort has O(n log n) average behavior."],
    ["Which sort repeatedly selects the smallest remaining element?",["Selection Sort","Merge Sort","Quick Sort","Binary Search"],0,"Selection Sort selects the next minimum element."],
    ["Insertion Sort builds the sorted portion by:",["Merging two arrays","Inserting each item into its proper position","Selecting a pivot","Using a queue"],1,"Each next item is inserted into the already sorted portion."],
    ["Worst-case complexity of Bubble Sort is:",["O(n)","O(log n)","O(n log n)","O(n²)"],3,"Basic Bubble Sort has quadratic worst-case time."],
    ["Merge Sort needs extra work mainly for:",["Merging arrays","Binary searching","Pivot selection","Hashing"],0,"Its merge step combines sorted halves."],
    ["Quick Sort uses a:",["Pivot","Queue only","Graph","Flag register"],0,"A pivot is used to partition the array."],
    ["Which simple sort is often useful for small or nearly sorted data?",["Insertion Sort","Binary Search","BFS","Hashing"],0,"Insertion Sort performs well when the input is small or nearly sorted."],
    ["A stable sort preserves:",["Array size","Relative order of equal elements","Only minimum values","Memory addresses"],1,"Stability means equal-key elements retain their relative order."]
  ],
  "computer networks":[
    ["Which OSI layer is responsible for routing?",["Physical","Data Link","Network","Application"],2,"Routing is a Network-layer function."],
    ["TCP is:",["Connection-oriented","Always connectionless","A physical protocol","A routing algorithm"],0,"TCP establishes a connection and provides reliable transport."],
    ["Which protocol maps domain names to IP addresses?",["HTTP","DNS","FTP","ARP"],1,"DNS resolves domain names to IP addresses."],
    ["Which device connects different networks?",["Hub","Router","Repeater","Keyboard"],1,"Routers forward packets between networks."],
    ["IP mainly provides:",["Logical addressing","Screen display","File compression","Keyboard input"],0,"IP addresses identify network interfaces logically."],
    ["Which transport protocol is connectionless?",["TCP","UDP","HTTP","DNS"],1,"UDP does not establish a connection before sending datagrams."],
    ["HTTP belongs to which OSI layer?",["Application","Transport","Network","Physical"],0,"HTTP is an application-layer protocol."],
    ["MAC addresses are mainly associated with:",["Data Link","Transport","Session","Application"],0,"MAC addressing is associated with the Data Link layer."],
    ["LAN stands for:",["Large Access Network","Local Area Network","Logical Application Node","Linked Area Number"],1,"LAN means Local Area Network."],
    ["Which command is commonly used to test basic IP reachability?",["ping","print","mkdir","sort"],0,"ping sends test packets and reports reachability information."]
  ],
  "8085":[
    ["8085 is a:",["4-bit microprocessor","8-bit microprocessor","16-bit microprocessor","32-bit microprocessor"],1,"8085 is an 8-bit microprocessor."],
    ["Which register is the accumulator?",["A","B","H","SP"],0,"Register A is the accumulator."],
    ["Which flag is set when the result is zero?",["Carry","Zero","Sign","Parity"],1,"The Zero flag indicates a zero result."],
    ["The 8085 address bus is:",["8-bit","12-bit","16-bit","32-bit"],2,"A 16-bit address bus can address 64 KB of memory."],
    ["Which instruction moves data between registers?",["MOV","ADD","JMP","HLT"],0,"MOV transfers data between registers or memory and registers according to its form."],
    ["Which register pair is commonly used as a 16-bit pointer?",["BC","DE","HL","All of these"],3,"BC, DE and HL can be used as register pairs for 16-bit operations/pointers in 8085."],
    ["What does HLT do?",["Adds values","Stops processor execution","Loads memory","Jumps to an address"],1,"HLT halts processor execution until an interrupt/reset condition resumes it."],
    ["Which instruction adds a register's value to the accumulator?",["ADD","SUB","MOV","CMP"],0,"ADD performs addition with the accumulator."],
    ["Which flag indicates carry out of the most significant bit?",["Carry","Zero","Auxiliary Carry","Sign"],0,"The Carry flag records a carry from the most significant bit in arithmetic operations."],
    ["The 8085 has how many general-purpose 8-bit registers B,C,D,E,H,L?",["4","5","6","8"],2,"B, C, D, E, H and L form six general-purpose 8-bit registers."]
  ],
  "artificial intelligence":[
    ["AI primarily aims to build systems that can:",["Only store files","Perform tasks associated with intelligence","Only draw images","Only calculate arithmetic"],1,"AI includes reasoning, learning, perception and decision-making tasks."],
    ["Which is an AI search technique?",["Breadth-first search","File compression","Formatting","Sorting only"],0,"Breadth-first search is a classical state-space search method."],
    ["Machine learning is a subfield of:",["AI","Networking only","Operating systems only","Compilers only"],0,"Machine learning is one area within AI."],
    ["Natural Language Processing mainly deals with:",["Human language","Computer hardware repair","Power supplies","Cables"],0,"NLP focuses on processing and understanding human language."],
    ["Computer vision deals mainly with:",["Images and visual information","Database indexing only","Network cables","Keyboard input"],0,"Computer vision enables systems to process visual data."],
    ["A heuristic is used to:",["Guide search toward promising states","Delete all data","Increase monitor brightness","Replace RAM"],0,"Heuristics estimate which choices are promising during search."],
    ["An intelligent agent generally:",["Perceives and acts in an environment","Only stores passwords","Only prints documents","Only compiles code"],0,"Agents perceive their environment and choose actions."],
    ["Knowledge representation is concerned with:",["Representing information for reasoning","Only file naming","Only image compression","Only networking"],0,"AI systems need representations that support reasoning and inference."],
    ["Which is an example of AI application?",["Speech recognition","A passive cable","A power switch","A plain resistor"],0,"Speech recognition uses AI methods to process spoken language."],
    ["A rule-based expert system commonly uses:",["Rules and an inference mechanism","Only a spreadsheet","Only a camera","Only a router"],0,"Expert systems often represent domain knowledge as rules and use inference."]
  ],
  "machine learning":[
    ["Supervised learning uses:",["Labelled data","No data","Only random numbers","Only network cables"],0,"Supervised algorithms learn from labelled examples."],
    ["Unsupervised learning generally works with:",["Unlabelled data","Only labelled data","No input","Only images"],0,"It discovers structure in data without target labels."],
    ["Reinforcement learning uses:",["Rewards and penalties/feedback","Only labels","Only sorting","Only SQL"],0,"An agent learns from feedback from its environment."],
    ["Classification predicts:",["Discrete categories","Only continuous values","Only file sizes","Only IP addresses"],0,"Classification assigns examples to classes."],
    ["Regression commonly predicts:",["A continuous numerical value","Only class names","Only images","Only rules"],0,"Regression models continuous target values."],
    ["Training data is used to:",["Learn model parameters/patterns","Only print output","Only store passwords","Only change hardware"],0,"The model learns from training examples."],
    ["Overfitting means a model:",["Fits training data too closely and generalizes poorly","Never learns","Always has zero error","Cannot use data"],0,"An overfit model captures noise or specifics of training data."],
    ["A test set is mainly used to:",["Evaluate generalization on unseen data","Train every parameter","Delete the model","Create labels automatically"],0,"The test set estimates performance on unseen examples."],
    ["Which is an unsupervised technique?",["Clustering","Linear regression with labels","Classification","Supervised decision tree"],0,"Clustering groups data without target labels."],
    ["A feature is:",["An input variable used by a model","Always the final answer","Only a file","A network cable"],0,"Features describe the input examples used by a model."]
  ],
  "internet of things":[
    ["IoT connects:",["Physical devices, sensors and software","Only websites","Only printers","Only databases"],0,"IoT combines physical devices, connectivity and software/data services."],
    ["A sensor is used to:",["Measure or detect a physical quantity","Only display webpages","Only store passwords","Only compile code"],0,"Sensors collect measurements such as temperature or motion."],
    ["An actuator generally:",["Produces an action in the physical world","Only measures temperature","Only stores data","Only formats text"],0,"Actuators convert control signals into physical actions."],
    ["Which is a common IoT application?",["Smart agriculture","Manual typing only","Paper filing only","Offline calculator only"],0,"Smart agriculture uses sensors and connected devices for monitoring and control."],
    ["Cloud platforms in IoT can provide:",["Storage and processing","Only electricity","Only cables","Only keyboard input"],0,"Cloud services can store and process collected IoT data."],
    ["MQTT is commonly associated with:",["IoT messaging","Image editing","CPU design","Word processing"],0,"MQTT is a lightweight publish/subscribe messaging protocol used in IoT."],
    ["An IoT gateway can:",["Connect local devices to other networks/services","Only print documents","Only charge batteries","Only display images"],0,"Gateways bridge local device networks with wider systems."],
    ["IoT security should protect:",["Devices, communication and data","Only fonts","Only screen brightness","Only file names"],0,"Security applies across the IoT system and its data flows."],
    ["Telemetry means:",["Collecting and transmitting measurements","Deleting a device","Changing a password only","Formatting a drive"],0,"Telemetry involves collecting and communicating measurements."],
    ["A smart irrigation system can use IoT to:",["Monitor soil/environment data and control irrigation","Only edit videos","Only compress images","Only print reports"],0,"Sensors and controllers can automate irrigation based on measured conditions."]
  ],
  "fuzzy logic":[
    ["Fuzzy logic represents truth as:",["Only 0 or 1","Degrees between fully false and fully true","Only text","Only integers"],1,"Fuzzy sets use membership degrees, commonly in the range 0 to 1."],
    ["The first stage of a typical fuzzy system is:",["Fuzzification","Compilation","Sorting","Encryption"],0,"Crisp inputs are converted to fuzzy membership values."],
    ["Defuzzification converts:",["Fuzzy output to a crisp value","Text to image","IP to MAC","Binary to decimal only"],0,"Defuzzification produces a usable crisp output."],
    ["A fuzzy rule commonly has the form:",["IF condition THEN action","FOR loop only","SQL SELECT only","HTML tag only"],0,"Fuzzy inference systems use IF-THEN rules."],
    ["Membership function describes:",["Degree of membership in a fuzzy set","Memory size","Network speed only","CPU frequency"],0,"It maps an input to a membership degree."],
    ["Fuzzy logic is useful when concepts are:",["Gradual or imprecise","Always exact","Only binary","Never uncertain"],0,"It can represent gradual concepts such as low, medium and high."],
    ["An example of a fuzzy variable is:",["Temperature","File extension only","MAC address only","Program counter only"],0,"Temperature can be described using fuzzy sets such as cold, warm and hot."],
    ["Inference in a fuzzy system evaluates:",["Fuzzy rules","Only file names","Only IP addresses","Only keyboard input"],0,"The inference mechanism determines rule outputs from memberships."],
    ["A fuzzy set can have an element with membership:",["0.7","Only -1","Only 2","Only 100"],0,"Membership degrees are commonly between 0 and 1."],
    ["A fuzzy controller is often used for:",["Decision/control under imprecision","Only file storage","Only text formatting","Only image cropping"],0,"Fuzzy control is useful where rules describe gradual behavior."]
  ],
  "generative ai":[
    ["Generative AI is designed to:",["Generate new content","Only store files","Only route packets","Only measure voltage"],0,"Generative models produce new content from learned patterns."],
    ["A prompt is:",["An instruction/input given to a model","A type of RAM","A network cable","A database table"],0,"Prompts guide the model toward a desired response or output."],
    ["Which is a generative AI output?",["Generated text","Only a temperature reading","Only an IP address","Only a sensor signal"],0,"Generative systems can produce text and other content."],
    ["A key limitation of generative AI is:",["It can produce incorrect information","It always gives verified facts","It never needs review","It cannot generate text"],0,"Generated output should be checked because models can make errors."],
    ["Prompt engineering mainly means:",["Designing effective instructions for a model","Repairing a CPU","Writing network cables","Formatting disks"],0,"Prompt engineering focuses on how instructions are written and structured."],
    ["A multimodal AI system can work with:",["More than one type of input/output modality","Only integers","Only text files","Only one sensor"],0,"Multimodal systems can combine modalities such as text and images."],
    ["An AI assistant can support studying by:",["Explaining concepts and creating practice material","Replacing every teacher automatically","Guaranteeing exam marks","Removing the need to verify facts"],0,"AI can support learning but generated content should be checked."],
    ["A responsible use of generated content includes:",["Reviewing important outputs","Accepting every answer blindly","Sharing private passwords","Ignoring errors"],0,"Human review is important for accuracy and safety."],
    ["Which is a common generative AI task?",["Text generation","Cable crimping","Battery charging","Screen cleaning"],0,"Text generation is a common generative AI task."],
    ["Generative AI can be used in a study planner to:",["Generate personalized study plans from inputs","Guarantee a student's result","Replace all assessment","Prevent all distractions automatically"],0,"A planner can use user inputs to generate a proposed study plan."]
  ],
  "data structures":[
    ["Which structure follows LIFO?",["Stack","Queue","Array only","Graph"],0,"A stack is Last-In-First-Out."],
    ["Which structure follows FIFO?",["Stack","Queue","Tree","Heap only"],1,"A queue is First-In-First-Out."],
    ["A linked list stores elements using:",["Nodes connected by links/references","Only contiguous memory","Only SQL tables","Only files"],0,"Linked-list nodes contain data and links/references."],
    ["A tree is generally:",["Hierarchical","Always linear","Only a file","Only a queue"],0,"Trees represent hierarchical relationships."],
    ["A graph consists mainly of:",["Vertices and edges","Only rows","Only stacks","Only arrays"],0,"Graphs model relationships using vertices and edges."],
    ["Which structure is useful for function call management?",["Stack","Queue only","Graph only","Hash table only"],0,"Call stacks manage active function calls."],
    ["A queue is commonly used in:",["Scheduling","Only recursion","Only sorting","Only compilation"],0,"Queues are useful in scheduling and breadth-first processing."],
    ["A hash table is designed for:",["Fast key-based lookup on average","Only sequential printing","Only graph traversal","Only recursion"],0,"Hash tables provide average constant-time lookup under suitable conditions."],
    ["Binary search trees organize values according to:",["Ordering relationship between left/right subtrees","Only insertion time","Only file size","Only color"],0,"BSTs maintain an ordering property between subtrees."],
    ["Which traversal visits root before subtrees?",["Preorder","Inorder","Postorder","Level only"],0,"Preorder visits root, then left subtree, then right subtree."]
  ],
  "python":[
    ["Which keyword defines a function in Python?",["def","func","function","define"],0,"Python uses the def keyword."],
    ["Which data type stores key-value pairs?",["List","Tuple","Dictionary","Set"],2,"Dictionaries store key-value pairs."],
    ["Which symbol starts a Python comment?",["#","//","<!--","**"],0,"A single # begins a Python comment."],
    ["Which collection is ordered and mutable?",["List","Tuple","String only","Frozen set"],0,"Lists are ordered and mutable."],
    ["Which loop is useful for iterating over a sequence?",["for","switch","repeat-until","goto"],0,"Python's for loop iterates over iterable objects."],
    ["What does len() return?",["Length/number of items","Memory address","Data type only","File path only"],0,"len() returns the number of items or characters for supported objects."],
    ["Which block handles exceptions?",["try/except","if/else only","for/while","def/class"],0,"Python uses try/except for exception handling."],
    ["A tuple is generally:",["Immutable sequence","Mutable dictionary","Only a number","A class definition"],0,"Tuples cannot be changed after creation."],
    ["Which operator checks equality?",["=","==","!=","=>"],1,"== compares values for equality; = is assignment."],
    ["Which keyword creates a class?",["class","object","struct","new"],0,"Python uses the class keyword."]
  ]
};
function normalizeTopic(t){
  const x=t.toLowerCase().trim().replace(/[^a-z0-9\s-]/g," ").replace(/\s+/g," ");
  const aliases=[
    [["multiplex","tdm","fdm","wavelength division","wdm"],"multiplexing"],
    [["switching","circuit switching","packet switching","message switching"],"switching"],
    [["routing","router","routing algorithm","distance vector","link state"],"routing"],
    [["osi","osi model","layers of osi"],"osi model"],
    [["tcp ip","tcp/ip","tcp","udp","transport layer"],"tcp ip and transport"],
    [["ip address","ipv4","ipv6","subnetting","subnet"],"ip addressing"],
    [["dns","domain name system"],"dns"],
    [["http","https","web protocol"],"http and https"],
    [["error control","flow control","data link"],"data link control"],
    [["topology","network topology","star topology","bus topology","ring topology"],"network topology"],
    [["search","binary search","linear search","searching"],"searching algorithms"],
    [["sort","sorting","bubble sort","merge sort","quick sort","insertion sort"],"sorting algorithms"],
    [["8085","microprocessor","8085 architecture"],"8085"],
    [["generative","gen ai","generative ai","large language model","llm"],"generative ai"],
    [["fuzzy","fuzzy logic"],"fuzzy logic"],
    [["iot","internet of things"],"internet of things"],
    [["machine learning","ml","supervised learning","unsupervised learning","reinforcement learning"],"machine learning"],
    [["artificial intelligence","ai","intelligent agent","expert system"],"artificial intelligence"],
    [["data structure","data structures","stack","queue","linked list","tree","graph"],"data structures"],
    [["python","python programming"],"python"]
  ];
  for(const [words,key] of aliases){if(words.some(w=>x===w||x.includes(w)))return key;}
  return null;
}

// Additional topic banks make the prototype useful for common college topics,
// including Computer Networks topics such as Multiplexing.
quizBank["multiplexing"]=[
  ["What is the main purpose of multiplexing?",["To combine multiple signals for transmission over a shared medium","To encrypt every packet","To replace routers","To compress a file"],0,"Multiplexing combines multiple signals so they can share one communication link."],
  ["FDM separates signals mainly by using different:",["Time slots","Frequency bands","IP addresses","MAC addresses"],1,"Frequency Division Multiplexing assigns different frequency bands to different signals."],
  ["TDM separates signals mainly by using different:",["Frequency bands","Time slots","Ports","Routers"],1,"Time Division Multiplexing gives different signals separate time slots."],
  ["WDM is mainly used with:",["Optical fiber","Twisted-pair telephone cables only","USB keyboards","Printers"],0,"Wavelength Division Multiplexing uses different light wavelengths in optical fiber."],
  ["In TDM, the shared channel is divided into:",["Time slots","IP classes","Frequency amplifiers","Frames only"],0,"Each source is assigned one or more time slots."],
  ["Which technique is most closely associated with different carrier frequencies?",["FDM","TDM","CSMA","ARP"],0,"FDM uses separate frequency ranges for different signals."],
  ["Statistical TDM assigns slots:",["Only to permanently reserved users","Dynamically according to demand","Only to routers","Only to optical links"],1,"Statistical TDM allocates slots dynamically to active sources."],
  ["A device that combines several input signals into one shared output is a:",["Multiplexer","Repeater","Firewall","Modem only"],0,"A multiplexer combines multiple input channels onto one output channel."],
  ["The reverse operation of multiplexing is called:",["Routing","Demultiplexing","Switching","Encoding"],1,"A demultiplexer separates the combined signal back into individual signals."],
  ["Which statement is correct?",["FDM uses time slots and TDM uses frequencies","FDM uses frequency bands and TDM uses time slots","Both always use IP addresses","Neither shares a medium"],1,"FDM separates by frequency; TDM separates by time."],
  ["In WDM, different optical signals are distinguished by different:",["Wavelengths","MAC addresses","Ports","Packet sizes"],0,"WDM uses distinct wavelengths of light."],
  ["The device that separates a multiplexed signal is a:",["Demultiplexer","Multiplexer","Router","Repeater"],0,"A demultiplexer splits a combined signal into its original channels."]
];
quizBank["switching"]=[
  ["Which switching method establishes a dedicated path before communication?",["Circuit switching","Packet switching","Message switching","Broadcast switching"],0,"Circuit switching reserves a dedicated path for the communication session."],
  ["In packet switching, data is divided into:",["Packets","Frequency bands","Time slots only","Circuits"],0,"Packet switching divides data into packets that are forwarded through the network."],
  ["Which switching method can store an entire message before forwarding it?",["Message switching","Circuit switching","TDM","FDM"],0,"Message switching stores and forwards the complete message at intermediate nodes."],
  ["The Internet primarily uses:",["Packet switching","Circuit switching only","FDM only","Manual switching"],0,"Internet communication is based primarily on packet switching."],
  ["A major advantage of packet switching is:",["Efficient sharing of network resources","A permanently reserved path for every user","No packet headers","No need for addressing"],0,"Packets from different users can share network links efficiently."],
  ["Store-and-forward operation is characteristic of:",["Message switching","Only circuit switching","Only FDM","Only TDM"],0,"Message switching stores the complete message before forwarding."],
  ["Which switching method is generally suitable for real-time voice in traditional telephone networks?",["Circuit switching","Message switching","File switching","Database switching"],0,"Traditional telephone systems used dedicated circuit paths for voice calls."],
  ["Packet switching can use datagrams in which packets:",["May follow different paths","Must always use one dedicated circuit","Have no destination","Cannot be routed"],0,"Datagram packets can be routed independently and may take different paths."]
];
quizBank["osi model"]=[
  ["Which OSI layer is responsible for routing?",["Physical","Data Link","Network","Application"],2,"Routing is a Network-layer function."],
  ["Which OSI layer provides end-to-end delivery?",["Transport","Physical","Presentation","Data Link"],0,"The Transport layer provides end-to-end transport services."],
  ["Which layer is responsible for framing?",["Data Link","Network","Session","Application"],0,"The Data Link layer organizes bits into frames."],
  ["Which layer is closest to the end user?",["Application","Physical","Data Link","Network"],0,"The Application layer provides network services to applications."],
  ["Which OSI layer deals with data representation and translation?",["Presentation","Transport","Network","Physical"],0,"The Presentation layer handles translation, encryption and compression functions."],
  ["Which layer establishes, manages and terminates sessions?",["Session","Network","Data Link","Physical"],0,"The Session layer manages communication sessions."],
  ["Bits are transmitted over the medium at which layer?",["Physical","Network","Transport","Application"],0,"The Physical layer handles transmission of raw bits."],
  ["Logical addressing is mainly associated with which layer?",["Network","Physical","Session","Presentation"],0,"The Network layer uses logical addresses such as IP addresses."],
  ["Which is the correct top-to-bottom OSI order?",["Application, Presentation, Session, Transport, Network, Data Link, Physical","Physical, Network, Application, Transport, Session, Data Link, Presentation","Application, Session, Network, Transport, Physical, Data Link, Presentation","Transport, Application, Session, Network, Data Link, Physical, Presentation"],0,"The seven layers from top to bottom are Application, Presentation, Session, Transport, Network, Data Link and Physical."],
  ["Which layer uses MAC addresses for local delivery?",["Data Link","Transport","Session","Application"],0,"MAC addressing is associated with the Data Link layer."]
];
quizBank["routing"]=[
  ["What is the main purpose of routing?",["Select a path for packets between networks","Encrypt files","Assign usernames","Compress images"],0,"Routing determines paths for forwarding packets between networks."],
  ["Which device performs routing between networks?",["Router","Hub","Repeater","Keyboard"],0,"Routers forward packets between different networks."],
  ["Distance Vector routing commonly uses:",["Hop count or distance metrics","Only MAC addresses","Only time slots","Only passwords"],0,"Distance Vector protocols calculate routes using distance metrics such as hop count."],
  ["Link State routing builds a view of:",["Network topology","User passwords","File formats","Screen resolution"],0,"Link State protocols maintain information about network topology."],
  ["A routing table contains information used to:",["Forward packets","Display web pages","Store images","Format disks"],0,"Routers consult routing tables to select forwarding paths."],
  ["Which is a common dynamic routing protocol?",["OSPF","HTML","FTP","USB"],0,"OSPF is a dynamic interior gateway routing protocol."],
  ["BGP is mainly used for routing between:",["Autonomous systems","Keyboard keys","Processes on one CPU","Files in one folder"],0,"BGP is the principal inter-domain routing protocol used between autonomous systems."],
  ["The next-hop entry tells a router:",["Where to forward a packet next","Which file to delete","Which password to use","Which port to close permanently"],0,"The next hop identifies the next routing destination for forwarding." ]
];
quizBank["ip addressing"]=[
  ["An IPv4 address contains how many bits?",["16","32","64","128"],1,"IPv4 uses 32-bit addresses."],
  ["An IPv6 address contains how many bits?",["32","64","96","128"],3,"IPv6 uses 128-bit addresses."],
  ["Which notation is commonly used for IPv4 addresses?",["Dotted decimal","Binary words only","Hexadecimal only","Roman numerals"],0,"IPv4 addresses are commonly written in dotted-decimal notation."],
  ["A subnet mask is used to identify:",["Network and host portions of an IPv4 address","Only the MAC address","Only the application protocol","Only the physical cable"],0,"The subnet mask separates network and host portions."],
  ["Which address identifies a network interface logically?",["IP address","MAC address only","Port number","URL only"],0,"IP addresses provide logical addressing at the network layer."],
  ["Which protocol automatically assigns IP configuration to hosts?",["DHCP","HTTP","FTP","SMTP"],0,"DHCP can automatically provide IP configuration to clients."],
  ["The default gateway is typically:",["The router used to reach other networks","A web browser","A DNS record only","A keyboard driver"],0,"The default gateway forwards traffic destined for other networks."],
  ["Which IPv4 address is in the private 192.168.0.0/16 range?",["192.168.1.10","8.8.8.8","1.1.1.1","172.40.1.2"],0,"192.168.0.0/16 is one of the private IPv4 address ranges."]
];
quizBank["dns"]=[
  ["What is the primary purpose of DNS?",["Resolve domain names to IP addresses","Encrypt all packets","Assign MAC addresses","Compress web pages"],0,"DNS translates human-readable domain names into IP addresses."],
  ["DNS stands for:",["Domain Name System","Data Network Service","Digital Node Security","Domain Network Switch"],0,"DNS means Domain Name System."],
  ["Which DNS record maps a hostname to an IPv4 address?",["A","MX","TXT","NS only"],0,"An A record maps a hostname to an IPv4 address."],
  ["Which record is used for mail-server information?",["MX","A","CNAME only","PTR only"],0,"MX records identify mail exchange servers for a domain."],
  ["A DNS resolver helps a client:",["Find DNS answers","Compile programs","Route electricity","Format storage"],0,"A resolver performs or obtains DNS lookups on behalf of clients."],
  ["A CNAME record is used for:",["An alias to another domain name","A physical cable","A password","A subnet mask"],0,"CNAME records create aliases pointing to another domain name."],
  ["DNS commonly uses which transport port for traditional queries?",["53","25","80","443"],0,"DNS traditionally uses port 53, commonly UDP for ordinary queries."],
  ["What problem does DNS mainly solve?",["Remembering numeric IP addresses for services","Increasing monitor size","Removing routers","Creating RAM"],0,"DNS lets users use names instead of remembering numeric IP addresses."]
];
quizBank["http and https"]=[
  ["HTTP is primarily used for:",["Web communication","Routing electricity","Disk formatting","CPU scheduling"],0,"HTTP is an application-layer protocol used for web communication."],
  ["HTTPS adds which major security property to HTTP?",["Encrypted communication using TLS","Faster CPU execution","Larger storage","Automatic subnetting"],0,"HTTPS uses TLS to protect communication between client and server."],
  ["Which port is commonly associated with HTTP?",["80","25","53","110"],0,"HTTP commonly uses TCP port 80."],
  ["Which port is commonly associated with HTTPS?",["443","21","53","23"],0,"HTTPS commonly uses TCP port 443."],
  ["A GET request is generally used to:",["Retrieve a resource","Delete a server","Assign an IP address","Create a MAC address"],0,"GET requests commonly retrieve a resource."],
  ["A POST request is commonly used to:",["Send data to a server for processing","Resolve DNS only","Route packets","Transmit raw bits"],0,"POST commonly sends data to a server for processing or resource creation."],
  ["HTTP status code 404 indicates:",["Resource not found","Success","Server permanently powered off","DNS disabled"],0,"404 means the requested resource could not be found."],
  ["HTTP status code 200 generally indicates:",["Successful request","Client authentication failure","Not found","Permanent redirect"],0,"A 200 response indicates successful processing of the request."]
];
quizBank["data link control"]=[
  ["Flow control is used to:",["Prevent a fast sender from overwhelming a slow receiver","Assign domain names","Encrypt every file","Choose a CPU"],0,"Flow control regulates transmission so the receiver is not overwhelmed."],
  ["Error detection is used to:",["Identify whether transmitted data was corrupted","Increase screen brightness","Assign passwords","Create websites"],0,"Error-detection methods help detect corruption in transmitted data."],
  ["Which is an error-detection technique?",["CRC","DNS","HTTP","FTP"],0,"Cyclic Redundancy Check is widely used for error detection."],
  ["ARQ commonly uses:",["Acknowledgments and retransmissions","Only compression","Only routing tables","Only encryption"],0,"Automatic Repeat reQuest uses feedback and retransmission when needed."],
  ["Stop-and-Wait sends:",["One frame and waits for feedback","All frames at once without feedback","Only control messages","Only routing tables"],0,"Stop-and-Wait transmits one frame and waits for an acknowledgment before continuing."],
  ["Sliding Window allows:",["Multiple frames to be in transit before acknowledgment","Only one bit to be sent","No acknowledgments ever","Only DNS traffic"],0,"Sliding Window permits multiple outstanding frames and improves link utilization."]
];
quizBank["network topology"]=[
  ["In a star topology, devices connect to a central:",["Hub or switch","Router only","Printer","Database"],0,"Star networks connect end devices to a central hub or switch."],
  ["Which topology uses a single shared backbone cable?",["Bus","Star","Ring","Mesh"],0,"Bus topology uses a shared backbone medium."],
  ["In a ring topology, devices are generally connected in:",["A closed loop","A single central point","A tree only","Random isolated pairs"],0,"Ring topology forms a closed loop of connections."],
  ["Which topology provides many redundant paths?",["Mesh","Bus","Star with one link","Ring with one break"],0,"Mesh topology can provide multiple redundant paths between nodes."],
  ["A major advantage of star topology is:",["Failure of one endpoint link usually does not disconnect other endpoints","It needs no central device","It always uses the least cable","It has no single central point"],0,"In a typical star, one endpoint link can fail without taking down the other links."],
  ["Which topology is often easiest to manage centrally?",["Star","Bus","Ring","Pure point-to-point chain"],0,"A star topology provides a central connection point that simplifies management."]
];

function questionDifficulty(q){
  // Existing banks are mixed-level. Keep the difficulty selector useful without
  // requiring a backend: classify questions by conceptual depth.
  const text=(q[0]+" "+q[3]).toLowerCase();
  if(/complex|compare|why|advantage|disadvantage|calculate|best|correctly|difference|architecture|algorithm/.test(text))return "Hard";
  if(/what|which|stands for|used for|main purpose|contains|layer|protocol|device/.test(text))return "Easy";
  return "Medium";
}
function buildQuizQuestions(bank,count,difficulty){
  const all=shuffle(bank);
  const exact=all.filter(q=>questionDifficulty(q)===difficulty);
  const pool=exact.length>=Math.min(count,3)?exact.concat(all.filter(q=>!exact.includes(q))):all;
  return shuffle(pool).slice(0,count);
}
function generateQuiz(){
  try{
    let topic=$("quizTopic")?.value?.trim()||"";
    const sid=$("quizSubject")?.value||"";
    if(!topic && sid){
      const s=(state.subjects||[]).find(x=>String(x.id)===String(sid));
      topic=s?.topics?.[0]||s?.name||"";
      if($("quizTopic")) $("quizTopic").value=topic;
    }
    if(!topic){$("quizStatus").textContent="Enter a topic or choose a subject.";return;}
    const key=normalizeTopic(topic);
    if(!key || !quizBank[key]){
      $("quizStatus").textContent="This topic is not mapped yet. Try Multiplexing, OSI Model, Routing, IP Addressing, DNS, HTTP, Searching, Sorting, 8085, AI, ML, IoT, Fuzzy Logic, Generative AI, Data Structures or Python.";
      $("quizArea").innerHTML=`<div class="empty"><b>Topic not available yet</b><p>For this prototype, quizzes use built-in academic question banks. Try a more specific topic.</p></div>`;
      return;
    }
    const count=Math.max(1,Math.min(20,Number($("quizCount")?.value)||5));
    const difficulty=$("quizDifficulty")?.value||"Medium";
    const qs=buildQuizQuestions(quizBank[key],count,difficulty);
    if(!qs.length) throw new Error("No questions are available for this topic.");
    window.currentQuiz={qs,answers:{},score:null,topic,difficulty};
    $("quizStatus").textContent=`${qs.length} ${difficulty.toLowerCase()} questions generated for ${topic}. Select one answer for each and submit.`;
    $("quizArea").innerHTML=qs.map((q,i)=>`<div class="quiz-question"><div class="quiz-q-head"><span>Question ${i+1}</span><span class="quiz-level">${questionDifficulty(q)}</span></div><h3>${i+1}. ${esc(q[0])}</h3>${q[1].map((o,j)=>`<button type="button" class="option" data-q="${i}" data-a="${j}">${esc(o)}</button>`).join("")}<div id="explain-${i}" class="quiz-explanation hidden"></div></div>`).join("")+`<button type="button" id="submitQuiz" class="primary">Submit Quiz</button><div id="quizResult"></div>`;
    $("quizArea").querySelectorAll(".option").forEach(b=>b.addEventListener("click",()=>{
      const qi=Number(b.dataset.q);
      window.currentQuiz.answers[qi]=Number(b.dataset.a);
      $("quizArea").querySelectorAll(`.option[data-q="${qi}"]`).forEach(x=>x.classList.remove("selected"));
      b.classList.add("selected");
    }));
    $("submitQuiz")?.addEventListener("click",submitQuiz);
  }catch(err){
    console.error("Quiz generation error:",err);
    $("quizStatus").textContent="Quiz could not be generated. Please try again.";
    $("quizArea").innerHTML=`<div class="empty"><b>Something went wrong.</b><p>${esc(err?.message||"Unknown error")}</p></div>`;
  }
}

function submitQuiz(){
  const q=window.currentQuiz;if(!q)return;
  const unanswered=q.qs.filter((_,i)=>q.answers[i]===undefined).length;
  if(unanswered){$("quizResult").innerHTML=`<div class="quiz-warning">Please answer all ${unanswered} remaining question${unanswered===1?"":"s"} before submitting.</div>`;return;}
  let score=0;q.qs.forEach((item,i)=>{if(q.answers[i]===item[2])score++;});q.score=score;
  q.qs.forEach((item,i)=>{
    document.querySelectorAll(`.option[data-q="${i}"]`).forEach(b=>{const a=Number(b.dataset.a);if(a===item[2])b.classList.add("correct");else if(a===q.answers[i]&&a!==item[2])b.classList.add("wrong");b.disabled=true;});
    const box=$("explain-"+i);box.classList.remove("hidden");box.innerHTML=`<b>Explanation:</b> ${esc(item[3])}`;
  });
  const pct=Math.round(score/q.qs.length*100);
  $("quizResult").innerHTML=`<div class="score">${score}/${q.qs.length}</div><p class="muted">Score: ${pct}%. ${pct>=80?"Strong recall. Review the explanations once more.":pct>=60?"Good attempt. Revisit the questions you missed.":"Review the topic, then retry the quiz."}</p>`;
  // Keep quiz performance available to Progress/Re-planning as local prototype data.
  state.quizResults=state.quizResults||[];
  state.quizResults.push({id:Date.now(),topic:q.topic,score,total:q.qs.length,pct,date:new Date().toISOString()});
  state.quizResults=state.quizResults.slice(-20);
  save();
}
// Robust quiz control: use delegated click handling so the button works even if the page is re-rendered.
document.addEventListener("click", (e)=>{
  const btn=e.target.closest("#generateQuizBtn");
  if(btn){ e.preventDefault(); generateQuiz(); }
});

function renderMaterials(){
  const groups={};
  state.materials.forEach(m=>{(groups[m.subjectId||"general"]??=[]).push(m);});
  const ids=Object.keys(groups);
  $("materialList").innerHTML=ids.length?ids.map(id=>{
    const subject=state.subjects.find(s=>String(s.id)===String(id));
    const title=subject?subject.name:"General Materials";
    return `<div class="material-folder"><div class="folder-head"><div><span class="folder-icon">▰</span><div><h3>${esc(title)}</h3><small>${groups[id].length} file${groups[id].length===1?"":"s"}</small></div></div><span class="folder-badge">SUBJECT FOLDER</span></div><div class="folder-files">${groups[id].map(m=>`<div class="material"><div><strong>▤ ${esc(m.name)}</strong><small>${esc(m.size)} · Added locally</small></div><button class="delete" onclick="removeMaterial(${m.id})">Remove</button></div>`).join("")}</div></div>`;
  }).join(""):`<div class="empty">No materials yet. Choose a subject folder and add your files.</div>`;
}
function addMaterial(){
  const sid=$("materialSubject").value, files=[...$("materialInput").files];
  if(!sid){alert("Choose a subject folder first.");return;}
  if(!files.length){alert("Choose one or more files first.");return;}
  files.forEach(f=>state.materials.push({id:Date.now()+Math.random(),subjectId:Number(sid),name:f.name,size:(f.size/1024).toFixed(1)+" KB"}));
  save();renderMaterials();$("materialInput").value="";
}
function removeMaterial(id){state.materials=state.materials.filter(m=>m.id!==id);save();renderMaterials();}
$("addMaterialBtn").onclick=addMaterial;

let focusInterval=null;

// Focus Mode uses an absolute end timestamp so it keeps running accurately
// when the user changes dashboard pages, switches browser tabs, or minimizes.
function focusRemaining(){
  if(state.focusRunning && state.focusEnd){
    return Math.max(0, Math.ceil((state.focusEnd-Date.now())/1000));
  }
  return Math.max(0, Number(state.focusSeconds)||0);
}
function stopFocusTicker(){
  if(focusInterval){clearInterval(focusInterval);focusInterval=null;}
}
function renderFocus(){
  const s=focusRemaining();
  const m=String(Math.floor(s/60)).padStart(2,"0");
  const sec=String(s%60).padStart(2,"0");
  const timer=$("focusTimer");
  const status=$("focusStatus");
  if(timer) timer.textContent=`${m}:${sec}`;
  if(status) status.textContent=state.focusRunning?"Focus session running — you can move around the workspace.":(s>0?"Ready for a focused session.":"Enter your required session duration, then start the session.");
  const startBtn=$("startFocus");
  if(startBtn) startBtn.textContent=state.focusRunning?"Running…":"Start Session";
}
function syncFocus(){
  const remaining=focusRemaining();
  state.focusSeconds=remaining;
  if(state.focusRunning && remaining<=0){
    state.focusRunning=false;
    state.focusEnd=0;
    state.focusSeconds=0;
    state.sessions=(Number(state.sessions)||0)+1;
    save();
    stopFocusTicker();
    renderFocus();
    alert("Focus session completed!");
    renderDashboard();
    renderProgress();
    return;
  }
  renderFocus();
}
function startFocus(){
  if(state.focusRunning) return;
  const input=$("focusDuration");
  const minutes=input ? Number(input.value) : 0;
  if(!Number.isFinite(minutes) || minutes < 1 || minutes > 600){
    alert("Please enter a session duration between 1 and 600 minutes.");
    if(input) input.focus();
    return;
  }
  const seconds=minutes*60;
  state.focusSeconds=seconds;
  state.focusEnd=Date.now()+seconds*1000;
  state.focusRunning=true;
  save();
  stopFocusTicker();
  focusInterval=setInterval(syncFocus,250);
  syncFocus();
}
function pauseFocus(){
  if(!state.focusRunning) return;
  state.focusSeconds=focusRemaining();
  state.focusRunning=false;
  state.focusEnd=0;
  save();
  stopFocusTicker();
  renderFocus();
}
function resetFocus(){
  state.focusRunning=false;
  state.focusEnd=0;
  const input=$("focusDuration");
  const minutes=input ? Number(input.value) : 0;
  state.focusSeconds=(Number.isFinite(minutes) && minutes>0) ? minutes*60 : 0;
  save();
  stopFocusTicker();
  renderFocus();
}
$("startFocus").onclick=startFocus;
$("pauseFocus").onclick=pauseFocus;
$("resetFocus").onclick=resetFocus;
if($("focusDuration")) $("focusDuration").oninput=()=>{
  if(!state.focusRunning){
    const minutes=Number($("focusDuration").value);
    state.focusSeconds=(Number.isFinite(minutes) && minutes>0) ? minutes*60 : 0;
    save();
    renderFocus();
  }
};
document.addEventListener("visibilitychange",()=>{
  if(state.focusRunning){
    syncFocus();
    if(document.visibilityState==="visible"){
      stopFocusTicker();
      focusInterval=setInterval(syncFocus,250);
    }else{
      stopFocusTicker();
    }
  }
});
window.addEventListener("beforeunload",()=>{if(state.focusRunning){state.focusSeconds=focusRemaining();save();}});

function renderProgress(){
  const p=progressData();$("progCompleted").textContent=p.done;$("progPending").textContent=p.total-p.done;$("progSessions").textContent=state.sessions;$("progOverall").textContent=p.pct+"%";
  $("progressSubjects").innerHTML=state.subjects.length?state.subjects.map(s=>{const d=s.topics.filter(t=>state.completed[s.id+"::"+t]).length,p=s.topics.length?Math.round(d/s.topics.length*100):0;return `<div class="mastery"><div class="mastery-head"><span>${esc(s.name)}</span><b>${p}%</b></div><div class="bar"><i style="width:${p}%"></i></div></div>`}).join(""):`<div class="empty">No subjects added.</div>`;
}
function replan(){
  if(!state.subjects.length){alert("Add subjects first.");return;}
  const unfinished=[];state.subjects.forEach(s=>s.topics.forEach(t=>{if(!state.completed[s.id+"::"+t])unfinished.push({subject:s.name,topic:t});}));
  state.plan=unfinished.slice(0,8).map((x,i)=>({...x,duration:45,time:timeFor(i,"Flexible")}));save();renderDashboard();
  const blocks = state.plan.map((x,i) => "<div class=\"schedule-block\"><strong>" + (i+1) + ". " + esc(x.time) + " · " + esc(x.subject) + "</strong><p>" + esc(x.topic) + " · " + x.duration + " minutes</p></div>").join("");
  $("replanOutput").innerHTML = "<h2>Updated Adaptive Plan</h2>" + (blocks || "<div class=\"empty\">All topics are completed.</div>");
}
$("replanBtn").onclick=replan;

$("saveSettings").onclick=()=>{
  const n=$("settingsName").value.trim();if(!n)return;
  state.user.name=n;const users=JSON.parse(localStorage.getItem("smartstudy_users")||"{}");users[state.user.email]=state.user;localStorage.setItem("smartstudy_users",JSON.stringify(users));save();openApp();$("settingsMsg").textContent="Saved.";
};
$("clearData").onclick=()=>{if(confirm("Clear subjects, plans, materials and progress?")){state.subjects=[];state.completed={};state.sessions=0;state.plan=[];state.materials=[];save();renderAll();}};

function restoreScheduleInputs(){
  const saved=JSON.parse(localStorage.getItem("smartstudy_schedule_inputs")||"null");
  if(!saved)return;
  if($("examDate") && saved.examDate)$("examDate").value=saved.examDate;
  if($("studyHours") && saved.studyHours)$("studyHours").value=saved.studyHours;
  if($("preferredTime") && saved.preferredTime)$("preferredTime").value=saved.preferredTime;
  if($("sessionDuration") && saved.sessionDuration)$("sessionDuration").value=saved.sessionDuration;
  if($("breakDuration") && saved.breakDuration!=="")$("breakDuration").value=saved.breakDuration;
}
["examDate","studyHours","preferredTime","sessionDuration","breakDuration"].forEach(id=>{
  const el=$(id);
  if(el)el.addEventListener("change",()=>{
    localStorage.setItem("smartstudy_schedule_inputs",JSON.stringify({
      examDate:$("examDate")?.value||"",
      studyHours:$("studyHours")?.value||"",
      preferredTime:$("preferredTime")?.value||"Morning",
      sessionDuration:$("sessionDuration")?.value||45,
      breakDuration:$("breakDuration")?.value||0
    }));
  });
});
restoreScheduleInputs();

function renderAll(){renderSubjects();renderDashboard();renderProgress();renderMaterials();renderFocus();}
setupAuth();
if(state.user)openApp();
loadAssistantHistory();
setAssistantStatus("AI Assistant · Online","online");


// Safety for local prototype buttons: none of the workspace controls should submit a form.
document.querySelectorAll("button:not([type])").forEach(b=>b.type="button");
