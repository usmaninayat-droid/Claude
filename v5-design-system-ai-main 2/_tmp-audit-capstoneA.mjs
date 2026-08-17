import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const OUT = "C:/Users/Shaheer/AppData/Local/Temp/claude/D--Claude-Projects-Product-Designer-V5-Design-System---Ai/ed7d3d19-a627-4b49-b88b-824bb7099c32/scratchpad/t065/CAPSTONE-A/shots";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const modules = [
  ["ops-center", "Operations Center"],
  ["monitoring", "Live Monitoring"],
  ["workforce", "Workforce"],
  ["onboarding", "Onboarding"],
  ["transfers", "Transfers and Promotions"],
  ["exits", "Exits"],
  ["doc-renewals", "Document Renewals"],
  ["zones", "Zones"],
  ["pois", "POIs"],
  ["workforce-shifts", "Workforce Shifts"],
  ["reports", "Reports"],
  ["leave", "Leave"],
  ["projects", "Projects"],
  ["skills", "Skills Matrix"],
  ["inventory", "Inventory"],
  ["incidents", "Incidents"],
  ["payroll", "Payroll"],
];

const consoleLog = [];
let currentTag = "init";

function pad(i) { return String(i).padStart(2, "0"); }

async function shot(page, name) {
  const p = path.join(OUT, name + ".png");
  await page.screenshot({ path: p, fullPage: false });
  return p;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: 1680, height: 1000 },
  });
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      consoleLog.push({ tag: currentTag, type: msg.type(), text: msg.text() });
    }
  });
  page.on("pageerror", (err) => {
    consoleLog.push({ tag: currentTag, type: "pageerror", text: String(err) });
  });

  await page.goto("http://localhost:5197", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));

  currentTag = "login";
  try {
    const emailSel = 'input[type="email"], input[name="email"], input#email';
    const passSel = 'input[type="password"]';
    await page.waitForSelector(emailSel, { timeout: 15000 });
    await page.type(emailSel, "ops.director@ifm.fams.com");
    await page.type(passSel, "password123");
    await shot(page, "00-login-filled");
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => /log ?in/i.test(b.textContent || ""));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!clicked) console.log("LOGIN BUTTON NOT FOUND");
  } catch (e) {
    consoleLog.push({ tag: "login", type: "script-error", text: String(e) });
  }

  await new Promise((r) => setTimeout(r, 9000));
  await shot(page, "00-dashboard-after-login");

  const summary = [];

  async function clickNavByText(text) {
    return page.evaluate((label) => {
      const candidates = Array.from(document.querySelectorAll('[aria-label]'));
      const target = candidates.find((el) => el.getAttribute("aria-label") === label);
      if (target) {
        target.scrollIntoView({ block: "center" });
        target.click();
        return true;
      }
      return false;
    }, text);
  }

  for (let i = 0; i < modules.length; i++) {
    const id = modules[i][0];
    const label = modules[i][1];
    currentTag = id;
    const rec = { id, label, navClicked: false, searchTried: false, filterTried: false, filterAutoClosed: null, rowDetailTried: false, notes: [] };
    try {
      const ok = await clickNavByText(label);
      rec.navClicked = ok;
      if (!ok) rec.notes.push("nav item not found by text match");
      await new Promise((r) => setTimeout(r, 1600));
      await shot(page, "m" + pad(i + 1) + "-" + id + "-01-overview");

      try {
        const searchHandle = await page.$('input[placeholder*="Search" i], input[type="search"]');
        if (searchHandle) {
          rec.searchTried = true;
          await searchHandle.click({ clickCount: 3 });
          await searchHandle.type("a", { delay: 30 });
          await new Promise((r) => setTimeout(r, 700));
          await shot(page, "m" + pad(i + 1) + "-" + id + "-02-search");
          await searchHandle.click({ clickCount: 3 });
          await page.keyboard.press("Backspace");
        }
      } catch (e) { rec.notes.push("search-error:" + e.message); }

      try {
        const filterBtnBox = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll("button"));
          const main = document.querySelector("main") || document.body;
          const rectMain = main.getBoundingClientRect();
          const cands = btns.filter((b) => {
            const r = b.getBoundingClientRect();
            if (r.top < rectMain.top + 10 || r.top > rectMain.top + 160) return false;
            if (r.width === 0) return false;
            const txt = (b.textContent || "").trim();
            return txt.length > 0 && txt.length < 30 && /filter|status|all|stage|site|trade|type|category/i.test(txt);
          });
          if (cands.length === 0) return null;
          const b = cands[0];
          const r = b.getBoundingClientRect();
          b.setAttribute("data-audit-filter-target", "1");
          return { x: r.x, y: r.y, w: r.width, h: r.height, text: b.textContent };
        });
        if (filterBtnBox) {
          rec.filterTried = true;
          rec.notes.push("filter candidate text: " + filterBtnBox.text);
          const el = await page.$('[data-audit-filter-target="1"]');
          await el.click();
          await new Promise((r) => setTimeout(r, 500));
          await shot(page, "m" + pad(i + 1) + "-" + id + "-03-filter-open");

          const optionClicked = await page.evaluate(() => {
            const opts = Array.from(document.querySelectorAll('[role="option"], [role="menuitem"], li, [cmdk-item]'));
            const visible = opts.filter((o) => {
              const r = o.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && r.top > 50;
            });
            if (visible.length === 0) return false;
            visible[0].scrollIntoView({ block: "center" });
            visible[0].click();
            return true;
          });

          rec.notes.push("option clicked: " + optionClicked);
          await new Promise((r) => setTimeout(r, 300));
          await shot(page, "m" + pad(i + 1) + "-" + id + "-04-filter-after-option-click");
          const stillOpen = await page.evaluate(() => {
            const opts = Array.from(document.querySelectorAll('[role="option"], [role="listbox"], [role="menu"]'));
            return opts.some((o) => {
              const r = o.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            });
          });
          rec.filterAutoClosed = !stillOpen;
          await page.keyboard.press("Escape");
          await page.mouse.click(5, 5);
        }
      } catch (e) { rec.notes.push("filter-error:" + e.message); }

      await new Promise((r) => setTimeout(r, 400));

      try {
        const rowClicked = await page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('table tbody tr, [role="row"]'));
          const cards = Array.from(document.querySelectorAll('[data-slot="card"], .cursor-pointer'));
          const target = rows.find((r) => r.getBoundingClientRect().height > 0) || cards.find((c) => c.getBoundingClientRect().height > 0);
          if (target) { target.scrollIntoView({ block: "center" }); target.click(); return true; }
          return false;
        });
        if (rowClicked) {
          rec.rowDetailTried = true;
          await new Promise((r) => setTimeout(r, 900));
          await shot(page, "m" + pad(i + 1) + "-" + id + "-05-detail-open");
          await page.keyboard.press("Escape");
          await new Promise((r) => setTimeout(r, 500));
          await shot(page, "m" + pad(i + 1) + "-" + id + "-06-detail-closed");

          const reopened = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tbody tr, [role="row"]'));
            const cards = Array.from(document.querySelectorAll('[data-slot="card"], .cursor-pointer'));
            const target = rows.find((r) => r.getBoundingClientRect().height > 0) || cards.find((c) => c.getBoundingClientRect().height > 0);
            if (target) { target.click(); return true; }
            return false;
          });
          if (reopened) {
            await new Promise((r) => setTimeout(r, 900));
            await shot(page, "m" + pad(i + 1) + "-" + id + "-07-detail-reopen");
            await page.keyboard.press("Escape");
            await new Promise((r) => setTimeout(r, 400));
          }
        }
      } catch (e) { rec.notes.push("detail-error:" + e.message); }

      try {
        const tabLabels = await page.evaluate(() => {
          const tabEls = Array.from(document.querySelectorAll('[role="tab"]'));
          return tabEls.map((t) => t.textContent.trim()).filter(Boolean);
        });
        if (tabLabels.length > 1) {
          rec.notes.push("tabs: " + tabLabels.join(" | "));
          await page.evaluate(() => {
            const tabEls = Array.from(document.querySelectorAll('[role="tab"]'));
            if (tabEls[1]) tabEls[1].click();
          });
          await new Promise((r) => setTimeout(r, 900));
          await shot(page, "m" + pad(i + 1) + "-" + id + "-08-tab2");
        }
      } catch (e) { rec.notes.push("tabs-error:" + e.message); }

    } catch (e) {
      rec.notes.push("FATAL:" + e.message);
    }
    summary.push(rec);
    fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
    fs.writeFileSync(path.join(OUT, "console-log.json"), JSON.stringify(consoleLog, null, 2));
  }

  try {
    currentTag = "inbox";
    const ok = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const btn = btns.find((b) => /inbox|notification/i.test(b.getAttribute("aria-label") || ""));
      if (btn) { btn.click(); return true; }
      return false;
    });
    await new Promise((r) => setTimeout(r, 1200));
    await shot(page, "x1-inbox-01");
    if (ok) {
      await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('[data-slot="card"], li, .cursor-pointer'));
        const target = rows.find((r) => r.getBoundingClientRect().height > 10);
        if (target) { target.click(); return true; }
        return false;
      });
      await new Promise((r) => setTimeout(r, 900));
      await shot(page, "x1-inbox-02-notif-click");
    }
  } catch (e) { consoleLog.push({ tag: "inbox", type: "script-error", text: String(e) }); }

  try {
    currentTag = "settings";
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const btn = btns.find((b) => /settings/i.test(b.getAttribute("aria-label") || "") || /^Settings$/.test((b.textContent || "").trim()));
      if (btn) { btn.click(); return true; }
      return false;
    });
    await new Promise((r) => setTimeout(r, 1200));
    await shot(page, "x2-settings-01");
  } catch (e) { consoleLog.push({ tag: "settings", type: "script-error", text: String(e) }); }

  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUT, "console-log.json"), JSON.stringify(consoleLog, null, 2));

  await browser.close();
  console.log("DONE");
}

main().catch((e) => { console.error(e); process.exit(1); });
