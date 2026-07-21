// State Management
let projects = [];
let categories = ["전체", "해양 쓰레기", "재활용", "기후 변화", "멸종위기 동물", "숲 보호", "탄소중립", "자유주제"];
let searchQuery = "";
let currentProjectId = null;
let tourMode = false;
let tourInterval = null;
let tourIndex = 0;
let tourTimeLeft = 10; // seconds per slide
let theme = "light";
let activeTab = "gallery"; // gallery, upload, admin
let uploadedHtmlContent = ""; // Stores uploaded HTML string
let db = null;                // Firestore database handle (shared across all browsers/devices)

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  initData();
  setupEventListeners();
  applyTheme(theme);
  switchTab(activeTab);
  initFirebase();
});

// Connect to the shared Firebase database. Falls back to a setup banner
// if firebase-config.js still has placeholder keys, so it fails gracefully
// instead of showing a blank page or console error to the teacher.
function initFirebase() {
  const isPlaceholder = !window.firebaseConfig || window.firebaseConfig.apiKey === "YOUR_API_KEY_HERE";
  if (isPlaceholder) {
    document.getElementById("firebase-setup-banner").style.display = "block";
    return;
  }

  try {
    firebase.initializeApp(window.firebaseConfig);
    db = firebase.firestore();
    listenToProjects();
  } catch (err) {
    console.error("Firebase 초기화 실패:", err);
    document.getElementById("firebase-setup-banner").style.display = "block";
  }
}

// Real-time listener: keeps `projects` in sync with the shared database.
// Any student's like, comment, or upload appears for everyone automatically,
// in any browser, without needing a page refresh.
async function listenToProjects() {
  // Seed sample projects only the very first time this database is ever
  // used — checked via a marker doc, NOT by "is the list empty right now"
  // (an empty list can also mean the teacher intentionally deleted everything).
  try {
    const marker = await db.collection("projects").doc("_seed_marker").get();
    if (!marker.exists) {
      await seedDefaultProjects();
    }
  } catch (err) {
    console.error("초기 데이터 확인 실패:", err);
  }

  db.collection("projects").onSnapshot((snapshot) => {
    projects = snapshot.docs
      .filter(doc => doc.id !== "_seed_marker") // internal marker, not a real project
      .map(doc => ({ ...doc.data(), id: doc.id }));
    renderAll();

    // Keep an open modal's comments/likes in sync live too
    if (currentProjectId) {
      const p = projects.find(x => x.id === currentProjectId);
      if (p) {
        renderComments(p.comments || []);
        const likeCountEl = document.getElementById("modal-like-btn-count");
        if (likeCountEl) likeCountEl.textContent = p.likes;
      }
    }
  }, (err) => {
    console.error("Firestore 연결 오류:", err);
    alert("공유 데이터베이스에 연결할 수 없습니다. 인터넷 연결과 Firebase 설정을 확인해주세요.");
  });
}

// Populate the database with the sample projects the very first time it's used,
// and leave behind a marker doc so this never runs again — even if every
// project is later deleted by the teacher.
async function seedDefaultProjects() {
  const batch = db.batch();
  defaultProjects.forEach(p => {
    const ref = db.collection("projects").doc(p.id);
    batch.set(ref, p);
  });
  batch.set(db.collection("projects").doc("_seed_marker"), {
    seeded: true,
    seededAt: new Date().toISOString()
  });
  await batch.commit();
}

// Load and Seed Local Preferences (categories/theme only —
// project data now lives in the shared Firebase database)
function initData() {
  // Load Categories
  const storedCategories = localStorage.getItem("eco_exhibit_categories");
  if (storedCategories) {
    categories = JSON.parse(storedCategories);
  } else {
    localStorage.setItem("eco_exhibit_categories", JSON.stringify(categories));
  }

  // Load Theme
  theme = localStorage.getItem("eco_exhibit_theme") || "light";
}

