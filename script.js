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

    if (cached) {
        return JSON.parse(cached);
    }

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address + ", New Zealand")}`,
        {
            headers: {
                "Accept-Language": "en-NZ"
            }
        }
    );

    const results = await response.json();

    if (!results.length) return null;

    const coords = {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon)
    };

    localStorage.setItem(cacheKey(address), JSON.stringify(coords));

    return coords;
}

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);

    const headers = lines.shift().split(",");

    return lines.map(line => {
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);

        const row = {};

        headers.forEach((header, i) => {
            row[header.trim()] = values[i]
                ? values[i].replace(/^"|"$/g, "")
                : "";
        });

        return row;
    });
}

async function loadJobs() {

    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    const response = await fetch("jobs.xlsx");
    const buffer = await response.arrayBuffer();

    const workbook = XLSX.read(buffer, {
        type: "array"
    });

    const sheet = workbook.Sheets["Jobs"];

    const jobs = XLSX.utils.sheet_to_json(sheet);

    const bounds = [];

    for (const job of jobs) {

        if (!job.Site) continue;

        const coords = await geocode(job.Site);

        if (!coords) continue;

        const marker = L.marker([
            coords.lat,
            coords.lng
        ])
        .addTo(map)
        .bindPopup(`
            <b>Job:</b> ${job.Job || ""}<br>
            <b>Site:</b> ${job.Site || ""}<br>
            <b>Due:</b> ${job["Due Date"] || ""}
        `);

        marker.jobId = String(job.Job || "").toLowerCase();

        markers.push(marker);

        bounds.push([
            coords.lat,
            coords.lng
        ]);
    }

    if (bounds.length) {
        map.fitBounds(bounds, {
            padding: [30, 30]
        });
    }
}

document.getElementById("refresh").addEventListener("click", loadJobs);

document.getElementById("search").addEventListener("input", e => {

    const search = e.target.value.toLowerCase();

    markers.forEach(marker => {

        if (!search || marker.jobId.includes(search)) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }

    });

});

loadJobs();