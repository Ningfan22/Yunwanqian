const knowledgeBase = [
  {
    title: "定制周期",
    content: "高端定制旗袍从量体到交付通常需要 15-25 天，包含 2-3 次试穿调整。",
  },
  {
    title: "湘派刺绣特色",
    content: "湘派刺绣以丝线光泽与立体针脚著称，擅长花鸟、祥云、水波纹样。",
  },
  {
    title: "会员权益",
    content: "会员可享受专属顾问、AI 形象搭配、生日礼盒及定制积分返还。",
  },
  {
    title: "AI 试穿",
    content: "AI 试穿可在 2 分钟内生成 3 套风格方案，支持横屏与竖屏输出。",
  },
];

const fixedPrompt = `你是长沙韵万千的AI客服，回答应优雅、专业、精炼。
必须输出 JSON 格式：{"answer":"...","confidence":0-1,"citations":["知识库标题"],"follow_up":"..."}
回答需结合提供的知识库 context，不得编造。`;

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");

const appendMessage = (role, text, meta = "") => {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = meta ? `<span class="meta">${meta}</span>${text}` : text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const findContext = (question) => {
  const keywords = question.split(/\s+/).filter(Boolean);
  const hits = knowledgeBase.filter((item) =>
    keywords.some((word) => item.title.includes(word) || item.content.includes(word))
  );
  return hits.length ? hits : knowledgeBase.slice(0, 2);
};

const simulateSeedResponse = (question, context) => {
  const summary = context.map((item) => item.content).join(" ");
  return {
    answer: `${summary} 如果需要更精准的建议，可告诉我您的场景与预算。`,
    confidence: 0.78,
    citations: context.map((item) => item.title),
    follow_up: "是否需要为您安排线下量体或获取专属配色方案？",
  };
};

const callSeedModel = async (question, context) => {
  const payload = {
    model: "seed-1-6-flash",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: `${fixedPrompt}\n\ncontext:${JSON.stringify(context)}` },
      { role: "user", content: question },
    ],
    temperature: 0.4,
  };

  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error("Seed API 请求失败");
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    return JSON.parse(content);
  } catch (error) {
    return simulateSeedResponse(question, context);
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

const updateMemberCard = (user) => {
  document.getElementById("memberName").textContent = `会员：${user.name}`;
  document.getElementById("memberTier").textContent = `等级：${user.level}`;
  document.getElementById("memberId").textContent = user.id;
  document.getElementById("memberPoints").textContent = user.points;
};

const setMemberView = (user) => {
  updateMemberCard(user);
  document.getElementById("memberCard").classList.remove("hidden");
  document.getElementById("loginPanel").classList.add("hidden");
};

const clearMemberView = () => {
  document.getElementById("memberCard").classList.add("hidden");
  document.getElementById("loginPanel").classList.remove("hidden");
};

const persistMember = (user) => {
  localStorage.setItem("yunwanqian_member", JSON.stringify(user));
  setMemberView(user);
};

const registerAccount = async (account, password, name) => {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, password, name }),
  });
  return response.json();
};

const loginAccount = async (account, password) => {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, password }),
  });
  return response.json();
};

const initAuth = () => {
  const authModal = document.getElementById("authModal");
  const modalTitle = document.getElementById("modalTitle");

  const openModal = (type) => {
    modalTitle.textContent = type === "register" ? "会员注册" : "会员登录";
    authModal.classList.add("active");
  };

  document.getElementById("loginBtn").addEventListener("click", () => openModal("login"));
  document.getElementById("registerBtn").addEventListener("click", () => openModal("register"));
  document.getElementById("modalClose").addEventListener("click", () => authModal.classList.remove("active"));

  document.getElementById("inlineLogin").addEventListener("click", async () => {
    const account = document.getElementById("loginAccount").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    if (!account || !password) {
      showToast("登录失败", "请输入账号与密码。");
      return;
    }
    const result = await loginAccount(account, password);
    if (!result.ok) {
      showToast("登录失败", result.message || "账号或密码错误。");
      return;
    }
    persistMember(result.user);
    showToast("登录成功", `欢迎回来，${result.user.name}。`);
  });

  document.getElementById("inlineRegister").addEventListener("click", async () => {
    const account = document.getElementById("loginAccount").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const name = document.getElementById("loginName").value.trim();
    if (!account || !password || !name) {
      showToast("注册失败", "请输入账号、密码与会员昵称。");
      return;
    }
    const result = await registerAccount(account, password, name);
    if (!result.ok) {
      showToast("注册失败", result.message || "注册未成功。");
      return;
    }
    persistMember(result.user);
    showToast("注册成功", `欢迎加入，${result.user.name}。`);
  });

  document.getElementById("modalSubmit").addEventListener("click", async () => {
    const name = document.getElementById("modalName").value.trim();
    const account = document.getElementById("modalAccount").value.trim();
    const password = document.getElementById("modalPassword").value.trim();
    if (!account || !password) {
      showToast("操作失败", "账号与密码不能为空。");
      return;
    }
    const result =
      modalTitle.textContent === "会员注册"
        ? await registerAccount(account, password, name || "贵宾")
        : await loginAccount(account, password);
    if (!result.ok) {
      showToast("操作失败", result.message || "请检查填写内容。");
      return;
    }
    persistMember(result.user);
    authModal.classList.remove("active");
    showToast("操作成功", `欢迎您，${result.user.name}。`);
  });
};

