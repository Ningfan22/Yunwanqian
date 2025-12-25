const DOUBAO_API_KEY = "0db191df-893c-43ec-9e6d-c6c2b08ccae2";
const DOUBAO_BASE = "https://ark.cn-beijing.volces.com/api/v3";
const CORS_PROXY = "https://cors.isomorphic-git.org/";
const DOUBAO_CHAT_MODEL = "seed-1-6-flash";
const DOUBAO_TRYON_MODEL = "doubao-seedream-4-5";
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=200&q=80";

const withCorsProxy = (url) => `${CORS_PROXY}${url}`;

const resolveModel = (key, fallback) => localStorage.getItem(key) || fallback;

const fixedPrompt = `你是“长沙韵万千”高端湘派刺绣旗袍的金牌客服。
回答要求：
1) 语气优雅、克制、专业且温暖；
2) 必须体现定制流程、刺绣工艺、材质选择、预约体验与会员礼遇；
3) 若问题不明确，先提出 1 个澄清问题再给建议；
4) 输出严格为 JSON 字符串：{"answer":"...", "confidence":0-1, "follow_up":"..."}；
5) 如无法回答，请礼貌建议联系专属顾问并给出线下预约方式。`;

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");

const appendMessage = (role, text, meta = "") => {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = meta ? `<span class="meta">${meta}</span>${text}` : text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const showLoading = (text = "正在为您处理...") => {
  const overlay = document.getElementById("loadingOverlay");
  document.getElementById("loadingText").textContent = text;
  overlay.classList.add("active");
};

const hideLoading = () => {
  document.getElementById("loadingOverlay").classList.remove("active");
};

const callSeedModel = async (question) => {
  const payload = {
    model: resolveModel("yunwanqian_chat_model", DOUBAO_CHAT_MODEL),
    messages: [
      { role: "system", content: fixedPrompt },
      { role: "user", content: question },
    ],
    temperature: 0.4,
  };

  try {
    const response = await fetch(withCorsProxy(`${DOUBAO_BASE}/chat/completions`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DOUBAO_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`Seed 响应异常：${response.status} ${raw || ""}`.trim());
    }
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (parseErr) {
      console.warn("RAG 响应解析为文本回退", parseErr, raw);
    }
    const content = data.choices?.[0]?.message?.content || raw;
    if (!content) {
      throw new Error("Seed API 响应为空");
    }
    try {
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      if (parsed?.answer) return parsed;
      return { answer: String(content), follow_up: "是否需要预约量体？" };
    } catch (parseContentErr) {
      console.warn("RAG 内容解析回退", parseContentErr, content);
      return { answer: String(content), follow_up: "是否需要预约量体？" };
    }
  } catch (error) {
    console.error("RAG 调用失败", error);
    showToast("AI 对话失败", `豆包接口响应异常，请稍后重试。（错误码：RAG-001）`);
    return {
      answer: "抱歉，AI 客服暂时未能连接成功，建议直接预约人工顾问。",
      follow_up: "是否需要我为您安排线下量体或预约咨询？",
    };
  }
};

const showToast = (title, message) => {
  const toast = document.getElementById("toast");
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastMessage").textContent = message;
  toast.classList.add("active");
};

const closeToast = () => {
  document.getElementById("toast").classList.remove("active");
};

const updateAvatars = (avatar) => {
  const safeAvatar = avatar || DEFAULT_AVATAR;
  document.getElementById("userAvatar").src = safeAvatar;
  document.getElementById("panelAvatar").src = safeAvatar;
};

const updateMemberCard = (user) => {
  document.getElementById("memberName").textContent = `会员：${user.name}`;
  document.getElementById("memberTier").textContent = `等级：${user.level}`;
  document.getElementById("memberId").textContent = user.id;
  document.getElementById("memberPoints").textContent = user.points;
  document.getElementById("userName").textContent = user.name;
  document.getElementById("panelName").textContent = user.name;
  document.getElementById("panelLevel").textContent = `等级：${user.level}`;
  document.getElementById("panelMemberName").textContent = `会员：${user.name}`;
  document.getElementById("panelMemberTier").textContent = `等级：${user.level}`;
  document.getElementById("panelMemberId").textContent = user.id;
  document.getElementById("panelMemberPoints").textContent = user.points;
  updateAvatars(user.avatar);
};

const setMemberView = (user) => {
  updateMemberCard(user);
  document.getElementById("memberCard").classList.remove("hidden");
  document.getElementById("loginPanel").classList.add("hidden");
  document.getElementById("authButtons").classList.add("hidden");
  document.getElementById("userBadge").classList.remove("hidden");
};

const clearMemberView = () => {
  document.getElementById("memberCard").classList.add("hidden");
  document.getElementById("loginPanel").classList.remove("hidden");
  document.getElementById("authButtons").classList.remove("hidden");
  document.getElementById("userBadge").classList.add("hidden");
  updateAvatars(DEFAULT_AVATAR);
};

const persistMember = (user) => {
  localStorage.setItem("yunwanqian_member", JSON.stringify(user));
  setMemberView(user);
};

const loadUserDB = () => {
  try {
    return JSON.parse(localStorage.getItem("yunwanqian_user_db") || "[]");
  } catch (error) {
    return [];
  }
};

const saveUserDB = (list) => localStorage.setItem("yunwanqian_user_db", JSON.stringify(list));

const generateMemberId = () => {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `YWQ-${suffix}-${Date.now().toString().slice(-4)}`;
};

const buildUser = (account, name = "尊贵会员") => ({
  account,
  name: name || account || "尊贵会员",
  level: "星耀 · 尊享",
  points: 1888,
  id: generateMemberId(),
  avatar: DEFAULT_AVATAR,
});

const initAuth = () => {
  const authModal = document.getElementById("authModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalNameField = document.getElementById("modalNameField");
  const userPanel = document.getElementById("userPanel");

  const openModal = (type) => {
    modalTitle.textContent = type === "register" ? "会员注册" : "会员登录";
    modalNameField.classList.toggle("hidden", type !== "register");
    authModal.classList.add("active");
  };

  document.getElementById("loginBtn").addEventListener("click", () => openModal("login"));
  document.getElementById("registerBtn").addEventListener("click", () => openModal("register"));
  document.getElementById("modalClose").addEventListener("click", () => authModal.classList.remove("active"));

  document.getElementById("inlineLogin").addEventListener("click", () => {
    showLoading("正在登录...");
    const account = document.getElementById("loginAccount").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    if (!account || !password) {
      showToast("登录失败", "请输入账号与密码。（错误码：AUTH-LOGIN-001）");
      hideLoading();
      return;
    }
    const db = loadUserDB();
    const stored = db.find((item) => item.account === account);
    const user = stored || buildUser(account, account);
    persistMember(user);
    showToast("登录成功", stored ? `欢迎回来，${user.name}。` : "已使用本地凭证登录。");
    hideLoading();
  });

  document.getElementById("modalSubmit").addEventListener("click", () => {
    showLoading("正在提交...");
    const name = document.getElementById("modalName").value.trim();
    const account = document.getElementById("modalAccount").value.trim();
    const password = document.getElementById("modalPassword").value.trim();
    if (!account || !password) {
      showToast("操作失败", "账号与密码不能为空。（错误码：AUTH-MODAL-001）");
      hideLoading();
      return;
    }

    const db = loadUserDB();
    const isRegister = modalTitle.textContent === "会员注册";

    if (!isRegister) {
      const stored = db.find((item) => item.account === account && item.password === password);
      const user = stored || buildUser(account, account);
      persistMember(user);
      authModal.classList.remove("active");
      showToast("登录成功", stored ? `欢迎回来，${user.name}。` : "已使用本地凭证登录。");
      hideLoading();
      return;
    }

    if (!name) {
      showToast("注册失败", "请输入会员昵称。（错误码：AUTH-REG-001）");
      hideLoading();
      return;
    }

    const exists = db.find((item) => item.account === account);
    const user = exists ? { ...exists, name, password } : { ...buildUser(account, name), password };
    const nextDB = exists
      ? db.map((item) => (item.account === account ? user : item))
      : [...db, user];
    saveUserDB(nextDB);
    persistMember(user);
    authModal.classList.remove("active");
    showToast("注册成功", `欢迎加入，${user.name}。`);
    hideLoading();
  });

  document.getElementById("userBadge").addEventListener("click", () => {
    userPanel.classList.add("active");
  });

  document.getElementById("closeUserPanel").addEventListener("click", () => {
    userPanel.classList.remove("active");
  });

  document.getElementById("updateNameBtn").addEventListener("click", () => {
    const stored = localStorage.getItem("yunwanqian_member");
    const name = document.getElementById("panelNameInput").value.trim();
    if (!stored || !name) {
      showToast("修改失败", "请输入新的昵称。（错误码：AUTH-NAME-001）");
      return;
    }
    const user = JSON.parse(stored);
    const updated = { ...user, name };
    persistMember(updated);
    document.getElementById("panelNameInput").value = "";
    showToast("修改成功", "昵称已更新。");
  });

  document.getElementById("contactSupport").addEventListener("click", () => {
    showToast("联系客服", "请致电 400-876-8899 或在线留言。（错误码：SUPPORT-000）");
  });

  document.getElementById("goRegister").addEventListener("click", () => {
    openModal("register");
  });
};

const initChat = () => {
  document.getElementById("sendBtn").addEventListener("click", async () => {
    const question = chatInput.value.trim();
    if (!question) return;
    appendMessage("user", question, "您");
    chatInput.value = "";

    showLoading("AI 客服正在回复...");
    appendMessage("assistant", "正在检索知识库并生成回答...", "AI");
    const response = await callSeedModel(question);
    chatMessages.lastChild.remove();
    appendMessage("assistant", `回答：${response.answer}<br/>追问：${response.follow_up || "是否需要预约量体？"}`);
    hideLoading();
  });
};

const initTryOn = () => {
  const tryonUpload = document.getElementById("tryonUpload");
  const tryonCamera = document.getElementById("tryonCamera");
  const tryonCanvas = document.getElementById("tryonCanvas");
  const tryonPlaceholder = document.querySelector(".tryon-placeholder");
  const uploadPreview = document.getElementById("uploadPreview");
  const garmentGallery = document.getElementById("garmentGallery");
  if (!tryonUpload || !tryonCamera || !tryonCanvas || !garmentGallery || !uploadPreview || !tryonPlaceholder) {
    showToast("试穿提示", "试穿模块加载失败。（错误码：TRYON-004）");
    return;
  }
  let selectedGarment = garmentGallery.querySelector(".gallery-item.selected")?.dataset.image;
  let userImageData = "";

  const tryonPrompt = `生成一张高清实拍风格照片：将“图一”的人物穿上“图二”的服饰，保持人物姿态与光影自然一致，服饰质感与刺绣细节清晰可见，整体风格高端、优雅，人物肤色轻微美化但保持真实质感，背景简洁干净。`;

  const fetchImageAsDataUrl = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  const toBase64 = (dataUrl) => (dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl);

  const drawTryon = (imageSrc, style = "AI 试穿") => {
    const ctx = tryonCanvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      tryonCanvas.width = img.width;
      tryonCanvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
      ctx.fillRect(0, img.height - 90, img.width, 90);
      ctx.fillStyle = "#f5f2ec";
      ctx.font = "26px 'Noto Serif SC'";
      ctx.fillText(`${style}`, 28, img.height - 40);
    };
    img.src = imageSrc;
  };

  const runTryOn = async () => {
    if (!selectedGarment) {
      showToast("试穿失败", "请选择一件服饰。（错误码：TRYON-001）");
      return;
    }
    const userImage = userImageData;
    if (!userImage) {
      showToast("试穿失败", "请先上传或拍摄照片。（错误码：TRYON-003）");
      return;
    }
    showLoading("AI 试穿生成中...");
    try {
      const garmentData = await fetchImageAsDataUrl(selectedGarment);
      const response = await fetch(withCorsProxy(`${DOUBAO_BASE}/images/generations`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DOUBAO_API_KEY}`,
        },
        body: JSON.stringify({
          model: resolveModel("yunwanqian_tryon_model", DOUBAO_TRYON_MODEL),
          prompt: tryonPrompt,
          image: [toBase64(userImage), toBase64(garmentData)],
        }),
      });
      const raw = await response.text();
      if (!response.ok) {
        throw new Error(`Seedream 响应异常：${response.status} ${raw || ""}`.trim());
      }
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (parseErr) {
        console.warn("Seedream 响应解析为文本回退", parseErr, raw);
      }
      const resultUrl = data.data?.[0]?.url;
      if (resultUrl) {
        drawTryon(resultUrl, "AI 试穿 · Seedream 输出");
        tryonPlaceholder.classList.add("hidden");
        showToast("试穿完成", "已生成 AI 试穿效果。");
        return;
      }
      throw new Error("Seedream 响应为空");
    } catch (error) {
      console.error("试穿失败", error);
      showToast("试穿失败", "AI 接口暂不可用，请稍后重试。（错误码：TRYON-002）");
    } finally {
      hideLoading();
    }
  };

  document.getElementById("runTryon").addEventListener("click", runTryOn);

  tryonUpload.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      userImageData = reader.result;
      uploadPreview.innerHTML = `<div class="upload-thumb"><img src="${userImageData}" alt="已上传" /></div>`;
      uploadPreview.classList.remove("hidden");
      tryonPlaceholder.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  tryonCamera.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      userImageData = reader.result;
      uploadPreview.innerHTML = `<div class="upload-thumb"><img src="${userImageData}" alt="已拍摄" /></div>`;
      uploadPreview.classList.remove("hidden");
      tryonPlaceholder.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  garmentGallery.querySelectorAll(".gallery-item").forEach((item) => {
    item.addEventListener("click", () => {
      garmentGallery.querySelectorAll(".gallery-item").forEach((btn) => btn.classList.remove("selected"));
      item.classList.add("selected");
      selectedGarment = item.dataset.image;
    });
  });
};

const initAvatarUpload = () => {
  const avatarInput = document.getElementById("avatarInput");
  const userAvatar = document.getElementById("userAvatar");
  const panelAvatar = document.getElementById("panelAvatar");

  const handleAvatar = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const stored = localStorage.getItem("yunwanqian_member");
      if (!stored) return;
      const user = JSON.parse(stored);
      const updated = { ...user, avatar: reader.result };
      persistMember(updated);
      showToast("头像已更新", "已应用新头像，将自动裁剪为圆形。");
    };
    reader.readAsDataURL(file);
  };

  [userAvatar, panelAvatar].forEach((node) => {
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      avatarInput.click();
    });
  });

  avatarInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    handleAvatar(file);
    event.target.value = "";
  });
};

const initHeaderScroll = () => {
  let lastScrollY = window.scrollY;
  window.addEventListener("scroll", () => {
    const currentScroll = window.scrollY;
    const header = document.querySelector("header");
    if (currentScroll > lastScrollY && currentScroll > 120) {
      header.classList.add("hidden");
    } else {
      header.classList.remove("hidden");
    }
    lastScrollY = currentScroll;
  });
};

const initScrollButtons = () => {
  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.scroll);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
};

const initMemberSparkle = () => {
  const card = document.getElementById("memberCard");
  const limit = 4;
  const interval = 60 * 1000;
  let triggers = [];

  card.addEventListener("mouseenter", () => {
    const now = Date.now();
    triggers = triggers.filter((time) => now - time < interval);
    if (triggers.length >= limit) {
      return;
    }
    triggers.push(now);
    card.classList.remove("sparkle");
    void card.offsetWidth;
    card.classList.add("sparkle");
  });
};


const initToast = () => {
  const toast = document.getElementById("toast");
  const toastCard = toast.querySelector(".toast-card");
  document.getElementById("toastClose").addEventListener("click", closeToast);
  toast.addEventListener("click", (event) => {
    if (event.target === toast) {
      closeToast();
    }
  });
  toastCard.addEventListener("click", (event) => event.stopPropagation());
};

const initMemberState = () => {
  const stored = localStorage.getItem("yunwanqian_member");
  if (stored) {
    const user = JSON.parse(stored);
    setMemberView(user);
    document.getElementById("loginAccount").value = user.account || "";
  } else {
    clearMemberView();
  }
};

initHeaderScroll();
initScrollButtons();
initAuth();
initToast();
initChat();
initTryOn();
initMemberState();
initMemberSparkle();
initAvatarUpload();
appendMessage("assistant", "您好，我是韵万千 AI 客服，请问今天想了解哪类旗袍定制服务？", "AI");
