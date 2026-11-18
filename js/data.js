const KEY = "maintenance-demo-v1";

const SEED = [
  ["Broken classroom light", "Electrical", "The light in Room B12 does not switch on.", "Pending"],
  ["Leaking tap in toilets", "Plumbing", "The tap in the ground floor toilets drips all day.", "In progress"],
  ["Broken lecture chair", "Furniture", "Two chairs in Lecture Hall 3 have broken legs.", "Pending"],
  ["Flickering corridor lamp", "Electrical", "The lamp outside the library flickers at night.", "Completed"],
  ["Blocked sink in lab", "Plumbing", "Water drains very slowly in Computer Lab 2 sink.", "In progress"],
  ["Loose desk top", "Furniture", "The desk top in Room A4 wobbles and is unsafe.", "Pending"],
  ["No power at sockets", "Electrical", "Sockets at the back of Room C7 have no power.", "Completed"],
  ["Burst pipe near hostel", "Plumbing", "A pipe behind Hostel Block 2 is leaking water.", "Pending"],
  ["Cracked window latch", "Furniture", "The window latch in the staff room will not close.", "In progress"]
].map(([title, category, description, status], i) => ({ id: i + 1, title, category, description, status }));

function load() {
  const raw = localStorage.getItem(KEY);
  if (raw === null) { save(SEED); return [...SEED]; }   // seed only when key is missing
  try { return JSON.parse(raw); } catch { return []; }
}
function save(records) { localStorage.setItem(KEY, JSON.stringify(records)); }

function clean(r) {
  return {
    title: String(r.title ?? "").trim(),
    category: String(r.category ?? "").trim(),
    description: String(r.description ?? "").trim(),
    status: r.status
  };
}

export const recordService = {
  async list() { return load(); },

  async get(id) {
    const found = load().find(r => r.id === Number(id));
    if (!found) throw new Error("Record not found.");
    return found;
  },

  async create(record) {
    const records = load();
    const id = records.reduce((max, r) => Math.max(max, r.id), 0) + 1; // never repeats
    const created = { id, ...clean(record) };
    records.push(created);
    save(records);
    return created;
  },

  async update(id, record) {
    const records = load();
    const i = records.findIndex(r => r.id === Number(id));
    if (i === -1) throw new Error("Record not found.");
    records[i] = { id: records[i].id, ...clean(record) }; // id stays the same
    save(records);
    return records[i];
  },

  async remove(id) {
    const records = load();
    const i = records.findIndex(r => r.id === Number(id));
    if (i === -1) throw new Error("Record not found.");
    records.splice(i, 1);
    save(records);
    return { message: "Record deleted." };
  }
};