const initChat = () => {
  document.getElementById("sendBtn").addEventListener("click", async () => {
    const question = chatInput.value.trim();
    if (!question) return;
    appendMessage("user", question, "您");
    chatInput.value = "";

    const context = findContext(question);
    appendMessage("assistant", "正在检索知识库并生成回答...", "AI");
    const response = await callSeedModel(question, context);
    chatMessages.lastChild.remove();
    appendMessage(
      "assistant",
      `回答：${response.answer}<br/>引用：${response.citations.join("、")}<br/>追问：${response.follow_up}`,
      "AI · JSON"
    );
  });
};

const initTryOn = () => {
  const tryonUpload = document.getElementById("tryonUpload");
  const tryonImage = document.getElementById("tryonImage");
  const tryonCanvas = document.getElementById("tryonCanvas");
  const tryonStyle = document.getElementById("tryonStyle");

  const drawTryon = (imageSrc, style) => {
    const ctx = tryonCanvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      tryonCanvas.width = img.width;
      tryonCanvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = "rgba(181, 29, 51, 0.25)";
      ctx.fillRect(0, 0, img.width, img.height);
      ctx.fillStyle = "rgba(200, 167, 107, 0.35)";
      ctx.fillRect(img.width * 0.1, img.height * 0.2, img.width * 0.8, img.height * 0.6);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(20, img.height - 80, img.width - 40, 60);
      ctx.fillStyle = "#f5f2ec";
      ctx.font = "28px 'Noto Serif SC'";
      ctx.fillText(`AI 试穿 · ${style}`, 40, img.height - 40);
    };
    img.src = imageSrc;
  };

  document.getElementById("runTryon").addEventListener("click", () => {
    drawTryon(tryonImage.src, tryonStyle.value);
  });

  tryonUpload.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      tryonImage.src = reader.result;
      drawTryon(reader.result, tryonStyle.value);
    };
    reader.readAsDataURL(file);
  });

  drawTryon(tryonImage.src, tryonStyle.value);
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

const initBackgroundParallax = () => {
  const update = () => {
    const offset = Math.min(window.scrollY * 0.08, 80);
    document.body.style.setProperty("--bg-y", `${-offset}px`);
    document.body.style.setProperty("--bg-x", `${offset / 2}px`);
    document.body.style.setProperty("--bg-scale", `${1 + offset / 900}`);
    document.body.style.setProperty("--bg-opacity", `${0.18 + offset / 600}`);
    document.body.style.setProperty("--bg-blur", `${Math.min(offset / 30, 4)}px`);
    document.body.style.setProperty("--bg-rotate", `${offset / 16}deg`);
  };

  window.addEventListener("scroll", update);
  update();
};

const initToast = () => {
  document.getElementById("toastClose").addEventListener("click", closeToast);
};

const initMemberState = () => {
  const stored = localStorage.getItem("yunwanqian_member");
  if (stored) {
    const user = JSON.parse(stored);
    setMemberView(user);
    document.getElementById("loginName").value = user.name || "";
    document.getElementById("loginAccount").value = user.account || "";
  } else {
    clearMemberView();
  }
};

initHeaderScroll();
initBackgroundParallax();
initScrollButtons();
initAuth();
initToast();
initChat();
initTryOn();
initMemberState();
initMemberSparkle();
appendMessage("assistant", "您好，我是韵万千 AI 客服，请问今天想了解哪类旗袍定制服务？", "AI");
