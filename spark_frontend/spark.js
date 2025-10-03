// spark.js (final frontend)

// =========== Navigation & progress ===========
const formSteps = document.querySelectorAll(".form-step");
const nextBtns = document.querySelectorAll(".btn-next");
const prevBtns = document.querySelectorAll(".btn-prev");
const progressSteps = document.querySelectorAll(".progress-step");
let formStepsNum = 0;

nextBtns.forEach(btn => btn.addEventListener("click", () => {
  const currentStep = formSteps[formStepsNum];
  // validate inputs/selects inside current step
  const inputs = currentStep.querySelectorAll("input, select, textarea");
  for (const input of inputs) {
    // required inputs + pattern will be checked by browser
    if (!input.reportValidity()) {
      return; // stop, browser will show message
    }
  }

  // all valid → move forward
  if (formStepsNum < formSteps.length - 1) {
    formStepsNum++;
    updateFormSteps();
    updateProgressbar();
  }
}));

prevBtns.forEach(btn => btn.addEventListener("click", () => {
  if (formStepsNum > 0) {
    formStepsNum--;
    updateFormSteps();
    updateProgressbar();
  }
}));
function updateFormSteps() {
  formSteps.forEach(s => s.classList.remove("active"));
  formSteps[formStepsNum].classList.add("active");
}
function updateProgressbar() {
  progressSteps.forEach((step, idx) => {
    step.classList.toggle("active", idx <= formStepsNum);
  });

  const progress = document.querySelector(".progress");
  const activeSteps = document.querySelectorAll(".progress-step.active").length;
  const totalSteps = progressSteps.length;
  // avoid negative width if only 1 step
  const widthPercent = totalSteps > 1 ? ((activeSteps - 1) / (totalSteps - 1)) * 100 : 0;
  progress.style.width = `${widthPercent}%`;
}


// =========== Welcome ===========
function startForm() {
  document.getElementById("welcome-page").style.display = "none";
  document.getElementById("form-wrapper").style.display = "block";
}

// =========== Resume preview ===========
const resumeInput = document.getElementById("resume");
const fileName = document.getElementById("file-name");
if (resumeInput) {
  resumeInput.addEventListener("change", () => {
  if (resumeInput.files.length) {
    const file = resumeInput.files[0];
    if (file.size > 100 * 1024) {
      showPopup("❌ File Too Large", "Resume must be under 100KB.");
      resumeInput.value = ""; // clear invalid file
      fileName.textContent = "No file chosen";
      return;
    }
    fileName.textContent = file.name;
  } else {
    fileName.textContent = "No file chosen";
  }
});
}

// =========== Posts data ===========
const posts = {
  "Tech Team (Code)": [
    "Tech Head (Programming)",
    "Tech Head (Web)",
    "Tech Head (AI/ML)"
  ],
  "Tech Team (Circuit)": [
    "Tech Head (VLSI and Chip Design)",
    "Tech Head (Signal Processing & Communication Systems)",
    "Tech Head (Circuit Programming)",
    "Project Coordinator"
  ],
  "Tech Team (Robotics)": [
    "Tech Head (Embedded & IoT)",
    "Tech Head (Robotics)",
    "Tech Head (Software Integration)",
    "Tech Head (Automation)"
  ],
  "Event & Management Team": [
    "Event Team",
    "Competition Coordinator",
    "Workshop Coordinator",
    "PR Head",
    "Marketing & Promotion Head"
  ],
  "Creative & Support Team": [
    "Content Head",
    "Design & Media Lead",
    "Documentation & Records Head",
    "Logistics Head"
  ]
};

function populatePreferences(year) {
  const prefSelects = [document.getElementById("pref1"), document.getElementById("pref2"), document.getElementById("pref3")];
  prefSelects.forEach(select => {
    select.innerHTML = `<option value="">-- Select Post --</option>`;
    for (const team in posts) {
      const group = document.createElement("optgroup");
      group.label = team;
      posts[team].forEach(post => {
        let label;
        if (team === "Creative & Support Team") label = post;
        else if (post === "Project Coordinator") label = post;
        else label = (year === "2") ? `Assistant ${post}` : post;
        const opt = document.createElement("option");
        opt.value = label; opt.textContent = label;
        group.appendChild(opt);
      });
      select.appendChild(group);
    }
  });
  prefSelects.forEach(select => select.addEventListener("change", () => preventDuplicatePrefs(prefSelects)));
}