// Setup Interactive Event Listeners
function setupEventListeners() {
  // Theme Toggle
  document.getElementById("theme-toggle").addEventListener("click", () => {
    theme = theme === "light" ? "dark" : "light";
    applyTheme(theme);
  });

  // Search Input
  document.getElementById("search-input").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderGallery();
  });

  // Tab Navigation Links
  document.getElementById("nav-gallery").addEventListener("click", (e) => { e.preventDefault(); switchTab("gallery"); });
  document.getElementById("nav-upload").addEventListener("click", (e) => { e.preventDefault(); switchTab("upload"); });
  document.getElementById("nav-admin").addEventListener("click", (e) => { e.preventDefault(); switchTab("admin"); });
  
  // Hero CTA Buttons
  document.getElementById("hero-btn-browse").addEventListener("click", () => switchTab("gallery"));
  document.getElementById("hero-btn-upload").addEventListener("click", () => switchTab("upload"));
  
  // Slide Show Exhibition Tour Button
  document.getElementById("btn-tour-start").addEventListener("click", startTourMode);

  // Close Modal
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeModal();
  });

  // Close QR Modal
  document.getElementById("qr-modal").addEventListener("click", (e) => {
    if (e.target.id === "qr-modal" || e.target.closest(".btn-tour-exit")) {
      document.getElementById("qr-modal").style.display = "none";
    }
  });

  // Drag and Drop Upload Handling
  const dropZone = document.getElementById("drag-drop-zone");
  const fileInput = document.getElementById("file-input");

  dropZone.addEventListener("click", () => fileInput.click());
  
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      handleFiles(fileInput.files);
    }
  });

  // Upload Form Submit
  document.getElementById("upload-form").addEventListener("submit", submitProject);

  // Comment Submit
  document.getElementById("comment-submit-btn").addEventListener("click", addComment);
}

// Render All Components
function renderAll() {
  renderGallery();
  renderAdminStats();
  renderAdminTable();
}

// Apply Theme
function applyTheme(newTheme) {
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("eco_exhibit_theme", newTheme);
  
  const toggleBtn = document.getElementById("theme-toggle");
  toggleBtn.innerHTML = newTheme === "light" ? "🌙" : "☀️";
}

// Switch Active View Tab
function switchTab(tabName) {
  activeTab = tabName;
  
  // Remove active from content sections
  document.getElementById("main-gallery-view").style.display = "none";
  document.getElementById("upload-view").classList.remove("active");
  document.getElementById("admin-view").classList.remove("active");
  
  // Remove active class from header links
  document.querySelectorAll(".nav-actions .btn-icon-label").forEach(btn => {
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-secondary");
  });

  if (tabName === "gallery") {
    document.getElementById("main-gallery-view").style.display = "block";
    document.getElementById("nav-gallery").classList.add("btn-primary");
    document.getElementById("nav-gallery").classList.remove("btn-secondary");
    renderGallery();
  } else if (tabName === "upload") {
    document.getElementById("upload-view").classList.add("active");
    document.getElementById("nav-upload").classList.add("btn-primary");
    document.getElementById("nav-upload").classList.remove("btn-secondary");
  } else if (tabName === "admin") {
    document.getElementById("admin-view").classList.add("active");
    document.getElementById("nav-admin").classList.add("btn-primary");
    document.getElementById("nav-admin").classList.remove("btn-secondary");
    renderAdminStats();
    renderAdminTable();
  }
}

