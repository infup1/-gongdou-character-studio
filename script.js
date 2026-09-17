const STORAGE_KEY = "gongdou_world_archive_v1";

const defaultBranches = [
  "基本资料",
  "个人描写",
  "性格",
  "欲望与弱点",
  "人际关系",
  "经历"
];

const defaultData = {
  backgrounds: [],
  characters: [],
  commonBranches: []
};

let data = loadData();
let selectedCharacterId = null;
let currentView = "background";

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(defaultData);
    return {
      backgrounds: Array.isArray(saved.backgrounds) ? saved.backgrounds : [],
      characters: Array.isArray(saved.characters) ? saved.characters : [],
      commonBranches: Array.isArray(saved.commonBranches) ? saved.commonBranches : []
    };
  } catch {
    return structuredClone(defaultData);
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createBranch(title = "新分支") {
  return { id: uid("branch"), title, content: "", children: [] };
}

function createCharacter() {
  const character = {
    id: uid("subject"),
    name: "未命名人物",
    branches: defaultBranches.map(title => createBranch(title))
  };
  data.characters.unshift(character);
  selectedCharacterId = character.id;
  save();
  renderAll();
}

function findCharacter(id) {
  return data.characters.find(c => c.id === id);
}

function findBranch(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findBranch(node.children || [], id);
    if (found) return found;
  }
  return null;
}

function removeBranch(nodes, id) {
  const index = nodes.findIndex(n => n.id === id);
  if (index !== -1) {
    nodes.splice(index, 1);
    return true;
  }
  return nodes.some(n => removeBranch(n.children || [], id));
}

function addChildTo(nodes, parentId, child) {
  const parent = findBranch(nodes, parentId);
  if (!parent) return false;
  parent.children ||= [];
  parent.children.push(child);
  return true;
}

function collectBranchTitles(nodes, set) {
  nodes.forEach(n => {
    if (n.title?.trim()) set.add(n.title.trim());
    collectBranchTitles(n.children || [], set);
  });
}

function rememberCommonBranch(title) {
  const clean = title.trim();
  if (!clean) return;
  if (!data.commonBranches.includes(clean)) {
    data.commonBranches.push(clean);
    save();
    renderCommonBranches();
  }
}

function renderAll() {
  renderBackgroundTree();
  renderCharacterList();
  renderCharacterEditor();
  renderCommonBranches();
  updateView();
}

function updateView() {
  document.getElementById("backgroundView").classList.toggle("hidden", currentView !== "background");
  document.getElementById("charactersView").classList.toggle("hidden", currentView !== "characters");
  document.getElementById("viewTitle").textContent = currentView === "background" ? "世界背景" : "人物档案";
  document.querySelectorAll(".nav-item[data-view]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === currentView);
  });
}

function renderBackgroundTree() {
  const container = document.getElementById("backgroundTree");
  if (!data.backgrounds.length) {
    container.innerHTML = `<div class="empty-tree">尚未建立世界背景。点击右上角「新建分支」开始。</div>`;
    return;
  }
  container.innerHTML = "";
  data.backgrounds.forEach(branch => container.appendChild(buildBranchElement(branch, data.backgrounds, true)));
}

function buildBranchElement(branch, rootArray, isBackground = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "branch-node";
  wrapper.dataset.branchId = branch.id;

  wrapper.innerHTML = `
    <div class="branch-row">
      <button class="toggle-btn" title="展开/折叠">⌄</button>
      <span class="branch-icon">◇</span>
      <input class="branch-title" value="${escapeHtml(branch.title)}" placeholder="分支名称">
      <button class="branch-add" title="添加子分支">＋</button>
      <button class="branch-delete" title="删除">×</button>
    </div>
    <textarea class="branch-content" placeholder="在这里记录内容……">${escapeHtml(branch.content)}</textarea>
    <div class="branch-children"></div>
  `;

  const titleInput = wrapper.querySelector(".branch-title");
  const contentInput = wrapper.querySelector(".branch-content");
  titleInput.addEventListener("input", () => {
    branch.title = titleInput.value;
    if (!isBackground) rememberCommonBranch(branch.title);
    save();
  });
  titleInput.addEventListener("blur", () => {
    if (!isBackground) rememberCommonBranch(branch.title);
  });
  contentInput.addEventListener("input", () => {
    branch.content = contentInput.value;
    save();
  });

  wrapper.querySelector(".toggle-btn").addEventListener("click", () => {
    wrapper.classList.toggle("branch-collapsed");
  });

  wrapper.querySelector(".branch-add").addEventListener("click", () => {
    const child = createBranch("新分支");
    branch.children ||= [];
    branch.children.push(child);
    save();
    const childEl = buildBranchElement(child, branch.children, isBackground);
    wrapper.querySelector(".branch-children").appendChild(childEl);
  });

  wrapper.querySelector(".branch-delete").addEventListener("click", () => {
    if (!confirm(`确定删除「${branch.title || "未命名分支"}」吗？其下的所有子分支也会一起删除。`)) return;
    if (isBackground) {
      const idx = rootArray.findIndex(n => n.id === branch.id);
      if (idx !== -1) rootArray.splice(idx, 1);
    } else {
      removeBranch(rootArray, branch.id);
    }
    save();
    isBackground ? renderBackgroundTree() : renderCharacterEditor();
  });

  const childContainer = wrapper.querySelector(".branch-children");
  (branch.children || []).forEach(child => {
    childContainer.appendChild(buildBranchElement(child, branch.children, isBackground));
  });

  return wrapper;
}

