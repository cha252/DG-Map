const SITE_URL = "https://feisst-my.sharepoint.com/:l:/r/personal/chisora_h_npe-tech_co_nz/Lists/PN%20DGs?e=qLBQH6";
const LIST_NAME = "PN DGs";

const map = L.map("map").setView([-40.356, 175.611], 9);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let markers = [];

function cacheKey(address) {
  return `geo:${address}`;
}

async function geocode(address) {
  const cached = localStorage.getItem(cacheKey(address));
  if (cached) return JSON.parse(cached);

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address + ", New Zealand")}`;

  const res = await fetch(url, {
    headers: { "Accept-Language": "en-NZ" }
  });

  const data = await res.json();
  if (!data.length) return null;

  const coords = {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  };

  localStorage.setItem(cacheKey(address), JSON.stringify(coords));
  return coords;
}

async function loadJobs() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const url =
    `${SITE_URL}/_api/web/lists/getbytitle('${encodeURIComponent(LIST_NAME)}')/items?$select=Job,Site,Due_x0020_Date`;

  const res = await fetch(url, {
    headers: {
      "Accept": "application/json;odata=nometadata"
    },
    credentials: "include"
  });

  const data = await res.json();
  const jobs = data.value || [];

  const bounds = [];

  for (const job of jobs) {
    if (!job.Site) continue;

    const coords = await geocode(job.Site);
    if (!coords) continue;

    const marker = L.marker([coords.lat, coords.lng])
      .addTo(map)
      .bindPopup(`
        <b>Job:</b> ${job.Job || ""}<br>
        <b>Site:</b> ${job.Site || ""}<br>
        <b>Due:</b> ${job.Due_x0020_Date
          ? new Date(job.Due_x0020_Date).toLocaleDateString("en-NZ")
          : ""}
      `);

    marker.jobId = String(job.Job || "").toLowerCase();
    markers.push(marker);
    bounds.push([coords.lat, coords.lng]);
  }

  if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
}

document.getElementById("refresh").addEventListener("click", loadJobs);

document.getElementById("search").addEventListener("input", e => {
  const q = e.target.value.toLowerCase().trim();

  markers.forEach(m => {
    const visible = !q || m.jobId.includes(q);
    if (visible) m.addTo(map);
    else map.removeLayer(m);
  });
});

loadJobs();