// Render Project Gallery
function renderGallery() {
  const grid = document.getElementById("gallery-grid");
  grid.innerHTML = "";

  // Filter approved projects matching the search query
  const filtered = projects.filter(p => {
    if (!p.approved) return false;

    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--text-muted);">
        <span style="font-size: 3rem;">🔍</span>
        <h3 style="margin-top: 15px;">조건에 일치하는 작품이 없습니다.</h3>
        <p>다른 키워드로 검색해보세요!</p>
      </div>
    `;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    
    // Set random background gradients if not provided
    const bg = p.bgColor || "linear-gradient(135deg, #7EC8E3 0%, #2E8B57 100%)";
    const commentsCount = p.comments ? p.comments.length : 0;
    
    card.innerHTML = `
      <div class="card-thumbnail" style="background: ${bg};">
        <span class="card-category-badge">🌱 ${p.category}</span>
        <div class="card-thumbnail-fallback">${p.thumbnail || "📦"}</div>
        <iframe class="card-thumbnail-iframe" tabindex="-1" title="${escapeHtml(p.title)} 미리보기"></iframe>
        <div class="card-thumbnail-overlay"></div>
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(p.title)}</h3>
        <div class="card-student">🧑‍🎨 ${escapeHtml(p.student)}</div>
        <p class="card-description">${escapeHtml(p.description)}</p>
        <div class="card-stats">
          <div class="card-stat-item" onclick="likeProject('${p.id}', event)">
            ❤️ <span id="like-count-${p.id}">${p.likes}</span>
          </div>
          <div class="card-stat-item">
            💬 <span>${commentsCount}</span>
          </div>
          <div class="card-stat-item">
            👁️ <span>${p.views}</span>
          </div>
        </div>
      </div>
    `;

    // Wire up a live, auto-loading thumbnail preview of the student's HTML work.
    // A fallback emoji stays underneath and shows automatically if the preview
    // can't load (e.g. broken url), so the card never looks empty.
    setupCardThumbnail(card, p);

    // Click triggers Viewer Modal
    card.addEventListener("click", (e) => {
      // Prevent modal opening when clicking like button
      if (e.target.closest(".card-stat-item") && e.target.innerHTML.includes("❤️")) return;
      openProjectModal(p.id);
    });

    grid.appendChild(card);
  });
}

// Build the miniature live preview inside a gallery card thumbnail.
// Uses srcdoc (not blob: URLs) so it also works inside restrictive mobile
// in-app browsers (KakaoTalk, Naver, etc.) that block blob: iframe sources.
// Falls back to the emoji icon if loading fails or times out.
function setupCardThumbnail(card, project) {
  const frame = card.querySelector(".card-thumbnail-iframe");
  if (!frame) return;

  if (project.htmlContent) {
    frame.srcdoc = project.htmlContent;
  } else if (project.url) {
    frame.src = project.url;
  } else {
    frame.remove();
    return;
  }

  frame.addEventListener("load", () => {
    frame.classList.add("loaded");
  });

  frame.addEventListener("error", () => {
    frame.remove();
  });

  // Some restrictive browsers never fire load/error at all — they just hang.
  // Treat "still not loaded after 6s" as a failure so the fallback icon shows.
  setTimeout(() => {
    if (frame.isConnected && !frame.classList.contains("loaded")) {
      frame.remove();
    }
  }, 6000);
}

// Like Project Card Action
function likeProject(id, event) {
  if (event) event.stopPropagation();
  if (!db) return;

  db.collection("projects").doc(id).update({
    likes: firebase.firestore.FieldValue.increment(1)
  }).catch(err => {
    console.error("좋아요 저장 실패:", err);
  });
  // UI updates automatically for everyone via the real-time listener
}

// Open Viewer Modal & Frame
function openProjectModal(id) {
  currentProjectId = id;
  const p = projects.find(x => x.id === id);
  if (!p) return;

  // Increment views (shared across all browsers)
  if (db) {
    db.collection("projects").doc(id).update({
      views: firebase.firestore.FieldValue.increment(1)
    }).catch(err => console.error("조회수 저장 실패:", err));
  }

  // Build iframe content. srcdoc (not blob: URLs) also works inside
  // restrictive mobile in-app browsers (KakaoTalk, Naver, etc.) that
  // block blob: iframe sources.
  const iframe = document.getElementById("modal-frame");
  iframe.removeAttribute("srcdoc");
  iframe.src = "";
  if (p.htmlContent) {
    iframe.srcdoc = p.htmlContent;
  } else {
    iframe.src = p.url;
  }

  // Populate metadata
  document.getElementById("modal-project-title").textContent = p.title;
  document.getElementById("modal-project-student").textContent = `🧑‍🎨 제작 학생: ${p.student} | 카테고리: ${p.category}`;
  document.getElementById("modal-project-desc").textContent = p.description;
  document.getElementById("modal-like-btn-count").textContent = p.likes;
  
  // Set Likes button click
  const likeBtn = document.getElementById("modal-like-btn");
  likeBtn.onclick = () => likeProject(id);

  // Render comments
  renderComments(p.comments || []);

  // Update actions
  document.getElementById("modal-action-newtab").onclick = () => {
    if (p.htmlContent) {
      const newWin = window.open("", "_blank");
      newWin.document.open();
      newWin.document.write(p.htmlContent);
      newWin.document.close();
    } else {
      window.open(p.url, "_blank");
    }
  };
  
  // Fullscreen support
  document.getElementById("modal-action-fullscreen").onclick = () => {
    if (iframe.requestFullscreen) {
      iframe.requestFullscreen();
    } else if (iframe.webkitRequestFullscreen) { /* Safari */
      iframe.webkitRequestFullscreen();
    } else if (iframe.msRequestFullscreen) { /* IE11 */
      iframe.msRequestFullscreen();
    }
  };

  // QR Code generator setup
  document.getElementById("modal-action-qr").onclick = () => showQrCode(p);

  // Activate Modal
  document.getElementById("modal-overlay").classList.add("active");
  
  renderGallery(); // Update view count in main grid
  renderAdminStats();
}

// Close Modal
function closeModal() {
  document.getElementById("modal-overlay").classList.remove("active");
  const iframe = document.getElementById("modal-frame");
  iframe.removeAttribute("srcdoc");
  iframe.src = "";
  currentProjectId = null;
}

// Show QR Code Share Modal
function showQrCode(project) {
  const qrModal = document.getElementById("qr-modal");
  const qrTitle = document.getElementById("qr-project-title");
  const qrImg = document.getElementById("qr-image-code");
  
  qrTitle.textContent = project.title;
  
  // We can use api.qrserver.com to generate a real dynamic QR code pointing to the project local location
  const shareUrl = window.location.href.split("index.html")[0] + project.url;
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`;
  
  qrModal.style.display = "flex";
}