function renderCharacterList() {
  const container = document.getElementById("characterListItems");
  const q = document.getElementById("characterSearch").value.trim().toLowerCase();
  const characters = data.characters.filter(c => (c.name || "").toLowerCase().includes(q));

  if (!characters.length) {
    container.innerHTML = `<div class="empty-tree">没有找到人物</div>`;
    return;
  }

  container.innerHTML = "";
  characters.forEach((character, index) => {
    const item = document.createElement("div");
    item.className = "character-item" + (character.id === selectedCharacterId ? " active" : "");
    item.innerHTML = `
      <div class="name">${escapeHtml(character.name || "未命名人物")}</div>
      <div class="sub">SUBJECT // ${String(data.characters.indexOf(character) + 1).padStart(3, "0")}</div>
    `;
    item.addEventListener("click", () => {
      selectedCharacterId = character.id;
      renderCharacterList();
      renderCharacterEditor();
    });
    container.appendChild(item);
  });
}

function renderCharacterEditor() {
  const empty = document.getElementById("emptyCharacter");
  const editor = document.getElementById("characterEditor");
  const character = findCharacter(selectedCharacterId);

  if (!character) {
    empty.classList.remove("hidden");
    editor.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  editor.classList.remove("hidden");
  document.getElementById("subjectId").textContent =
    String(data.characters.indexOf(character) + 1).padStart(4, "0");
  document.getElementById("characterName").value = character.name || "";

  const tree = document.getElementById("characterTree");
  tree.innerHTML = "";
  character.branches.forEach(branch => tree.appendChild(buildBranchElement(branch, character.branches, false)));
}

function renderCommonBranches() {
  const container = document.getElementById("commonBranches");
  const names = new Set(data.commonBranches);
  data.characters.forEach(c => collectBranchTitles(c.branches || [], names));

  data.commonBranches = [...names];
  save();

  if (!data.commonBranches.length) {
    container.innerHTML = `<span style="color:#4f5b60;font-size:10px;">暂无自定义分支</span>`;
    return;
  }

  container.innerHTML = "";
  data.commonBranches.forEach(name => {
    const chip = document.createElement("button");
    chip.className = "common-chip";
    chip.textContent = name;
    chip.title = "添加到当前人物";
    chip.addEventListener("click", () => {
      const character = findCharacter(selectedCharacterId);
      if (!character) return;
      character.branches.push(createBranch(name));
      save();
      renderCharacterEditor();
    });
    container.appendChild(chip);
  });
}

document.querySelectorAll(".nav-item[data-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.classList.contains("disabled")) return;
    currentView = btn.dataset.view;
    updateView();
    if (currentView === "characters" && !selectedCharacterId && data.characters.length) {
      selectedCharacterId = data.characters[0].id;
      renderCharacterList();
      renderCharacterEditor();
    }
  });
});

document.getElementById("addRootBackground").addEventListener("click", () => {
  data.backgrounds.push(createBranch("新分支"));
  save();
  renderBackgroundTree();
});

document.getElementById("newCharacterBtn").addEventListener("click", createCharacter);
document.getElementById("emptyNewBtn").addEventListener("click", createCharacter);

document.getElementById("characterSearch").addEventListener("input", renderCharacterList);

document.getElementById("characterName").addEventListener("input", e => {
  const character = findCharacter(selectedCharacterId);
  if (!character) return;
  character.name = e.target.value;
  save();
  renderCharacterList();
});

document.getElementById("addCustomBranchBtn").addEventListener("click", () => {
  const name = prompt("输入分支名称：");
  if (!name?.trim()) return;
  const character = findCharacter(selectedCharacterId);
  if (!character) return;
  const clean = name.trim();
  character.branches.push(createBranch(clean));
  rememberCommonBranch(clean);
  save();
  renderCharacterEditor();
});

document.getElementById("duplicateCharacterBtn").addEventListener("click", () => {
  const character = findCharacter(selectedCharacterId);
  if (!character) return;
  const copy = structuredClone(character);
  const remap = nodes => nodes.map(n => ({...n, id: uid("branch"), children: remap(n.children || [])}));
  copy.id = uid("subject");
  copy.name = `${character.name || "未命名人物"}（副本）`;
  copy.branches = remap(copy.branches);
  data.characters.unshift(copy);
  selectedCharacterId = copy.id;
  save();
  renderAll();
});

document.getElementById("deleteCharacterBtn").addEventListener("click", () => {
  const character = findCharacter(selectedCharacterId);
  if (!character) return;
  if (!confirm(`确定删除「${character.name || "未命名人物"}」吗？`)) return;
  data.characters = data.characters.filter(c => c.id !== selectedCharacterId);
  selectedCharacterId = data.characters[0]?.id || null;
  save();
  renderAll();
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "宫廷世界档案.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("importInput").addEventListener("change", async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.characters) || !Array.isArray(imported.backgrounds)) {
      throw new Error("文件格式不正确");
    }
    data = {
      backgrounds: imported.backgrounds,
      characters: imported.characters,
      commonBranches: Array.isArray(imported.commonBranches) ? imported.commonBranches : []
    };
    selectedCharacterId = data.characters[0]?.id || null;
    save();
    renderAll();
    alert("数据导入成功。");
  } catch {
    alert("导入失败：这个文件不是本项目导出的有效数据。");
  }
  e.target.value = "";
});

renderAll();
