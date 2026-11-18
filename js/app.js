import { recordService } from "./data.js";

const $ = id => document.getElementById(id);
const form = $("record-form"), body = $("records"), msg = $("message");
const STATUSES = ["Pending", "In progress", "Completed"];
let editingId = null;

function showMessage(text, type = "success") {
  msg.textContent = text;
  msg.className = "message " + type;
  msg.hidden = false;
}
function clearMessage() { msg.hidden = true; }

function validate(r) {
  if (r.title.length < 3 || r.title.length > 80) return "Title must be 3 to 80 characters.";
  if (r.category.length < 2 || r.category.length > 40) return "Category must be 2 to 40 characters.";
  if (r.description.length < 5 || r.description.length > 300) return "Description must be 5 to 300 characters.";
  if (!STATUSES.includes(r.status)) return "Choose a valid status.";
  return null;
}

function badge(status) {
  const s = document.createElement("span");
  s.className = "badge " + (status === "Pending" ? "pending" : status === "Completed" ? "done" : "progress");
  s.textContent = status;
  return s;
}

function button(label, cls, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn small " + cls;
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

function renderSummary(all) {
  const box = $("summary");
  box.replaceChildren();
  const items = [["Total", "", all.length, "total"], ...STATUSES.map(st => [st, st, all.filter(r => r.status === st).length, st === "Pending" ? "pending" : st === "Completed" ? "done" : "progress"])];
  for (const [label, value, n, cls] of items) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "stat " + cls + ($("filter").value === value ? " active" : "");
    const num = document.createElement("strong"); num.textContent = n;
    const lab = document.createElement("span"); lab.textContent = label;
    b.append(num, lab);
    b.title = value ? `Show only ${value} requests` : "Show all requests";
    b.addEventListener("click", () => { $("filter").value = value; render(); });
    box.appendChild(b);
  }
}

function updateCounters() {
  for (const [id, max] of [["title", 80], ["category", 40], ["description", 300]]) {
    const len = $(id).value.trim().length;
    const el = $(id + "-count");
    el.textContent = `${len}/${max}`;
    el.classList.toggle("over", len > max);
  }
}

async function render() {
  const all = await recordService.list();
  const q = $("search").value.trim().toLowerCase();
  const f = $("filter").value;
  const shown = all.filter(r => r.title.toLowerCase().includes(q) && (!f || r.status === f));
  const sort = $("sort").value;
  if (sort === "newest") shown.sort((a, b) => b.id - a.id);
  else if (sort === "oldest") shown.sort((a, b) => a.id - b.id);
  else if (sort === "title") shown.sort((a, b) => a.title.localeCompare(b.title));
  else shown.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status));
  renderSummary(all);

  body.replaceChildren();
  for (const r of shown) {
    const tr = document.createElement("tr");
    const cells = [r.id, r.title, r.category].map(v => {
      const td = document.createElement("td"); td.textContent = v; return td;
    });
    const tdStatus = document.createElement("td"); tdStatus.appendChild(badge(r.status));
    const tdAct = document.createElement("td"); tdAct.className = "row-actions";
    tdAct.append(
      button("View", "", () => viewRecord(r.id)),
      button("Edit", "", () => startEdit(r.id)),
      button("Delete", "danger", () => deleteRecord(r.id, r.title))
    );
    tr.append(...cells, tdStatus, tdAct);
    body.appendChild(tr);
  }

  $("count").textContent = `Showing ${shown.length} of ${all.length} record${all.length === 1 ? "" : "s"}`;
  const empty = $("empty");
  if (shown.length === 0) {
    empty.textContent = all.length === 0
      ? "There are no records yet. Use the form above to add the first request."
      : "No records match your search or filter. Try different words or choose All statuses.";
    empty.hidden = false;
  } else empty.hidden = true;
}

async function viewRecord(id) {
  try {
    const r = await recordService.get(id);
    const box = $("details");
    box.replaceChildren();
    const h = document.createElement("h3"); h.textContent = `Request #${r.id}`;
    const dl = document.createElement("dl");
    for (const [k, v] of [["Title", r.title], ["Category", r.category], ["Description", r.description], ["Status", r.status]]) {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      dl.append(dt, dd);
    }
    const close = button("Close details", "", () => { box.hidden = true; });
    box.append(h, dl, close);
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (e) { showMessage(e.message, "error"); }
}

async function startEdit(id) {
  try {
    const r = await recordService.get(id);
    editingId = r.id;
    $("title").value = r.title;
    $("category").value = r.category;
    $("description").value = r.description;
    $("status").value = r.status;
    updateCounters();
    $("form-title").textContent = `Edit request #${r.id}`;
    $("save-btn").textContent = "Save changes";
    $("cancel-btn").hidden = false;
    clearMessage();
    form.scrollIntoView({ behavior: "smooth" });
    $("title").focus();
  } catch (e) { showMessage(e.message, "error"); }
}

function resetForm() {
  editingId = null;
  form.reset();
  updateCounters();
  $("form-title").textContent = "Add a request";
  $("save-btn").textContent = "Add request";
  $("cancel-btn").hidden = true;
}

async function deleteRecord(id, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try {
    const res = await recordService.remove(id);
    if (editingId === id) resetForm();
    $("details").hidden = true;
    showMessage(res.message);
    await render();
  } catch (e) { showMessage(e.message, "error"); }
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const data = {
    title: $("title").value.trim(),
    category: $("category").value.trim(),
    description: $("description").value.trim(),
    status: $("status").value
  };
  const problem = validate(data);
  if (problem) { showMessage(problem, "error"); return; }
  try {
    if (editingId === null) {
      const r = await recordService.create(data);
      showMessage(`Request #${r.id} was added.`);
    } else {
      const r = await recordService.update(editingId, data);
      showMessage(`Request #${r.id} was updated.`);
    }
    resetForm();
    await render();
  } catch (err) { showMessage(err.message, "error"); }
});

$("cancel-btn").addEventListener("click", () => { resetForm(); showMessage("Edit cancelled."); });
$("search").addEventListener("input", render);
$("filter").addEventListener("change", render);
$("sort").addEventListener("change", render);
for (const id of ["title", "category", "description"]) $(id).addEventListener("input", updateCounters);
updateCounters();

render();