// Render Comments
function renderComments(commentsList) {
  const container = document.getElementById("modal-comments-list");
  container.innerHTML = "";

  if (commentsList.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px 0;">첫 피드백을 남기는 주인공이 되어보세요! 🌱</div>`;
    return;
  }

  // Sort comments by timestamp
  const sorted = [...commentsList].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  sorted.forEach(c => {
    const item = document.createElement("div");
    item.className = "feedback-item";
    
    const formattedDate = new Date(c.timestamp).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit"
    });

    item.innerHTML = `
      <div class="feedback-item-header">
        <span>${c.anonymous ? "🤫 익명 친구" : "👤 " + escapeHtml(c.author)}</span>
        <span class="feedback-item-meta">${formattedDate}</span>
      </div>
      <div class="feedback-item-content" id="comment-text-${c.id}">${escapeHtml(c.text)}</div>
      <div class="feedback-item-footer">
        <span style="font-size:0.75rem; color:var(--text-muted); cursor:pointer;" onclick="likeComment('${c.id}')">
          👍 추천 <span id="comment-likes-${c.id}">${c.likes || 0}</span>
        </span>
        <div class="feedback-item-actions">
          <button class="feedback-action-btn" onclick="editComment('${c.id}')">수정</button>
          <button class="feedback-action-btn delete" onclick="deleteComment('${c.id}')">삭제</button>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

// Add Feedback Comment
function addComment() {
  if (!currentProjectId) return;
  
  const textInput = document.getElementById("comment-input-text");
  const authorInput = document.getElementById("comment-input-name");
  const anonCheck = document.getElementById("comment-input-anon");

  const text = textInput.value.trim();
  const author = anonCheck.checked ? "익명" : authorInput.value.trim() || "학생";

  if (!text) {
    alert("피드백 내용을 입력해주세요!");
    return;
  }

  const p = projects.find(x => x.id === currentProjectId);
  if (p && db) {
    const newComment = {
      id: "c_" + Date.now(),
      author: author,
      text: text,
      timestamp: new Date().toISOString(),
      likes: 0,
      anonymous: anonCheck.checked
    };

    const updatedComments = [...(p.comments || []), newComment];

    db.collection("projects").doc(currentProjectId).update({ comments: updatedComments })
      .then(() => {
        // Reset Form
        textInput.value = "";
        if (!anonCheck.checked) authorInput.value = "";
        // The real-time listener re-renders comments for everyone, including this browser
      })
      .catch(err => {
        console.error("피드백 저장 실패:", err);
        alert("피드백 저장에 실패했습니다. 인터넷 연결을 확인해주세요.");
      });
  }
}

// Like Comment Action
function likeComment(commentId) {
  const p = projects.find(x => x.id === currentProjectId);
  if (p && p.comments && db) {
    const updatedComments = p.comments.map(c =>
      c.id === commentId ? { ...c, likes: (c.likes || 0) + 1 } : c
    );
    db.collection("projects").doc(currentProjectId).update({ comments: updatedComments })
      .catch(err => console.error("피드백 추천 저장 실패:", err));
  }
}

// Edit Comment Action
function editComment(commentId) {
  const p = projects.find(x => x.id === currentProjectId);
  if (!p || !p.comments || !db) return;
  const c = p.comments.find(x => x.id === commentId);
  if (!c) return;

  const newText = prompt("피드백 수정하기:", c.text);
  if (newText === null) return;
  
  const trimmed = newText.trim();
  if (trimmed === "") {
    alert("내용을 입력해야 합니다!");
    return;
  }

  const updatedComments = p.comments.map(x =>
    x.id === commentId ? { ...x, text: trimmed } : x
  );
  db.collection("projects").doc(currentProjectId).update({ comments: updatedComments })
    .catch(err => {
      console.error("피드백 수정 실패:", err);
      alert("피드백 수정에 실패했습니다. 인터넷 연결을 확인해주세요.");
    });
}

// Delete Comment Action
function deleteComment(commentId) {
  if (!confirm("정말 이 피드백을 삭제하시겠습니까?")) return;
  
  const p = projects.find(x => x.id === currentProjectId);
  if (p && p.comments && db) {
    const updatedComments = p.comments.filter(x => x.id !== commentId);
    db.collection("projects").doc(currentProjectId).update({ comments: updatedComments })
      .catch(err => {
        console.error("피드백 삭제 실패:", err);
        alert("피드백 삭제에 실패했습니다. 인터넷 연결을 확인해주세요.");
      });
  }
}

// Drag & Drop / File Upload Handler
function handleFiles(files) {
  const file = files[0];
  const fileName = file.name;
  const ext = fileName.split('.').pop().toLowerCase();
  
  if (ext !== 'html') {
    alert("현재 시뮬레이터 환경에서는 실제 동작을 확인하기 위해 단일 HTML (.html) 파일 업로드를 권장합니다. HTML 파일을 선택해 주세요!");
    return;
  }

  // Setup file reader to load HTML content
  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedHtmlContent = e.target.result;
    
    // Trigger Upload visual state
    const icon = document.getElementById("upload-icon-status");
    const pContainer = document.getElementById("upload-progress-container");
    const pFill = document.getElementById("upload-progress-fill");
    const dropZone = document.getElementById("drag-drop-zone");
    const successBadge = document.getElementById("upload-success-badge");

    icon.style.display = "none";
    successBadge.style.display = "none";
    pContainer.style.display = "block";
    pFill.style.width = "0%";

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      pFill.style.width = progress + "%";
      if (progress >= 100) {
        clearInterval(interval);
        pContainer.style.display = "none";
        successBadge.style.display = "block";
        document.getElementById("upload-file-name").textContent = `✓ 파일 로드 완료: ${fileName}`;
        
        // Seed upload form title/mock values based on filename
        const titleInput = document.getElementById("project-title-input");
        titleInput.value = fileName.replace(".html", "").replace(/[-_]/g, ' ');
        
        // Fire particle animations!
        fireConfetti(dropZone);
      }
    }, 100);
  };
  reader.readAsText(file);
}

// Submit Project Upload Form
function submitProject(e) {
  e.preventDefault();

  const title = document.getElementById("project-title-input").value.trim();
  const student = document.getElementById("project-student-input").value.trim();
  const description = document.getElementById("project-desc-input").value.trim();
  const category = "자유주제"; // Category picker removed from the upload form

  if (!title || !student || !description) {
    alert("모든 필드를 입력해 주세요!");
    return;
  }

  if (!db) {
    alert("공유 데이터베이스에 연결되지 않았습니다. 페이지를 새로고침하거나 Firebase 설정을 확인해주세요.");
    return;
  }

  // Generate random nice environmental gradients
  const gradients = [
    "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    "linear-gradient(135deg, #7EC8E3 0%, #2E8B57 100%)",
    "linear-gradient(135deg, #3a7bd5 0%, #3a6073 100%)",
    "linear-gradient(135deg, #ffd89b 0%, #19547b 100%)",
    "linear-gradient(135deg, #d3cbb8 0%, #6d6027 100%)",
    "linear-gradient(135deg, #1fa2ff 0%, #12d8fa 100%)"
  ];
  const emojis = ["🐋", "♻️", "🌱", "🐼", "🐻‍❄️", "🌳", "🌊", "🦁", "🍎", "🏠"];

  const newId = "proj_" + Date.now();
  const newProj = {
    title: title,
    student: student,
    description: description,
    category: category,
    likes: 0,
    views: 0,
    comments: [],
    url: "", // No folder URL since HTML is stored directly in the database
    htmlContent: uploadedHtmlContent,
    thumbnail: emojis[Math.floor(Math.random() * emojis.length)],
    bgColor: gradients[Math.floor(Math.random() * gradients.length)],
    approved: true, // Auto approve so it reflects in the gallery instantly!
    timestamp: new Date().toISOString()
  };

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  db.collection("projects").doc(newId).set(newProj)
    .then(() => {
      // Reset states
      uploadedHtmlContent = "";

      // Reset form & Drag and drop
      document.getElementById("upload-form").reset();
      document.getElementById("upload-icon-status").style.display = "block";
      document.getElementById("upload-success-badge").style.display = "none";
      document.getElementById("upload-file-name").textContent = "지정된 파일을 여기에 끌어다 놓으세요";

      alert("작품이 등록되었습니다! 전시관에 즉시 반영되었습니다.");
      switchTab("gallery");
    })
    .catch(err => {
      console.error("작품 업로드 실패:", err);
      alert("작품 업로드에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.");
    })
    .finally(() => {
      if (submitBtn) submitBtn.disabled = false;
    });
}

// Render Admin Statistics & Visual Chart
function renderAdminStats() {
  const totalProj = projects.length;
  const totalLikes = projects.reduce((acc, p) => acc + p.likes, 0);
  const totalViews = projects.reduce((acc, p) => acc + p.views, 0);
  
  let totalComments = 0;
  projects.forEach(p => {
    if (p.comments) totalComments += p.comments.length;
  });

  document.getElementById("admin-stat-projects").textContent = totalProj;
  document.getElementById("admin-stat-likes").textContent = totalLikes;
  document.getElementById("admin-stat-views").textContent = totalViews;
  document.getElementById("admin-stat-comments").textContent = totalComments;

  // Render SVG/CSS flex Chart of categories
  const chartContainer = document.getElementById("admin-chart-categories");
  chartContainer.innerHTML = "";

  categories.forEach(cat => {
    if (cat === "전체") return;
    const catProjects = projects.filter(p => p.category === cat);
    const percentage = totalProj > 0 ? (catProjects.length / totalProj) * 100 : 0;

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "15px";
    row.style.marginBottom = "12px";

    row.innerHTML = `
      <span style="width:100px; font-size:0.8rem; font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${cat}</span>
      <div style="flex:1; height:12px; background:rgba(0,0,0,0.05); border-radius:6px; overflow:hidden; position:relative;">
        <div style="width:${percentage}%; height:100%; background:var(--primary); border-radius:6px; transition:width 0.5s;"></div>
      </div>
      <span style="width:30px; text-align:right; font-size:0.8rem; font-weight:bold;">${catProjects.length}</span>
    `;
    chartContainer.appendChild(row);
  });
}

// Render Admin Panel Control Table
function renderAdminTable() {
  const tbody = document.getElementById("admin-projects-tbody");
  tbody.innerHTML = "";

  if (projects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">등록된 작품이 없습니다.</td></tr>`;
    return;
  }

  projects.forEach(p => {
    const tr = document.createElement("tr");
    
    const formattedDate = new Date(p.timestamp || Date.now()).toLocaleDateString("ko-KR", {
      month: "2-digit",
      day: "2-digit"
    });

    tr.innerHTML = `
      <td><strong>${escapeHtml(p.title)}</strong></td>
      <td>${escapeHtml(p.student)}</td>
      <td><span style="background:rgba(46,139,87,0.1); color:var(--primary); padding:3px 8px; border-radius:10px; font-size:0.75rem;">${p.category}</span></td>
      <td>${formattedDate}</td>
      <td>
        <span class="badge-pill ${p.approved ? "badge-approved" : "badge-pending"}">
          ${p.approved ? "승인완료" : "승인대기"}
        </span>
      </td>
      <td>
        <button class="feedback-action-btn" onclick="toggleProjectApproval('${p.id}')">
          ${p.approved ? "승인취소" : "승인하기"}
        </button>
        <button class="feedback-action-btn delete" onclick="deleteProjectAdmin('${p.id}')" style="margin-left:8px;">
          삭제
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Toggle Approval State in Admin Panel
function toggleProjectApproval(id) {
  const p = projects.find(x => x.id === id);
  if (p && db) {
    db.collection("projects").doc(id).update({ approved: !p.approved })
      .catch(err => console.error("승인 상태 저장 실패:", err));
  }
}

// Delete Project Admin Panel
function deleteProjectAdmin(id) {
  if (!confirm("정말 이 작품을 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)")) return;
  if (!db) return;

  db.collection("projects").doc(id).delete()
    .catch(err => {
      console.error("작품 삭제 실패:", err);
      alert("작품 삭제에 실패했습니다. 인터넷 연결을 확인해주세요.");
    });
}

// Interactive museum slideshow exhibition kiosk tour
function startTourMode() {
  const tourList = projects.filter(p => p.approved);
  if (tourList.length === 0) {
    alert("승인 완료된 작품이 없습니다!");
    return;
  }

  tourMode = true;
  tourIndex = 0;
  
  const tourOverlay = document.getElementById("tour-overlay");
  tourOverlay.style.display = "flex";

  // Setup Exit Button
  document.getElementById("btn-tour-exit").onclick = stopTourMode;
  
  // Next/Prev click bindings
  document.getElementById("btn-tour-prev").onclick = () => navigateTour(-1);
  document.getElementById("btn-tour-next").onclick = () => navigateTour(1);

  loadTourProject();
}

function loadTourProject() {
  const tourList = projects.filter(p => p.approved);
  const p = tourList[tourIndex];
  if (!p) return;

  // Frame content — srcdoc also works inside restrictive in-app browsers
  const iframe = document.getElementById("tour-frame");
  iframe.removeAttribute("srcdoc");
  iframe.src = "";
  if (p.htmlContent) {
    iframe.srcdoc = p.htmlContent;
  } else {
    iframe.src = p.url;
  }
  
  // Title & Student Details
  document.getElementById("tour-title").textContent = p.title;
  document.getElementById("tour-student").textContent = `🧑‍🎨 제작 학생: ${p.student} | 카테고리: ${p.category}`;
  document.getElementById("tour-desc").textContent = p.description;

  // Reset Progress timer
  tourTimeLeft = 10;
  const pBar = document.getElementById("tour-progress-bar");
  pBar.style.width = "0%";

  clearInterval(tourInterval);
  tourInterval = setInterval(() => {
    tourTimeLeft--;
    
    // Animate progress bar fill
    const percent = ((10 - tourTimeLeft) / 10) * 100;
    pBar.style.width = percent + "%";

    if (tourTimeLeft <= 0) {
      navigateTour(1); // Auto cycle to next
    }
  }, 1000);
}

function navigateTour(dir) {
  const tourList = projects.filter(p => p.approved);
  tourIndex = (tourIndex + dir + tourList.length) % tourList.length;
  loadTourProject();
}

function stopTourMode() {
  tourMode = false;
  clearInterval(tourInterval);
  document.getElementById("tour-overlay").style.display = "none";
  const iframe = document.getElementById("tour-frame");
  iframe.removeAttribute("srcdoc");
  iframe.src = "";
}

// Particle/Confetti physics simulator for successful upload state
function fireConfetti(container) {
  const colors = ["#2E8B57", "#7EC8E3", "#ffa000", "#e91e63", "#9c27b0"];
  const rect = container.getBoundingClientRect();

  for (let i = 0; i < 40; i++) {
    const particle = document.createElement("div");
    particle.style.position = "absolute";
    particle.style.width = Math.random() * 8 + 6 + "px";
    particle.style.height = Math.random() * 8 + 6 + "px";
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.borderRadius = "50%";
    particle.style.pointerEvents = "none";
    particle.style.zIndex = "100";

    // Set initial position at center of box
    particle.style.left = (rect.width / 2) + "px";
    particle.style.top = (rect.height / 2) + "px";

    container.appendChild(particle);

    // Physics vector values
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 8 + 4;
    let x = rect.width / 2;
    let y = rect.height / 2;
    let vx = Math.cos(angle) * velocity;
    let vy = Math.sin(angle) * velocity - 3; // Initial upward force
    let opacity = 1;

    const anim = setInterval(() => {
      x += vx;
      y += vy;
      vy += 0.2; // Gravity
      vx *= 0.98; // Friction
      opacity -= 0.02;

      particle.style.left = x + "px";
      particle.style.top = y + "px";
      particle.style.opacity = opacity;

      if (opacity <= 0) {
        clearInterval(anim);
        particle.remove();
      }
    }, 20);
  }
}

// Clean Input Helper
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}
