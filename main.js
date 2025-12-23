const DOUBAO_API_KEY = "0db191df-893c-43ec-9e6d-c6c2b08ccae2";

const fixedPrompt = `你是一个高端湘派旗袍定制的客服人员，服务品牌为“长沙韵万千”。
请以优雅、专业、温暖且克制的语气回答，突出定制流程、刺绣工艺、材质选择、预约体验与会员礼遇。
如果用户的问题不明确，请先提出1个澄清问题再给出建议。
输出必须是 JSON 字符串，结构为：
{"answer":"...", "confidence":0-1, "follow_up":"..."}。`;

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");

const appendMessage = (role, text, meta = "") => {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = meta ? `<span class="meta">${meta}</span>${text}` : text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const callSeedModel = async (question) => {
  const payload = {
    model: "seed-1-6-flash",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: fixedPrompt },
      { role: "user", content: question },
    ],
    temperature: 0.4,
  };

  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DOUBAO_API_KEY}`,
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
    return {
      answer: "当前 AI 服务暂时不可用，请稍后再试或联系专属顾问。",
      confidence: 0.4,
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

const postJson = async (url, payload) => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    return { ok: false, message: "无法连接服务器，请确认已启动服务。" };
  }
};

const registerAccount = (account, password, name) => postJson("/api/register", { account, password, name });
const loginAccount = (account, password) => postJson("/api/login", { account, password });

const initAuth = () => {
  const authModal = document.getElementById("authModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalNameField = document.getElementById("modalNameField");

  const openModal = (type) => {
    modalTitle.textContent = type === "register" ? "会员注册" : "会员登录";
    modalNameField.classList.toggle("hidden", type !== "register");
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
    if (account === "index" && password === "123456") {
      persistMember({
        account,
        name: "测试会员",
        level: "星耀 · 尊享",
        points: 1688,
        id: "YWQ-TEST-1234",
      });
      showToast("登录成功", "已使用本地测试账号登录。");
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
    const account = document.getElementById("registerAccount").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const name = document.getElementById("registerName").value.trim();
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
    if (modalTitle.textContent !== "会员注册" && account === "index" && password === "123456") {
      persistMember({
        account,
        name: "测试会员",
        level: "星耀 · 尊享",
        points: 1688,
        id: "YWQ-TEST-1234",
      });
      authModal.classList.remove("active");
      showToast("登录成功", "已使用本地测试账号登录。");
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

    appendMessage("assistant", "正在检索知识库并生成回答...", "AI");
    const response = await callSeedModel(question);
    chatMessages.lastChild.remove();
    appendMessage(
      "assistant",
      `回答：${response.answer}<br/>置信度：${response.confidence}<br/>追问：${response.follow_up}`,
      "AI · JSON"
    );
  });
};

const initTryOn = () => {
  const tryonUpload = document.getElementById("tryonUpload");
  const tryonCamera = document.getElementById("tryonCamera");
  const tryonImage = document.getElementById("tryonImage");
  const tryonCanvas = document.getElementById("tryonCanvas");
  const garmentGallery = document.getElementById("garmentGallery");
  let selectedGarment = garmentGallery.querySelector(".gallery-item.selected")?.dataset.image;
  let userImageData = tryonImage.src;

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

  const runTryOn = async () => {
    if (!selectedGarment) {
      showToast("试穿失败", "请选择一件服饰。");
      return;
    }
    const userImage = userImageData || tryonImage.src;
    try {
      const garmentData = await fetchImageAsDataUrl(selectedGarment);
      const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DOUBAO_API_KEY}`,
        },
        body: JSON.stringify({
          model: "doubao-seedream-4-5",
          prompt: tryonPrompt,
          image: [userImage, garmentData],
        }),
      });
      if (!response.ok) {
        throw new Error("Seedream 调用失败");
      }
      const data = await response.json();
      const resultUrl = data.data?.[0]?.url;
      if (resultUrl) {
        tryonImage.src = resultUrl;
        userImageData = resultUrl;
        showToast("试穿完成", "已生成 AI 试穿效果。");
        return;
      }
    } catch (error) {
      drawTryon(userImage, "本地融合预览");
      showToast("试穿提示", "AI 接口暂不可用，已展示本地融合预览。");
    }
  };

  document.getElementById("runTryon").addEventListener("click", runTryOn);

  tryonUpload.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      tryonImage.src = reader.result;
      userImageData = reader.result;
    };
    reader.readAsDataURL(file);
  });

  tryonCamera.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      tryonImage.src = reader.result;
      userImageData = reader.result;
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

  drawTryon(tryonImage.src, "初始预览");
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
  document.getElementById("toastClose").addEventListener("click", closeToast);
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
appendMessage("assistant", "您好，我是韵万千 AI 客服，请问今天想了解哪类旗袍定制服务？", "AI");