function preventDuplicatePrefs(prefSelects) {
  const selected = prefSelects.map(s => s.value);
  prefSelects.forEach(select => {
    Array.from(select.options).forEach(opt => {
      opt.disabled = (opt.value && selected.includes(opt.value) && opt.value !== select.value);
    });
  });
}

// branch population
document.getElementById("year").addEventListener("change", e => {
  const year = e.target.value;
  const branchSelect = document.getElementById("branch");
  branchSelect.innerHTML = `<option value="">-- Select Branch --</option>`;
  if (year === "2") {
    ["CSE Core", "CSE AI", "CSE DS", "CSE CS", "CSE CPS", "ECE", "IT"].forEach(b => {
      let opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      branchSelect.appendChild(opt);
    });
  }
  else if (year === "3") ["CSE","ECE","IT"].forEach(b => branchSelect.appendChild(new Option(b,b)));
  populatePreferences(year);
});

// =========== Popup functions ===========
const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popup-title");
const popupMessage = document.getElementById("popup-message");
const popupOk = document.getElementById("popup-ok");

function showPopup(title, message) {
  popupTitle.textContent = title;
  popupMessage.textContent = message;
  popup.style.display = "flex";
}
function closePopup() {
  popup.style.display = "none";
}
if (popupOk) popupOk.addEventListener("click", () => {
  closePopup();
  // if success page visible (title contains Success) show success page
  if (popupTitle.textContent.includes("Success")) {
    document.getElementById("form-wrapper").style.display = "none";
    document.getElementById("success-page").style.display = "block";
  } else {
    // if error, keep form visible so user can edit (option)
    document.getElementById("form-wrapper").style.display = "block";
  }
});

// =========== Submit handler ===========
document.getElementById("applicationForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // basic client-side validation: ensure resume file chosen
  const resumeFile = document.getElementById("resume").files[0];
  if (!resumeFile) {
    showPopup("❌ Submission Failed", "Please attach your resume before submitting.");
    return;
  }

  const formData = new FormData(e.target); // uses input name attributes

  try {
    const API_BASE = "https://spark-form.onrender.com";
    const response = await fetch(`${API_BASE}/submit`, {
      method: "POST",
      body: formData
    });

    let data;
    try { data = await response.json(); } catch { data = { success:false, message: "Unexpected server response." }; }

    if (response.ok && data.success) {
      showPopup("✅ Success", data.message || "Form submitted successfully!");
    } else {
      // show backend message
      showPopup("❌ Submission Failed", data.message || "Something went wrong!");
    }
  } catch (err) {
    console.error("Submit error:", err);
    showPopup("⚠️ Error", "Could not reach server. Try again later.");
  }
});

// =========== Background animation ===========
const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");
function resizeCanvas(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resizeCanvas(); window.addEventListener("resize", resizeCanvas);

let nodes = [];
const maxNodes = 80;
class Node {
  constructor(){ this.x = Math.random()*canvas.width; this.y = Math.random()*canvas.height; this.vx=(Math.random()-0.5)*0.6; this.vy=(Math.random()-0.5)*0.6; this.r = 2; }
  update(){ this.x+=this.vx; this.y+=this.vy; if(this.x<0||this.x>canvas.width) this.vx*=-1; if(this.y<0||this.y>canvas.height) this.vy*=-1; }
  draw(){ ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fillStyle="rgba(220,220,220,0.9)"; ctx.fill(); }
}
function init(){ nodes=[]; for(let i=0;i<maxNodes;i++) nodes.push(new Node()); }
function connectNodes(){
  for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
    const dx = nodes[i].x-nodes[j].x, dy = nodes[i].y-nodes[j].y, d = Math.sqrt(dx*dx+dy*dy);
    if(d<130){ ctx.beginPath(); ctx.strokeStyle="rgba(255,255,255,0.12)"; ctx.moveTo(nodes[i].x,nodes[i].y); ctx.lineTo(nodes[j].x,nodes[j].y); ctx.stroke(); }
  }
}
function animate(){
  ctx.fillStyle="#0b0c10"; ctx.fillRect(0,0,canvas.width,canvas.height);
  nodes.forEach(n=>{ n.update(); n.draw(); }); connectNodes(); requestAnimationFrame(animate);
}
init(); animate();
