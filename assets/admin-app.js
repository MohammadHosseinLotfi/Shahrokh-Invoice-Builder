(() => {
  const app = document.getElementById("sib-app");
  if (!app) {
    return;
  }

  const root = document.querySelector(".sib-admin");
  const getData = (key) => (root && root.dataset ? root.dataset[key] : "");
  const adminConfig = Object.assign({}, window.sibAdmin || {});
  ["restUrl", "nonce", "adminBase", "page"].forEach((key) => {
    const value = getData(key);
    if (value) {
      adminConfig[key] = value;
    }
  });

  if (!adminConfig.restUrl || !adminConfig.nonce) {
    app.innerHTML =
      '<div class="sib-empty">Missing plugin configuration.</div>';
    return;
  }

  const page = adminConfig.page || "";

  const api = {
    async request(path, options = {}) {
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;
      const url = `${adminConfig.restUrl}${cleanPath}`;
      const headers = Object.assign(
        {
          "Content-Type": "application/json",
          "X-WP-Nonce": adminConfig.nonce,
        },
        options.headers || {}
      );

      const response = await fetch(
        url,
        Object.assign(
          {
            headers,
            credentials: "same-origin",
          },
          options
        )
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "خطا در ارتباط با سرور");
      }

      return response.json();
    },
    get(path, params = {}) {
      const query = new URLSearchParams(params);
      const suffix = query.toString() ? `?${query}` : "";
      return this.request(`${path}${suffix}`, { method: "GET" });
    },
    post(path, data) {
      return this.request(path, {
        method: "POST",
        body: JSON.stringify(data || {}),
      });
    },
    put(path, data) {
      return this.request(path, {
        method: "POST",
        body: JSON.stringify(data || {}),
      });
    },
    delete(path) {
      return this.request(path, { method: "DELETE" });
    },
  };

  const formatMoney = (value) => {
    const number = Number(value || 0);
    return new Intl.NumberFormat("fa-IR").format(Math.round(number));
  };

  const normalizeNumberInput = (value) => {
    const text = String(value ?? "").trim();
    if (!text) {
      return "0";
    }
    return text
      .replace(/[\u200c\u200d\u200e\u200f\u202a-\u202e]/g, "")
      .replace(/[\u06f0-\u06f9]/g, (char) =>
        String(char.charCodeAt(0) - 0x06f0)
      )
      .replace(/[\u0660-\u0669]/g, (char) =>
        String(char.charCodeAt(0) - 0x0660)
      )
      .replace(/[\u066c,]/g, "")
      .replace(/\u066b/g, ".")
      .replace(/[^0-9.-]/g, "");
  };

  const formatValue = (value) => {
    const number = Number(normalizeNumberInput(value || 0));
    return Number.isFinite(number) ? number : 0;
  };

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) =>
    Array.from(scope.querySelectorAll(selector));

  const ui = (() => {
    let toastStack = null;
    let activeConfirm = null;

    const ensureToastStack = () => {
      if (!toastStack) {
        toastStack = document.createElement("div");
        toastStack.className = "sib-toast-stack";
        document.body.appendChild(toastStack);
      }
    };

    const toast = (message, tone = "info") => {
      ensureToastStack();
      const item = document.createElement("div");
      item.className = `sib-toast ${tone}`;
      item.textContent = message;
      toastStack.appendChild(item);
      requestAnimationFrame(() => item.classList.add("show"));
      setTimeout(() => {
        item.classList.remove("show");
        setTimeout(() => item.remove(), 200);
      }, 2800);
    };

    const confirm = (message) => {
      if (activeConfirm) {
        activeConfirm.remove();
        activeConfirm = null;
      }
      return new Promise((resolve) => {
        const box = document.createElement("div");
        box.className = "sib-confirm";
        box.innerHTML = `
          <p>${message}</p>
          <div class="sib-confirm-actions">
            <button class="sib-btn" data-cancel>انصراف</button>
            <button class="sib-btn sib-btn-danger" data-confirm>تایید حذف</button>
          </div>
        `;
        document.body.appendChild(box);
        activeConfirm = box;

        const cleanup = (value) => {
          if (activeConfirm) {
            activeConfirm.remove();
            activeConfirm = null;
          }
          resolve(value);
        };

        box.querySelector("[data-confirm]").addEventListener("click", () => {
          cleanup(true);
        });
        box.querySelector("[data-cancel]").addEventListener("click", () => {
          cleanup(false);
        });

        setTimeout(() => cleanup(false), 8000);
      });
    };

    return { toast, confirm };
  })();

  const notify = (message, tone = "info") => {
    ui.toast(message, tone);
  };

  const copyText = async (text) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement("textarea");
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        temp.remove();
      }
      notify("لینک مشتری کپی شد.", "success");
    } catch (err) {
      notify("کپی لینک ناموفق بود.", "error");
    }
  };

  const jalali = (() => {
    const div = (a, b) => Math.floor(a / b);
    const mod = (a, b) => a - Math.floor(a / b) * b;

    const jalCal = (jy) => {
      const breaks = [
        -61,
        9,
        38,
        199,
        426,
        686,
        756,
        818,
        1111,
        1181,
        1210,
        1635,
        2060,
        2097,
        2192,
        2262,
        2324,
        2394,
        2456,
        3178,
      ];
      const bl = breaks.length;
      let gy = jy + 621;
      let leapJ = -14;
      let jp = breaks[0];
      let jm;
      let jump;
      let leap;
      let n;

      if (jy < jp || jy >= breaks[bl - 1]) {
        return null;
      }

      for (let i = 1; i < bl; i += 1) {
        jm = breaks[i];
        jump = jm - jp;
        if (jy < jm) {
          break;
        }
        leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
        jp = jm;
      }
      n = jy - jp;
      leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
      if (mod(jump, 33) === 4 && jump - n === 4) {
        leapJ += 1;
      }
      const leapG =
        div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
      const march = 20 + leapJ - leapG;
      if (jump - n < 6) {
        n = n - jump + div(jump + 4, 33) * 33;
      }
      leap = mod(mod(n + 1, 33) - 1, 4);
      if (leap === -1) {
        leap = 4;
      }
      return { leap, gy, march };
    };

    const g2d = (gy, gm, gd) => {
      let d =
        div((gy + 100100) * 1461, 4) +
        div(153 * mod(gm + 9, 12) + 2, 5) +
        gd -
        34840408;
      d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
      return d;
    };

    const d2g = (jdn) => {
      let j = 4 * jdn + 139361631;
      j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
      const i = div(mod(j, 1461), 4) * 5 + 308;
      const gd = div(mod(i, 153), 5) + 1;
      const gm = mod(div(i, 153), 12) + 1;
      const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
      return { gy, gm, gd };
    };

    const d2j = (jdn) => {
      const g = d2g(jdn);
      let jy = g.gy - 621;
      const r = jalCal(jy);
      const jdn1f = g2d(g.gy, 3, r.march);
      let k = jdn - jdn1f;
      let jm;
      let jd;

      if (k >= 0) {
        if (k <= 185) {
          jm = 1 + div(k, 31);
          jd = mod(k, 31) + 1;
          return { jy, jm, jd };
        }
        k -= 186;
        jm = 7 + div(k, 30);
        jd = mod(k, 30) + 1;
        return { jy, jm, jd };
      }

      jy -= 1;
      k += 179;
      if (r.leap === 1) {
        k += 1;
      }
      jm = 7 + div(k, 30);
      jd = mod(k, 30) + 1;
      return { jy, jm, jd };
    };

    const toJalaali = (gy, gm, gd) => d2j(g2d(gy, gm, gd));
    const toGregorian = (jy, jm, jd) => {
      const r = jalCal(jy);
      const gy = r.gy;
      const jdn1f = g2d(gy, 3, r.march);
      const k =
        (jm - 1 < 6 ? (jm - 1) * 31 : (jm - 7) * 30 + 186) + (jd - 1);
      return d2g(jdn1f + k);
    };

    const isLeap = (jy) => {
      const r = jalCal(jy);
      return r && r.leap === 0;
    };

    const monthLength = (jy, jm) => {
      if (jm <= 6) return 31;
      if (jm <= 11) return 30;
      return isLeap(jy) ? 30 : 29;
    };

    const today = () => {
      const now = new Date();
      const j = toJalaali(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate()
      );
      return `${j.jy.toString().padStart(4, "0")}/${j.jm
        .toString()
        .padStart(2, "0")}/${j.jd.toString().padStart(2, "0")}`;
    };

    return { toJalaali, toGregorian, monthLength, today };
  })();
  const datepicker = (() => {
    let active = null;
    const months = [
      "فروردین",
      "اردیبهشت",
      "خرداد",
      "تیر",
      "مرداد",
      "شهریور",
      "مهر",
      "آبان",
      "آذر",
      "دی",
      "بهمن",
      "اسفند",
    ];
    const weekdays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

    const parseInput = (value) => {
      const parts = (value || "").split("/");
      if (parts.length !== 3) return null;
      const jy = parseInt(parts[0], 10);
      const jm = parseInt(parts[1], 10);
      const jd = parseInt(parts[2], 10);
      if (!jy || !jm || !jd) return null;
      return { jy, jm, jd };
    };

    const buildPicker = (input) => {
      const picker = document.createElement("div");
      picker.className = "sib-datepicker";
      picker.innerHTML = `
        <div class="sib-datepicker-header">
          <button type="button" class="sib-btn" data-dir="-1">ماه قبل</button>
          <strong class="sib-date-title"></strong>
          <button type="button" class="sib-btn" data-dir="1">ماه بعد</button>
        </div>
        <div class="sib-datepicker-grid sib-datepicker-weekdays"></div>
        <div class="sib-datepicker-grid sib-datepicker-days"></div>
      `;

      const rect = input.getBoundingClientRect();
      picker.style.top = `${rect.bottom + window.scrollY + 8}px`;
      picker.style.left = `${rect.left + window.scrollX}px`;

      document.body.appendChild(picker);
      return picker;
    };

    const renderCalendar = (picker, input, state) => {
      const title = picker.querySelector(".sib-date-title");
      const weekdaysWrap = picker.querySelector(".sib-datepicker-weekdays");
      const daysWrap = picker.querySelector(".sib-datepicker-days");

      title.textContent = `${months[state.jm - 1]} ${state.jy}`;
      weekdaysWrap.innerHTML = weekdays
        .map((day) => `<div class="sib-datepicker-muted">${day}</div>`)
        .join("");

      const g = jalali.toGregorian(state.jy, state.jm, 1);
      const jsDay = new Date(g.gy, g.gm - 1, g.gd).getDay();
      const offset = (jsDay + 1) % 7;
      const totalDays = jalali.monthLength(state.jy, state.jm);

      const cells = [];
      for (let i = 0; i < offset; i += 1) {
        cells.push('<div class="sib-datepicker-muted"></div>');
      }
      for (let day = 1; day <= totalDays; day += 1) {
        cells.push(
          `<div class="sib-datepicker-cell" data-day="${day}">${day}</div>`
        );
      }
      daysWrap.innerHTML = cells.join("");

      daysWrap.querySelectorAll(".sib-datepicker-cell").forEach((cell) => {
        cell.addEventListener("click", () => {
          const day = cell.getAttribute("data-day");
          const value = `${state.jy
            .toString()
            .padStart(4, "0")}/${state.jm
            .toString()
            .padStart(2, "0")}/${day.toString().padStart(2, "0")}`;
          input.value = value;
          input.dispatchEvent(new Event("change"));
          removePicker();
        });
      });

      picker.querySelectorAll("[data-dir]").forEach((btn) => {
        btn.onclick = () => {
          const dir = parseInt(btn.getAttribute("data-dir"), 10);
          let jm = state.jm + dir;
          let jy = state.jy;
          if (jm > 12) {
            jm = 1;
            jy += 1;
          } else if (jm < 1) {
            jm = 12;
            jy -= 1;
          }
          state.jm = jm;
          state.jy = jy;
          renderCalendar(picker, input, state);
        };
      });
    };

    const removePicker = () => {
      if (active) {
        active.picker.remove();
        active = null;
      }
    };

    const attach = (input) => {
      input.addEventListener("focus", () => {
        removePicker();
        const initial = parseInput(input.value) || parseInput(jalali.today());
        const state = { jy: initial.jy, jm: initial.jm };
        const picker = buildPicker(input);
        active = { picker, input };
        renderCalendar(picker, input, state);
      });
    };

    document.addEventListener("click", (event) => {
      if (!active) return;
      if (
        event.target.closest(".sib-datepicker") ||
        event.target.closest(".sib-date")
      ) {
        return;
      }
      removePicker();
    });

    return { attach };
  })();

  const computeTotals = (items, summary) => {
    let subTotal = 0;
    let taxableBase = 0;

    items.forEach((item) => {
      const qty = formatValue(item.qty);
      const price = formatValue(item.price);
      const disc = formatValue(item.disc);
      const discType = item.disc_type === "percent" ? "percent" : "amount";
      const lineBase = qty * price;
      const lineDisc = discType === "percent" ? (lineBase * disc) / 100 : disc;
      const lineTotal = Math.max(0, lineBase - lineDisc);
      subTotal += lineTotal;
      if (item.taxable) {
        taxableBase += lineTotal;
      }
    });

    const globalDisc = formatValue(summary.global_disc);
    const globalDiscType =
      summary.global_disc_type === "percent" ? "percent" : "amount";
    const globalDiscValue =
      globalDiscType === "percent" ? (subTotal * globalDisc) / 100 : globalDisc;

    const vatEnabled = !!summary.vat_enabled;
    const vatPercent = formatValue(summary.vat_percent);
    const vatTotal = vatEnabled ? (taxableBase * vatPercent) / 100 : 0;

    const extra = formatValue(summary.extra);
    const total = Math.max(0, subTotal - globalDiscValue + vatTotal + extra);

    return {
      subTotal,
      globalDiscValue,
      vatTotal,
      extra,
      total,
    };
  };

  const getQueryParam = (key) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  };
  const renderListPage = () => {
    app.innerHTML = `
      <div class="sib-shell">
        <div class="sib-header">
          <div>
            <div class="sib-breadcrumb">فاکتورساز / فاکتورها</div>
            <h1>مشاهده فاکتورها</h1>
          </div>
          <div class="sib-header-actions">
            <div class="sib-avatar">ش</div>
            <a class="sib-btn sib-btn-primary" href="${adminConfig.adminBase}?page=sib-invoice-new">افزودن فاکتور جدید</a>
          </div>
        </div>
        <div class="sib-card">
          <div class="sib-filter-row">
            <div class="sib-toolbar">
              <div class="sib-search">
                <input class="sib-input" type="text" placeholder="جستجو: شماره فاکتور، نام مشتری..." id="sib-search" />
                <span>⌕</span>
              </div>
              <select class="sib-select" id="sib-order">
                <option value="desc">جدیدترین</option>
                <option value="asc">قدیمی‌ترین</option>
              </select>
            </div>
            <div class="sib-chip-group" id="sib-payment-chips">
              <button class="sib-chip active" data-value="">همه پرداخت‌ها</button>
              <button class="sib-chip" data-value="unpaid">پرداخت نشده</button>
              <button class="sib-chip" data-value="partial">پرداخت جزئی</button>
              <button class="sib-chip" data-value="paid">تسویه شده</button>
            </div>
            <div class="sib-chip-group" id="sib-publish-chips">
              <button class="sib-chip active" data-value="">همه وضعیت‌ها</button>
              <button class="sib-chip" data-value="draft">پیش‌نویس</button>
              <button class="sib-chip" data-value="issued">صادر شده</button>
            </div>
            <div class="sib-toolbar">
              <div class="sib-chip-group" id="sib-date-chips">
                <button class="sib-chip active" data-value="">همه تاریخ‌ها</button>
                <button class="sib-chip" data-value="range">بازه تاریخ</button>
              </div>
              <div class="sib-date-range" id="sib-date-range">
                <input class="sib-input sib-date" id="sib-date-from" placeholder="از تاریخ" />
                <input class="sib-input sib-date" id="sib-date-to" placeholder="تا تاریخ" />
              </div>
            </div>
          </div>
          <div id="sib-table-wrap" class="sib-stack" style="margin-top:16px;"></div>
        </div>
      </div>
    `;

    qsa(".sib-date").forEach((input) => datepicker.attach(input));

    const state = {
      page: 1,
      per_page: 10,
      search: "",
      payment_status: "",
      publish_status: "",
      date_from: "",
      date_to: "",
      order: "desc",
    };

    const wrap = qs("#sib-table-wrap");
    const dateRange = qs("#sib-date-range");
    const dateFrom = qs("#sib-date-from");
    const dateTo = qs("#sib-date-to");

    let dropdownBound = false;

    const setActiveChip = (group, button) => {
      group.querySelectorAll(".sib-chip").forEach((chip) => {
        chip.classList.remove("active");
      });
      button.classList.add("active");
    };

    const closeDropdowns = () => {
      qsa(".sib-dropdown.open", wrap).forEach((dropdown) => {
        dropdown.classList.remove("open");
      });
    };

    const renderTable = (data) => {
      if (!data.items.length) {
        wrap.innerHTML = `
          <div class="sib-empty-state">
            <div class="sib-empty-icon">🧾</div>
            <div>فاکتوری یافت نشد.</div>
            <a class="sib-btn sib-btn-primary" href="${adminConfig.adminBase}?page=sib-invoice-new">ساخت فاکتور جدید</a>
          </div>
        `;
        return;
      }

      const rows = data.items
        .map((item) => {
          const publishBadge =
            item.publish_status === "issued" ? "blue" : "orange";
          const paymentBadge =
            item.payment_status === "paid"
              ? "green"
              : item.payment_status === "partial"
              ? "orange"
              : "red";
          const publishLabel =
            item.publish_status === "issued" ? "صادر شده" : "پیش‌نویس";
          const paymentLabel =
            item.payment_status === "paid"
              ? "تسویه شده"
              : item.payment_status === "partial"
              ? "پرداخت جزئی"
              : "پرداخت نشده";

          return `
          <tr>
            <td>${item.invoice_number || "-"}</td>
            <td>${item.client_name || "-"}</td>
            <td>${item.issue_date || "-"}</td>
            <td>${formatMoney(item.total)}</td>
            <td><span class="sib-badge ${paymentBadge}">${paymentLabel}</span></td>
            <td><span class="sib-badge ${publishBadge}">${publishLabel}</span></td>
            <td>
              <div class="sib-dropdown">
                <button class="sib-icon-btn" data-menu-toggle aria-label="عملیات">⋯</button>
                <div class="sib-dropdown-menu">
                  <a href="${adminConfig.adminBase}?page=sib-invoice-new&invoice_id=${item.id}">ویرایش</a>
                  <button data-action="print" data-url="${item.print_url}">نسخه چاپی</button>
                  <button data-action="copy" data-url="${item.print_url}">کپی لینک</button>
                  <button class="danger" data-action="delete" data-id="${item.id}">حذف</button>
                </div>
              </div>
            </td>
          </tr>
        `;
        })
        .join("");

      wrap.innerHTML = `
        <div class="sib-table-shell">
          <table class="sib-table sib-table--compact sib-list-table">
            <colgroup>
              <col style="width: 12%">
              <col style="width: 18%">
              <col style="width: 12%">
              <col style="width: 14%">
              <col style="width: 14%">
              <col style="width: 14%">
              <col style="width: 16%">
            </colgroup>
            <thead>
              <tr>
                <th>شماره فاکتور</th>
                <th>مشتری</th>
                <th>تاریخ صدور</th>
                <th>مبلغ نهایی</th>
                <th>وضعیت پرداخت</th>
                <th>وضعیت انتشار</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="sib-pagination">
          <button class="sib-btn" ${
            state.page <= 1 ? "disabled" : ""
          } data-page="prev">قبلی</button>
          <span>صفحه ${state.page} از ${data.total_pages || 1}</span>
          <button class="sib-btn" ${
            state.page >= data.total_pages ? "disabled" : ""
          } data-page="next">بعدی</button>
        </div>
      `;

      wrap.querySelectorAll("[data-menu-toggle]").forEach((btn) => {
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          const dropdown = btn.closest(".sib-dropdown");
          if (!dropdown) {
            return;
          }
          const isOpen = dropdown.classList.contains("open");
          closeDropdowns();
          if (!isOpen) {
            dropdown.classList.add("open");
          }
        });
      });

      wrap.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const action = btn.getAttribute("data-action");
          const id = btn.getAttribute("data-id");
          const url = btn.getAttribute("data-url");
          btn.closest(".sib-dropdown")?.classList.remove("open");

          if (action === "delete") {
            const confirmed = await ui.confirm(
              "حذف این فاکتور قطعی است. ادامه می‌دهید؟"
            );
            if (!confirmed) {
              return;
            }
            try {
              await api.delete(`/invoices/${id}`);
              loadInvoices();
            } catch (err) {
              notify("حذف فاکتور ناموفق بود.", "error");
            }
          }

          if (action === "print") {
            if (url) {
              window.open(url, "_blank");
            } else {
              notify("لینک نسخه چاپی یافت نشد.", "error");
            }
          }

          if (action === "copy") {
            if (url) {
              copyText(url);
            } else {
              notify("لینک نسخه چاپی یافت نشد.", "error");
            }
          }
        });
      });

      wrap.querySelectorAll("[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const dir = btn.getAttribute("data-page");
          if (dir === "prev" && state.page > 1) {
            state.page -= 1;
            loadInvoices();
          }
          if (dir === "next" && state.page < data.total_pages) {
            state.page += 1;
            loadInvoices();
          }
        });
      });

      if (!dropdownBound) {
        dropdownBound = true;
        document.addEventListener("click", (event) => {
          if (!event.target.closest(".sib-dropdown")) {
            closeDropdowns();
          }
        });
      }
    };

    const loadInvoices = async () => {
      wrap.innerHTML = '<div class="sib-empty">در حال بارگذاری...</div>';
      try {
        const data = await api.get("invoices", state);
        renderTable(data);
      } catch (err) {
        wrap.innerHTML = '<div class="sib-empty">بارگذاری ناموفق بود.</div>';
      }
    };

    let searchTimer = null;
    qs("#sib-search").addEventListener("input", (event) => {
      const value = event.target.value.trim();
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
      searchTimer = setTimeout(() => {
        state.search = value;
        state.page = 1;
        loadInvoices();
      }, 300);
    });

    const paymentGroup = qs("#sib-payment-chips");
    const publishGroup = qs("#sib-publish-chips");
    const dateGroup = qs("#sib-date-chips");

    const bindChipGroup = (group, key) => {
      group.addEventListener("click", (event) => {
        const button = event.target.closest(".sib-chip");
        if (!button) {
          return;
        }
        setActiveChip(group, button);
        state[key] = button.dataset.value || "";
        state.page = 1;
        loadInvoices();
      });
    };

    bindChipGroup(paymentGroup, "payment_status");
    bindChipGroup(publishGroup, "publish_status");

    dateGroup.addEventListener("click", (event) => {
      const button = event.target.closest(".sib-chip");
      if (!button) {
        return;
      }
      setActiveChip(dateGroup, button);
      const value = button.dataset.value;
      if (value === "range") {
        dateRange.classList.add("active");
        return;
      }
      dateRange.classList.remove("active");
      dateFrom.value = "";
      dateTo.value = "";
      state.date_from = "";
      state.date_to = "";
      state.page = 1;
      loadInvoices();
    });

    const applyDateRange = () => {
      if (!dateRange.classList.contains("active")) {
        return;
      }
      state.date_from = dateFrom.value.trim();
      state.date_to = dateTo.value.trim();
      state.page = 1;
      loadInvoices();
    };

    dateFrom.addEventListener("change", applyDateRange);
    dateTo.addEventListener("change", applyDateRange);
    dateFrom.addEventListener("input", applyDateRange);
    dateTo.addEventListener("input", applyDateRange);

    qs("#sib-order").addEventListener("change", (event) => {
      state.order = event.target.value;
      state.page = 1;
      loadInvoices();
    });

    loadInvoices();
  };
  const renderBuilderPage = async () => {
    const invoiceId = getQueryParam("invoice_id");
    let currentInvoice = null;
    let services = [];

    app.innerHTML = `
      <div class="sib-shell">
        <div class="sib-header">
          <div>
            <div class="sib-breadcrumb">فاکتورساز / افزودن فاکتور</div>
            <h1>سازنده فاکتور</h1>
          </div>
          <div class="sib-header-actions">
            <div class="sib-total" id="sib-total-display">۰</div>
          </div>
        </div>
        <div class="sib-columns">
          <div class="sib-stack">
            <div class="sib-card">
              <div class="sib-card-head">
                <h3>اطلاعات مشتری</h3>
              </div>
              <div class="sib-grid sib-grid-2">
                <div class="sib-input-group">
                  <label>نام مشتری/شرکت</label>
                  <input class="sib-input" id="sib-client-name" />
                </div>
                <div class="sib-input-group">
                  <label>شماره تماس ۱</label>
                  <input class="sib-input" id="sib-client-phone1" />
                </div>
                <div class="sib-input-group">
                  <label>شماره تماس ۲</label>
                  <input class="sib-input" id="sib-client-phone2" />
                </div>
                <div class="sib-input-group">
                  <label>ایمیل</label>
                  <input class="sib-input" id="sib-client-email" />
                </div>
                <div class="sib-input-group sib-span-2">
                  <label>آدرس مشتری</label>
                  <textarea class="sib-textarea" id="sib-client-address"></textarea>
                </div>
              </div>
            </div>

            <div class="sib-card">
              <div class="sib-card-head">
                <h3>اطلاعات فاکتور</h3>
              </div>
              <div class="sib-grid sib-grid-2">
                <div class="sib-input-group">
                  <label>شماره فاکتور</label>
                  <div class="sib-toolbar">
                    <input class="sib-input" id="sib-invoice-number" disabled />
                    <button class="sib-btn sib-btn-ghost" id="sib-copy-number">کپی</button>
                  </div>
                </div>
                <div class="sib-input-group">
                  <label>تاریخ صدور (شمسی)</label>
                  <input class="sib-input sib-date" id="sib-issue-date" />
                </div>
                <div class="sib-input-group">
                  <label>نوع سند</label>
                  <label style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" id="sib-proforma" />
                    پیش‌فاکتور
                  </label>
                  <div class="sib-card-note">در نسخه چاپی واترمارک پیش‌نویس نمایش داده می‌شود.</div>
                </div>
              </div>
            </div>

            <div class="sib-card">
              <div class="sib-card-head">
                <h3>آیتم‌های فاکتور</h3>
                <button class="sib-btn" id="sib-add-row">افزودن ردیف</button>
              </div>
              <div class="sib-toolbar" style="margin-bottom:12px;">
                <input class="sib-input" id="sib-service-search" list="sib-services" placeholder="انتخاب از خدمات ثبت‌شده" />
                <datalist id="sib-services"></datalist>
                <button class="sib-btn" id="sib-add-service">افزودن خدمت</button>
              </div>
              <div class="sib-table-shell">
                <table class="sib-table" id="sib-items-table">
                  <thead>
                    <tr>
                      <th>عنوان</th>
                      <th>توضیح</th>
                      <th>تعداد</th>
                      <th>واحد</th>
                      <th>قیمت</th>
                      <th>تخفیف</th>
                      <th>نوع تخفیف</th>
                      <th>مالیات</th>
                      <th>حذف</th>
                    </tr>
                  </thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="sib-stack sib-sticky">
            <div class="sib-card sib-summary-card">
              <div class="sib-card-head">
                <h3>جمع‌بندی</h3>
                <button class="sib-btn sib-btn-ghost" id="sib-toggle-advanced">جزئیات بیشتر</button>
              </div>
              <div class="sib-summary-row"><span>جمع جزء</span><strong id="sib-subtotal">0</strong></div>
              <div class="sib-summary-row"><span>تخفیف کل</span><strong id="sib-global-disc">0</strong></div>
              <div class="sib-summary-row"><span>مالیات</span><strong id="sib-vat-total">0</strong></div>
              <div class="sib-summary-row"><span>هزینه جانبی</span><strong id="sib-extra-total">0</strong></div>
              <div class="sib-summary-row" id="sib-paid-row" style="display:none;">
                <span>مبلغ پرداخت‌شده</span><strong id="sib-paid-total">0</strong>
              </div>
              <div class="sib-summary-total"><span id="sib-grand-total-label">مبلغ نهایی</span><strong id="sib-grand-total">0</strong></div>
              <div class="sib-card-note">مبالغ به تومان هستند.</div>
              <div class="sib-advanced" id="sib-advanced-box">
                <div class="sib-divider"></div>
                <div class="sib-grid sib-grid-2">
                  <div class="sib-input-group">
                    <label>مالیات</label>
                    <label style="display:flex; align-items:center; gap:8px;">
                      <input type="checkbox" id="sib-vat-enabled" />
                      فعال شود
                    </label>
                  </div>
                  <div class="sib-input-group">
                    <label>درصد مالیات</label>
                      <input class="sib-input" id="sib-vat-percent" type="text" inputmode="decimal" />
                  </div>
                  <div class="sib-input-group">
                    <label>تخفیف کل</label>
                    <div class="sib-input-unit">
                      <input class="sib-input" id="sib-global-disc-input" type="text" inputmode="decimal" />
                      <span class="sib-unit" id="sib-global-disc-unit">تومان</span>
                    </div>
                  </div>
                  <div class="sib-input-group">
                    <label>نوع تخفیف</label>
                    <select class="sib-select" id="sib-global-disc-type">
                      <option value="amount">مبلغی</option>
                      <option value="percent">درصدی</option>
                    </select>
                  </div>
                  <div class="sib-input-group">
                    <label>هزینه جانبی</label>
                    <div class="sib-input-unit">
                      <input class="sib-input" id="sib-extra" type="text" inputmode="decimal" />
                      <span class="sib-unit">تومان</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="sib-card">
              <div class="sib-card-head">
                <h3>وضعیت پرداخت</h3>
              </div>
              <div class="sib-input-group">
                <label>وضعیت انتشار</label>
                <div class="sib-segmented" id="sib-publish-toggle">
                  <button type="button" data-value="draft" class="active">پیش‌نویس</button>
                  <button type="button" data-value="issued">صادر شده</button>
                </div>
                <input type="hidden" id="sib-publish-status" value="draft" />
              </div>
                <div class="sib-input-group">
                  <label>وضعیت پرداخت</label>
                  <select class="sib-select" id="sib-payment-status">
                    <option value="unpaid">پرداخت نشده</option>
                    <option value="partial">پرداخت جزئی</option>
                    <option value="paid">تسویه شده</option>
                  </select>
                </div>
                <div class="sib-input-group" id="sib-paid-amount-wrap" style="display:none;">
                  <label>مبلغ پرداخت‌شده</label>
                  <div class="sib-input-unit">
                    <input class="sib-input" id="sib-paid-amount" type="text" inputmode="decimal" />
                    <span class="sib-unit">تومان</span>
                  </div>
                </div>
                <div class="sib-grid sib-grid-2">
                <div class="sib-input-group">
                  <label>تاریخ سررسید (شمسی)</label>
                  <input class="sib-input sib-date" id="sib-due-date" />
                </div>
                <div class="sib-input-group">
                  <label>تاریخ پرداخت (شمسی)</label>
                  <input class="sib-input sib-date" id="sib-paid-at" />
                </div>
              </div>
              <div class="sib-input-group" style="margin-top:12px;">
                <label>توضیحات پرداخت</label>
                <textarea class="sib-textarea" id="sib-paid-note"></textarea>
              </div>
            </div>
          </div>
        </div>

        <div class="sib-actions-bar">
          <div class="sib-actions-left">
            <button class="sib-btn sib-btn-primary" id="sib-print-btn">مشاهده نسخه چاپی</button>
            <button class="sib-btn" id="sib-save-btn">ذخیره</button>
            <button class="sib-btn sib-btn-ghost" id="sib-copy-btn">کپی لینک مشتری</button>
          </div>
          <div class="sib-actions-right">
            <button class="sib-btn sib-btn-danger" id="sib-delete-btn">حذف</button>
          </div>
        </div>
      </div>
    `;

    qsa(".sib-date").forEach((input) => datepicker.attach(input));

      const itemsTableBody = qs("#sib-items-table tbody");
      const publishToggle = qs("#sib-publish-toggle");
      const publishInput = qs("#sib-publish-status");
      const advancedBtn = qs("#sib-toggle-advanced");
      const advancedBox = qs("#sib-advanced-box");
      const paymentStatusSelect = qs("#sib-payment-status");
      const paidAmountWrap = qs("#sib-paid-amount-wrap");
      const paidAmountInput = qs("#sib-paid-amount");

      const togglePaidAmount = () => {
        if (!paymentStatusSelect || !paidAmountWrap) {
          return;
        }
        const isPartial = paymentStatusSelect.value === "partial";
        paidAmountWrap.style.display = isPartial ? "" : "none";
      };

    const setPublishStatus = (value) => {
      const nextValue = value === "issued" ? "issued" : "draft";
      publishInput.value = nextValue;
      qsa("button", publishToggle).forEach((button) => {
        button.classList.toggle("active", button.dataset.value === nextValue);
      });
    };

      publishToggle.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-value]");
        if (!button) {
          return;
        }
        setPublishStatus(button.dataset.value);
      });

    advancedBtn.addEventListener("click", () => {
      advancedBox.classList.toggle("active");
      advancedBtn.textContent = advancedBox.classList.contains("active")
        ? "کمتر"
        : "جزئیات بیشتر";
    });

    qs("#sib-copy-number").addEventListener("click", (event) => {
      event.preventDefault();
      const number = qs("#sib-invoice-number").value.trim();
      if (number) {
        copyText(number);
      }
    });

    const addItemRow = (item = {}) => {
      const row = document.createElement("tr");
      row.dataset.itemRow = "true";
      row.innerHTML = `
        <td><input class="sib-input" data-field="title" value="${
          item.title || ""
        }" /></td>
        <td><input class="sib-input" data-field="desc" value="${
          item.desc || ""
        }" /></td>
          <td><input class="sib-input" data-field="qty" type="text" inputmode="decimal" value="${
            item.qty ?? 1
          }" /></td>
        <td><input class="sib-input" data-field="unit" value="${
          item.unit || ""
        }" /></td>
        <td>
          <div class="sib-input-unit">
            <input class="sib-input" data-field="price" type="text" inputmode="decimal" value="${
              item.price ?? 0
            }" />
            <span class="sib-unit">تومان</span>
          </div>
        </td>
        <td>
          <div class="sib-input-unit">
            <input class="sib-input" data-field="disc" type="text" inputmode="decimal" value="${
              item.disc ?? 0
            }" />
            <span class="sib-unit" data-disc-unit>تومان</span>
          </div>
        </td>
        <td>
          <select class="sib-select" data-field="disc_type">
            <option value="amount" ${
              item.disc_type === "amount" ? "selected" : ""
            }>مبلغی</option>
            <option value="percent" ${
              item.disc_type === "percent" ? "selected" : ""
            }>درصدی</option>
          </select>
        </td>
        <td>
          <label style="display:flex; align-items:center; gap:6px; justify-content:center;">
            <input type="checkbox" data-field="taxable" ${
              item.taxable ? "checked" : ""
            } />
          </label>
        </td>
        <td><button class="sib-icon-btn" data-remove aria-label="حذف">🗑️</button></td>
      `;
      const discTypeSelect = row.querySelector('[data-field="disc_type"]');
      const discUnit = row.querySelector("[data-disc-unit]");
      if (discTypeSelect && discUnit) {
        const syncDiscUnit = () => {
          discUnit.textContent =
            discTypeSelect.value === "percent" ? "درصد" : "تومان";
        };
        syncDiscUnit();
        discTypeSelect.addEventListener("change", syncDiscUnit);
      }
      itemsTableBody.appendChild(row);
      updateTotals();
    };

    const collectItems = () => {
      return qsa("tr[data-item-row]", itemsTableBody).map((row) => {
        const read = (field) => {
          const input = row.querySelector(`[data-field="${field}"]`);
          if (!input) return "";
          if (input.type === "checkbox") {
            return input.checked;
          }
          return input.value;
        };

        return {
          title: read("title").trim(),
          desc: read("desc").trim(),
          qty: formatValue(read("qty")),
          unit: read("unit").trim(),
          price: formatValue(read("price")),
          disc: formatValue(read("disc")),
          disc_type: read("disc_type") === "percent" ? "percent" : "amount",
          taxable: !!read("taxable"),
        };
      });
    };

    const collectSummary = () => ({
      vat_enabled: qs("#sib-vat-enabled").checked,
      vat_percent: formatValue(qs("#sib-vat-percent").value),
      extra: formatValue(qs("#sib-extra").value),
      global_disc: formatValue(qs("#sib-global-disc-input").value),
      global_disc_type: qs("#sib-global-disc-type").value,
    });

    const updateTotals = () => {
      const totals = computeTotals(collectItems(), collectSummary());
      const paidAmount = formatValue(paidAmountInput?.value);
      const isPartial = paymentStatusSelect?.value === "partial";
      const netTotal =
        isPartial && paidAmount > 0
          ? Math.max(0, totals.total - paidAmount)
          : totals.total;
      const paidRow = qs("#sib-paid-row");
      const paidValue = qs("#sib-paid-total");
      const totalLabel = qs("#sib-grand-total-label");
      const globalDiscUnit = qs("#sib-global-disc-unit");
      const globalDiscType = qs("#sib-global-disc-type")?.value;

      if (globalDiscUnit) {
        globalDiscUnit.textContent =
          globalDiscType === "percent" ? "درصد" : "تومان";
      }

      if (paidRow && paidValue && isPartial && paidAmount > 0) {
        paidRow.style.display = "";
        paidValue.textContent = formatMoney(paidAmount);
        if (totalLabel) {
          totalLabel.textContent = "مبلغ باقی‌مانده";
        }
      } else if (paidRow && paidValue) {
        paidRow.style.display = "none";
        paidValue.textContent = formatMoney(0);
        if (totalLabel) {
          totalLabel.textContent = "مبلغ نهایی";
        }
      }
      qs("#sib-subtotal").textContent = formatMoney(totals.subTotal);
      qs("#sib-global-disc").textContent = formatMoney(totals.globalDiscValue);
      qs("#sib-vat-total").textContent = formatMoney(totals.vatTotal);
      qs("#sib-extra-total").textContent = formatMoney(totals.extra);
      qs("#sib-grand-total").textContent = formatMoney(netTotal);
      qs("#sib-total-display").textContent = formatMoney(netTotal);
    };

      if (paymentStatusSelect) {
        paymentStatusSelect.addEventListener("change", () => {
          togglePaidAmount();
          updateTotals();
        });
        paymentStatusSelect.addEventListener("input", updateTotals);
      }

      if (paidAmountInput) {
        paidAmountInput.addEventListener("input", updateTotals);
        paidAmountInput.addEventListener("change", updateTotals);
      }

    itemsTableBody.addEventListener("input", updateTotals);
    itemsTableBody.addEventListener("change", updateTotals);

    itemsTableBody.addEventListener("click", (event) => {
      const target = event.target;
      if (target && target.hasAttribute("data-remove")) {
        event.preventDefault();
        target.closest("tr")?.remove();
        updateTotals();
      }
    });

    itemsTableBody.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }
      const rows = qsa("tr[data-item-row]", itemsTableBody);
      if (!rows.length || !rows[rows.length - 1].contains(event.target)) {
        return;
      }
      event.preventDefault();
      addItemRow({
        qty: 1,
        price: 0,
        disc: 0,
        disc_type: "amount",
        taxable: false,
      });
    });

    qs("#sib-add-row").addEventListener("click", (event) => {
      event.preventDefault();
      addItemRow({
        qty: 1,
        price: 0,
        disc: 0,
        disc_type: "amount",
        taxable: false,
      });
    });

    qs("#sib-add-service").addEventListener("click", (event) => {
      event.preventDefault();
      const search = qs("#sib-service-search");
      const value = search.value.trim();
      const service = services.find((item) => item.title === value);
      if (!service) {
        notify("خدمت مورد نظر یافت نشد.", "error");
        return;
      }
      addItemRow({
        title: service.title,
        desc: service.desc,
        qty: service.qty,
        unit: service.unit,
        price: service.price,
        disc: 0,
        disc_type: "amount",
        taxable: true,
      });
      search.value = "";
    });

    const attachSummaryListeners = () => {
      [
        "#sib-vat-enabled",
        "#sib-vat-percent",
        "#sib-extra",
        "#sib-global-disc-input",
        "#sib-global-disc-type",
      ].forEach((selector) => {
        qs(selector).addEventListener("input", updateTotals);
        qs(selector).addEventListener("change", updateTotals);
      });
    };
    const loadServices = async () => {
      try {
        const data = await api.get("services");
        services = data.items || [];
        const datalist = qs("#sib-services");
        datalist.innerHTML = services
          .map((service) => `<option value="${service.title}"></option>`)
          .join("");
      } catch (err) {
        services = [];
      }
    };

    const fillForm = (invoice) => {
      qs("#sib-client-name").value = invoice.client?.name || "";
      qs("#sib-client-phone1").value = invoice.client?.phone1 || "";
      qs("#sib-client-phone2").value = invoice.client?.phone2 || "";
      qs("#sib-client-email").value = invoice.client?.email || "";
      qs("#sib-client-address").value = invoice.client?.address || "";

      qs("#sib-invoice-number").value = invoice.invoice?.number || "";
      qs("#sib-issue-date").value =
        invoice.invoice?.issue_date_shamsi || jalali.today();
      qs("#sib-proforma").checked = !!invoice.invoice?.is_proforma;

      itemsTableBody.innerHTML = "";
      const items = invoice.items && invoice.items.length ? invoice.items : [];
      items.forEach((item) => addItemRow(item));
      if (!items.length) {
        addItemRow({
          qty: 1,
          price: 0,
          disc: 0,
          disc_type: "amount",
          taxable: false,
        });
      }

      qs("#sib-vat-enabled").checked = !!invoice.summary?.vat_enabled;
      qs("#sib-vat-percent").value = invoice.summary?.vat_percent ?? 9;
      qs("#sib-extra").value = invoice.summary?.extra ?? 0;
      qs("#sib-global-disc-input").value = invoice.summary?.global_disc ?? 0;
      qs("#sib-global-disc-type").value =
        invoice.summary?.global_disc_type || "amount";

        setPublishStatus(invoice.status?.publish_status || "draft");
        qs("#sib-payment-status").value =
          invoice.status?.payment_status || "unpaid";
        if (paidAmountInput) {
          paidAmountInput.value = invoice.status?.paid_amount ?? 0;
        }
        qs("#sib-due-date").value = invoice.status?.due_date || "";
        qs("#sib-paid-at").value = invoice.status?.paid_at || "";
        qs("#sib-paid-note").value = invoice.status?.paid_note || "";

        togglePaidAmount();
        updateTotals();
      };

    const collectInvoice = () => ({
      client: {
        name: qs("#sib-client-name").value.trim(),
        phone1: qs("#sib-client-phone1").value.trim(),
        phone2: qs("#sib-client-phone2").value.trim(),
        email: qs("#sib-client-email").value.trim(),
        address: qs("#sib-client-address").value.trim(),
      },
      invoice: {
        number: qs("#sib-invoice-number").value.trim(),
        issue_date_shamsi: qs("#sib-issue-date").value.trim(),
        is_proforma: qs("#sib-proforma").checked,
      },
      items: collectItems(),
      summary: collectSummary(),
        status: {
          publish_status: qs("#sib-publish-status").value,
          payment_status: qs("#sib-payment-status").value,
          due_date: qs("#sib-due-date").value.trim(),
          paid_at: qs("#sib-paid-at").value.trim(),
          paid_amount: formatValue(qs("#sib-paid-amount")?.value),
          paid_note: qs("#sib-paid-note").value.trim(),
        },
      });

    qs("#sib-save-btn").addEventListener("click", async () => {
      const payload = collectInvoice();
      if (!payload.client.name) {
        notify("نام مشتری را وارد کنید.", "error");
        return;
      }
      const hasItems = payload.items.some(
        (item) => item.title || item.price > 0
      );
      if (!hasItems) {
        notify("حداقل یک آیتم با عنوان یا مبلغ وارد کنید.", "error");
        return;
      }
      try {
        let response;
        if (currentInvoice && currentInvoice.id) {
          response = await api.put(`/invoices/${currentInvoice.id}`, payload);
        } else {
          response = await api.post("/invoices", payload);
        }
        currentInvoice = response;
        fillForm(response);
        notify("فاکتور ذخیره شد.", "success");
      } catch (err) {
        notify("ذخیره فاکتور ناموفق بود.", "error");
      }
    });

    qs("#sib-print-btn").addEventListener("click", async () => {
      if (currentInvoice?.print_url) {
        window.open(currentInvoice.print_url, "_blank");
        return;
      }
      notify("ابتدا فاکتور را ذخیره کنید.", "error");
    });

    qs("#sib-copy-btn").addEventListener("click", async () => {
      if (currentInvoice?.print_url) {
        copyText(currentInvoice.print_url);
        return;
      }
      notify("ابتدا فاکتور را ذخیره کنید.", "error");
    });

    qs("#sib-delete-btn").addEventListener("click", async () => {
      if (!currentInvoice?.id) {
        notify("فاکتور ذخیره نشده است.", "error");
        return;
      }
      const confirmed = await ui.confirm("حذف این فاکتور قطعی است. ادامه می‌دهید؟");
      if (!confirmed) {
        return;
      }
      try {
        await api.delete(`/invoices/${currentInvoice.id}`);
        window.location.href = `${adminConfig.adminBase}?page=sib-invoices`;
      } catch (err) {
        notify("حذف فاکتور ناموفق بود.", "error");
      }
    });

    attachSummaryListeners();

    await loadServices();

    if (invoiceId) {
      try {
        const data = await api.get(`/invoices/${invoiceId}`);
        currentInvoice = data;
        fillForm(data);
      } catch (err) {
        fillForm({
          client: {},
          invoice: { issue_date_shamsi: jalali.today() },
          items: [],
          summary: {
            vat_enabled: true,
            vat_percent: 9,
            extra: 0,
            global_disc: 0,
            global_disc_type: "amount",
          },
          status: { publish_status: "draft", payment_status: "unpaid" },
        });
      }
    } else {
      fillForm({
        client: {},
        invoice: { issue_date_shamsi: jalali.today() },
        items: [],
        summary: {
          vat_enabled: true,
          vat_percent: 9,
          extra: 0,
          global_disc: 0,
          global_disc_type: "amount",
        },
        status: { publish_status: "draft", payment_status: "unpaid" },
      });
    }
  };
  const renderServicesPage = async () => {
    app.innerHTML = `
      <div class="sib-shell">
        <div class="sib-header">
          <div>
            <div class="sib-breadcrumb">فاکتورساز / خدمات</div>
            <h1>خدمات</h1>
          </div>
          <div class="sib-header-actions">
            <div class="sib-avatar">ش</div>
            <button class="sib-btn sib-btn-primary" id="sib-service-focus">افزودن خدمت</button>
          </div>
        </div>
        <div class="sib-card sib-stack">
          <div class="sib-toolbar">
            <div class="sib-search">
              <input class="sib-input" id="sib-service-search-input" placeholder="جستجو در خدمات..." />
              <span>⌕</span>
            </div>
          </div>
          <div id="sib-services-table"></div>
        </div>
        <div class="sib-card" style="margin-top:18px;">
          <div class="sib-card-head">
            <h3>افزودن / ویرایش خدمت</h3>
          </div>
          <div class="sib-service-form">
            <div class="sib-input-group">
              <label>عنوان خدمت</label>
              <input class="sib-input" id="sib-service-title" />
            </div>
            <div class="sib-input-group">
              <label>قیمت</label>
              <div class="sib-input-unit">
                <input class="sib-input" id="sib-service-price" type="text" inputmode="decimal" />
                <span class="sib-unit">تومان</span>
              </div>
            </div>
            <div class="sib-input-group">
              <label>واحد</label>
              <input class="sib-input" id="sib-service-unit" />
            </div>
            <div class="sib-input-group">
              <label>تعداد پیش‌فرض</label>
              <input class="sib-input" id="sib-service-qty" type="text" inputmode="decimal" />
            </div>
            <div class="sib-input-group">
              <label>توضیح کوتاه</label>
              <input class="sib-input" id="sib-service-desc" />
            </div>
          </div>
          <div class="sib-actions-left" style="margin-top:12px;">
            <button class="sib-btn sib-btn-primary" id="sib-service-save">ذخیره خدمت</button>
            <button class="sib-btn" id="sib-service-reset">پاک کردن فرم</button>
          </div>
        </div>
      </div>
    `;

    let services = [];
    let editingId = null;
    qs("#sib-service-focus").addEventListener("click", () => {
      qs("#sib-service-title")?.focus();
    });

    const renderTable = (items) => {
      const wrap = qs("#sib-services-table");
      if (!items.length) {
        wrap.innerHTML = `
          <div class="sib-empty-state">
            <div class="sib-empty-icon">✦</div>
            <div>خدمتی ثبت نشده است.</div>
            <button class="sib-btn sib-btn-primary" id="sib-service-empty-add">افزودن خدمت</button>
          </div>
        `;
        qs("#sib-service-empty-add")?.addEventListener("click", () => {
          qs("#sib-service-title")?.focus();
        });
        return;
      }

      const rows = items
        .map(
          (service) => `
        <tr>
          <td>${service.title}</td>
          <td>${formatMoney(service.price)}</td>
          <td>${service.unit}</td>
          <td>${service.qty}</td>
          <td>${service.desc}</td>
          <td>
            <div class="sib-inline-actions">
              <button class="sib-btn" data-action="edit" data-id="${service.id}">ویرایش</button>
              <button class="sib-btn sib-btn-danger" data-action="delete" data-id="${service.id}">حذف</button>
            </div>
          </td>
        </tr>
      `
        )
        .join("");

      wrap.innerHTML = `
        <div class="sib-table-shell">
          <table class="sib-table sib-table--compact">
            <colgroup>
              <col style="width: 24%">
              <col style="width: 14%">
              <col style="width: 10%">
              <col style="width: 12%">
              <col style="width: 24%">
              <col style="width: 16%">
            </colgroup>
            <thead>
              <tr>
                <th>عنوان خدمت</th>
                <th>قیمت</th>
                <th>واحد</th>
                <th>تعداد پیش‌فرض</th>
                <th>توضیح کوتاه</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      wrap.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const action = btn.getAttribute("data-action");
          const id = parseInt(btn.getAttribute("data-id"), 10);
          const service = services.find((item) => item.id === id);

          if (action === "edit" && service) {
            editingId = id;
            qs("#sib-service-title").value = service.title;
            qs("#sib-service-price").value = service.price;
            qs("#sib-service-unit").value = service.unit;
            qs("#sib-service-qty").value = service.qty;
            qs("#sib-service-desc").value = service.desc;
          }

          if (action === "delete") {
            const confirmed = await ui.confirm("حذف این خدمت قطعی است. ادامه می‌دهید؟");
            if (!confirmed) {
              return;
            }
            try {
              const response = await api.delete(`/services/${id}`);
              services = response.items || [];
              renderTable(services);
            } catch (err) {
              notify("حذف خدمت ناموفق بود.", "error");
            }
          }
        });
      });
    };

    const loadServices = async () => {
      try {
        const data = await api.get("services");
        services = data.items || [];
        renderTable(services);
      } catch (err) {
        qs("#sib-services-table").innerHTML =
          '<div class="sib-empty">بارگذاری خدمات ناموفق بود.</div>';
      }
    };

    qs("#sib-service-save").addEventListener("click", async () => {
      const payload = {
        title: qs("#sib-service-title").value.trim(),
        price: formatValue(qs("#sib-service-price").value),
        unit: qs("#sib-service-unit").value.trim(),
        qty: formatValue(qs("#sib-service-qty").value || 1),
        desc: qs("#sib-service-desc").value.trim(),
      };

      try {
        let response;
        if (editingId) {
          response = await api.put(`/services/${editingId}`, payload);
        } else {
          response = await api.post("/services", payload);
        }
        services = response.items || [];
        renderTable(services);
        editingId = null;
        qs("#sib-service-reset").click();
        notify("خدمت ذخیره شد.", "success");
      } catch (err) {
        notify("ذخیره خدمت ناموفق بود.", "error");
      }
    });

    qs("#sib-service-reset").addEventListener("click", () => {
      editingId = null;
      qs("#sib-service-title").value = "";
      qs("#sib-service-price").value = "";
      qs("#sib-service-unit").value = "";
      qs("#sib-service-qty").value = "";
      qs("#sib-service-desc").value = "";
    });

    qs("#sib-service-search-input").addEventListener("input", (event) => {
      const term = event.target.value.trim();
      const filtered = term
        ? services.filter((service) => service.title.includes(term))
        : services;
      renderTable(filtered);
    });

    loadServices();
  };

  const renderSettingsPage = async () => {
    app.innerHTML = `
      <div class="sib-shell">
        <div class="sib-header">
          <div>
            <div class="sib-breadcrumb">فاکتورساز / تنظیمات شرکت</div>
            <h1>تنظیمات شرکت</h1>
          </div>
          <div class="sib-header-actions">
            <div class="sib-avatar">ش</div>
          </div>
        </div>
        <div class="sib-card">
          <div class="sib-card-head">
            <h3>اطلاعات شرکت</h3>
          </div>
          <div class="sib-grid sib-grid-2">
            <div class="sib-input-group">
              <label>نام شرکت / برند</label>
              <input class="sib-input" id="sib-company-name" />
            </div>
            <div class="sib-input-group">
              <label>شماره تماس</label>
              <input class="sib-input" id="sib-company-phone" />
            </div>
            <div class="sib-input-group">
              <label>ایمیل</label>
              <input class="sib-input" id="sib-company-email" />
            </div>
            <div class="sib-input-group">
              <label>آدرس</label>
              <textarea class="sib-textarea" id="sib-company-address"></textarea>
            </div>
          </div>
          <div class="sib-divider"></div>
          <div class="sib-card-head">
            <h3>لوگو</h3>
          </div>
          <div class="sib-logo-preview">
            <img id="sib-logo-preview" alt="لوگو" />
            <div>
              <button class="sib-btn" id="sib-logo-upload">انتخاب لوگو</button>
              <button class="sib-btn" id="sib-logo-remove">حذف لوگو</button>
            </div>
          </div>
          <div class="sib-divider"></div>
          <div class="sib-card-head">
            <h3>اطلاعات پرداخت</h3>
          </div>
          <div class="sib-grid sib-grid-2">
            <div class="sib-input-group">
              <label>نام بانک</label>
              <input class="sib-input" id="sib-bank-name" />
            </div>
            <div class="sib-input-group">
              <label>شماره کارت</label>
              <input class="sib-input" id="sib-card-number" />
            </div>
            <div class="sib-input-group">
              <label>شبا</label>
              <input class="sib-input" id="sib-iban" />
            </div>
            <div class="sib-input-group">
              <label>شماره حساب</label>
              <input class="sib-input" id="sib-account-number" />
            </div>
          </div>
          <div class="sib-input-group" style="margin-top:12px;">
            <label>متن شرایط / توضیحات پایین فاکتور</label>
            <textarea class="sib-textarea" id="sib-footer-note"></textarea>
          </div>
          <div class="sib-actions-bar">
            <div class="sib-actions-left">
              <button class="sib-btn sib-btn-primary" id="sib-settings-save">ذخیره تنظیمات</button>
            </div>
          </div>
        </div>
      </div>
    `;

    let logoId = 0;
    let logoUrl = "";

    const applyLogo = (url, id = 0) => {
      logoId = id;
      logoUrl = url || "";
      const img = qs("#sib-logo-preview");
      img.src =
        logoUrl ||
        "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='100%25' height='100%25' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='52%25' font-size='12' fill='%2394a3b8' text-anchor='middle'%3Eلوگو%3C/text%3E%3C/svg%3E";
    };

    const loadSettings = async () => {
      try {
        const data = await api.get("settings");
        qs("#sib-company-name").value = data.company_name || "";
        qs("#sib-company-phone").value = data.phone || "";
        qs("#sib-company-email").value = data.email || "";
        qs("#sib-company-address").value = data.address || "";
        qs("#sib-bank-name").value = data.bank_name || "";
        qs("#sib-card-number").value = data.card_number || "";
        qs("#sib-iban").value = data.iban || "";
        qs("#sib-account-number").value = data.account_number || "";
        qs("#sib-footer-note").value = data.footer_note || "";
        applyLogo(data.logo_url || "", data.logo_id || 0);
      } catch (err) {
        notify("بارگذاری تنظیمات ناموفق بود.", "error");
      }
    };

    qs("#sib-logo-upload").addEventListener("click", (event) => {
      event.preventDefault();
      if (!window.wp || !wp.media) {
        notify("کتابخانه رسانه در دسترس نیست.", "error");
        return;
      }
      const frame = wp.media({
        title: "انتخاب لوگو",
        button: { text: "استفاده از لوگو" },
        multiple: false,
      });
      frame.on("select", () => {
        const selection = frame.state().get("selection").first();
        if (!selection) return;
        const data = selection.toJSON();
        applyLogo(data.url || "", data.id || 0);
      });
      frame.open();
    });

    qs("#sib-logo-remove").addEventListener("click", (event) => {
      event.preventDefault();
      applyLogo("", 0);
    });

    qs("#sib-settings-save").addEventListener("click", async () => {
      const payload = {
        company_name: qs("#sib-company-name").value.trim(),
        phone: qs("#sib-company-phone").value.trim(),
        email: qs("#sib-company-email").value.trim(),
        address: qs("#sib-company-address").value.trim(),
        logo_id: logoId,
        logo_url: logoUrl,
        bank_name: qs("#sib-bank-name").value.trim(),
        card_number: qs("#sib-card-number").value.trim(),
        iban: qs("#sib-iban").value.trim(),
        account_number: qs("#sib-account-number").value.trim(),
        footer_note: qs("#sib-footer-note").value.trim(),
      };

      try {
        await api.put("/settings", payload);
        notify("تنظیمات ذخیره شد.", "success");
      } catch (err) {
        notify("ذخیره تنظیمات ناموفق بود.", "error");
      }
    });

    await loadSettings();
  };

  const renderStatusPage = async () => {
    app.innerHTML = `
      <div class="sib-shell">
        <div class="sib-header">
          <div>
            <div class="sib-breadcrumb">فاکتورساز / وضعیت سیستم</div>
            <h1>وضعیت سیستم</h1>
          </div>
          <div class="sib-header-actions">
            <div class="sib-avatar">ش</div>
          </div>
        </div>
        <div class="sib-card" id="sib-status-card">
          <div class="sib-empty">در حال بارگذاری...</div>
        </div>
      </div>
    `;

    const wrap = qs("#sib-status-card");
    try {
      const data = await api.get("system");
      wrap.innerHTML = `
        <div class="sib-grid sib-grid-2">
          <div class="sib-summary-row"><span>نسخه افزونه</span><strong>${data.plugin_version}</strong></div>
          <div class="sib-summary-row"><span>نسخه وردپرس</span><strong>${data.wp_version}</strong></div>
          <div class="sib-summary-row"><span>نسخه PHP</span><strong>${data.php_version}</strong></div>
          <div class="sib-summary-row"><span>حد حافظه</span><strong>${data.memory_limit}</strong></div>
          <div class="sib-summary-row"><span>منطقه زمانی</span><strong>${data.timezone}</strong></div>
          <div class="sib-summary-row"><span>تعداد فاکتور</span><strong>${data.invoices_total}</strong></div>
          <div class="sib-summary-row"><span>تعداد خدمات</span><strong>${data.services_total}</strong></div>
          <div class="sib-summary-row"><span>آدرس سایت</span><strong>${data.site_url}</strong></div>
        </div>
      `;
    } catch (err) {
      wrap.innerHTML =
        '<div class="sib-empty">بارگذاری وضعیت سیستم ناموفق بود.</div>';
    }
  };

  if (page === "list") {
    renderListPage();
  }
  if (page === "builder") {
    renderBuilderPage();
  }
  if (page === "services") {
    renderServicesPage();
  }
  if (page === "settings") {
    renderSettingsPage();
  }
  if (page === "status") {
    renderStatusPage();
  }
})();


