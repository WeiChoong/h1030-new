document.addEventListener('DOMContentLoaded', () => {

  // ======================
  // 🌤️ 天氣動畫初始化
  // ======================
  const weatherDataEl = document.getElementById("weather-data");
  const INIT_WEATHER = weatherDataEl ? JSON.parse(weatherDataEl.textContent) : null;

  console.log(INIT_WEATHER);

  function showWeatherAnimation() {
    if (!INIT_WEATHER || !INIT_WEATHER.anim) return;
    const overlay = document.getElementById("weather-overlay");
    const video = document.getElementById("weather-video");
    const textDiv = document.getElementById("weather-text");

    video.src = `/static/weather/${INIT_WEATHER.anim}`;
video.loop = true;  // ✅ 新增：讓影片在3秒內循環播放
overlay.style.display = "block";

// 開始播放
video.play().catch(()=>{});

// 三秒後停止播放並顯示按鈕
setTimeout(() => {
  video.pause();  // ✅ 到3秒就停止
  textDiv.style.display = "block";
}, 3000);


    document.getElementById("like-weather").onclick = () => {
      textDiv.innerHTML = '<span class="text-bg-box">太好了</span>';
      video.play();
      setTimeout(() => {
        const todayCell = document.querySelector(".day.today");
        if (todayCell) {
          const canvas = document.createElement("canvas");
          canvas.width = todayCell.offsetWidth;
          canvas.height = todayCell.offsetHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          todayCell.innerHTML = "";
          todayCell.appendChild(canvas);
        }
        overlay.style.display = "none";
      }, 3000);
    };

    // document.getElementById("like-weather").onclick = () => {
    //   textDiv.innerHTML = "太好了";
    //   const todayCell = document.querySelector(".day.today");
    //   if (todayCell) {
    //     const miniVideo = document.createElement("video");
    //     miniVideo.src = video.src;
    //     miniVideo.autoplay = true;
    //     miniVideo.muted = true;
    //     miniVideo.loop = true;
    //     miniVideo.style.width = "100%";
    //     miniVideo.style.height = "100%";
    //     miniVideo.style.objectFit = "contain";
    //     todayCell.appendChild(miniVideo);
    //   }
    //   overlay.style.display = "none";
    // };

    document.getElementById("dislike-weather").onclick = () => {
        textDiv.innerHTML = '<span class="text-bg-box">希望晴天娃娃能夠讓這天氣轉變</span>';

      video.src = "/static/weather/qingtianwawa.mp4";
      video.play();

      setTimeout(() => {
        const todayCell = document.querySelector(".day.today");
        if (todayCell) {
          const canvas = document.createElement("canvas");
          canvas.width = todayCell.offsetWidth;
          canvas.height = todayCell.offsetHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          todayCell.innerHTML = "";
          todayCell.appendChild(canvas);
        }
        overlay.style.display = "none";
      }, 5000);
    };
  }

  showWeatherAnimation();

  


  // ======================
  // ➕ 任務按鈕互動
  // ======================
  const fabMain = document.getElementById('fab-main');
  const fabSub = document.getElementById('fab-sub');
  const taskModal = document.getElementById('task-modal');
  let chosenCat = 'Other';

  fabMain.addEventListener('click', () => {
    fabSub.classList.toggle('hide');
  });

  document.querySelectorAll('.fab-sub .child').forEach(btn => {
    btn.addEventListener('click', () => {
      chosenCat = btn.getAttribute('data-cat');
      document.getElementById('chosen-cat').innerText = chosenCat;
      openModal();
    });
  });

  document.getElementById('save-task').addEventListener('click', async () => {
    const name = document.getElementById('task-name').value.trim();
    const deadline = document.getElementById('task-deadline').value;
    if (!name) { alert('請輸入任務名稱'); return; }
    const payload = { name, deadline, category: chosenCat };
    const resp = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (resp.ok) {
      await refreshTasks();
      closeModal();
    } else {
      alert('新增失敗');
    }
  });

  document.getElementById('cancel-task').addEventListener('click', closeModal);

  function openModal() {
    taskModal.classList.remove('hide');
  }

  function closeModal() {
    taskModal.classList.add('hide');
  }

  async function refreshTasks() {
  const res = await fetch('/api/tasks');
  if (!res.ok) return;
  const tasks = await res.json();

  // 1️⃣ 更新 Task List
  const ul = document.getElementById('task-list');
  ul.innerHTML = '';
  tasks.forEach(t => {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = t.id;
    li.innerHTML = `
      <input type="checkbox" class="delete-checkbox" style="display:none;">
      <span class="task-cat ${t.category.toLowerCase()}">${t.category}</span>
      <strong>${t.name}</strong>
      <div class="deadline">${t.deadline || ''}</div>
    `;
    ul.appendChild(li);
  });

  // 2️⃣ 清除舊的日曆任務
  document.querySelectorAll(".day .task-label").forEach(el => el.remove());

  // 3️⃣ 將任務加到對應日期格子
  tasks.forEach(t => {
    if (!t.deadline) return;
    const cell = document.querySelector(`.day[data-date="${t.deadline}"]`);
    if (cell) {
      const label = document.createElement("div");
      label.className = `task-label ${t.category.toLowerCase()}`;
      label.textContent = t.name;
      cell.appendChild(label);
    }
  });
}


  refreshTasks();

// ===============================
// 🗑 刪除任務功能
// ===============================
const deleteModeBtn = document.getElementById("delete-mode-btn");
const deleteControls = document.getElementById("delete-controls");
const confirmDelete = document.getElementById("confirm-delete");
const cancelDelete = document.getElementById("cancel-delete");
let deleteMode = false;

deleteModeBtn.addEventListener("click", () => {
  deleteMode = true;
  deleteControls.style.display = "block";
  document.querySelectorAll(".delete-checkbox").forEach(cb => cb.style.display = "inline-block");
});

cancelDelete.addEventListener("click", () => {
  deleteMode = false;
  deleteControls.style.display = "none";
  document.querySelectorAll(".delete-checkbox").forEach(cb => {
    cb.checked = false;
    cb.style.display = "none";
  });
});

confirmDelete.addEventListener("click", async () => {
  const selectedIds = Array.from(document.querySelectorAll(".delete-checkbox:checked"))
    .map(cb => cb.closest(".task-item").dataset.id);

  if (selectedIds.length === 0) {
    alert("請先選擇要刪除的任務！");
    return;
  }

  // 發送刪除請求
  for (const id of selectedIds) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  alert("刪除成功！");
  deleteMode = false;
  deleteControls.style.display = "none";
  await refreshTasks();
});


});
