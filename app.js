/* 型態雷達 K 線觸控測試 — Lightweight Charts 5.3.0 */
(function () {
  "use strict";

  const UP = "#FF3B5C";
  const DOWN = "#00D68F";
  const BG = "#0A0E1A";
  const GRID = "#1B2236";
  const TEXT = "#8B95B2";
  const CROSS = "#2FE6FF";

  const SYMBOLS = {
    TAIEX: { file: "taiex.json", label: "加權指數", btn: "btn-taiex" },
    "2330": { file: "2330.json", btn: "btn-2330", label: "2330 台積電" },
  };

  const cache = {};
  let currentId = "TAIEX";
  let chart, candleSeries, volumeSeries, ro;
  let bars = [];
  let meta = null;

  const elChart = document.getElementById("chart");
  const elStatus = document.getElementById("status");
  const elDate = document.getElementById("leg-date");
  const elOhlcv = document.getElementById("leg-ohlcv");
  const elFooter = document.getElementById("footer");

  function fmtNum(n, digits) {
    if (n == null || Number.isNaN(n)) return "—";
    const d = digits != null ? digits : (Math.abs(n) >= 1000 ? 2 : 2);
    return Number(n).toLocaleString("zh-TW", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }

  function fmtVol(n) {
    if (n == null || Number.isNaN(n)) return "—";
    if (Math.abs(n) >= 100) {
      return Number(n).toLocaleString("zh-TW", { maximumFractionDigits: 0 });
    }
    return Number(n).toLocaleString("zh-TW", { maximumFractionDigits: 2 });
  }

  function fmtTurnover(n) {
    if (n == null || Number.isNaN(n)) return "—";
    // 以億元顯示大盤成交金額
    const yi = n / 1e8;
    return yi.toLocaleString("zh-TW", { maximumFractionDigits: 2 }) + " 億";
  }

  function clsChange(d) {
    if (d == null || d === 0) return "flat";
    return d > 0 ? "up" : "down";
  }

  function signNum(n, digits) {
    if (n == null || Number.isNaN(n)) return "—";
    const s = n > 0 ? "+" : "";
    return s + fmtNum(n, digits);
  }

  function priceDigits() {
    return currentId === "TAIEX" ? 2 : 2;
  }

  function renderLegend(bar, prev) {
    if (!bar) {
      elDate.textContent = "無資料";
      elOhlcv.innerHTML = "";
      return;
    }
    const chg = prev ? bar.close - prev.close : null;
    const pct = prev && prev.close ? (chg / prev.close) * 100 : null;
    const up = chg == null || chg === 0 ? "flat" : chg > 0 ? "up" : "down";
    elDate.textContent = bar.time;
    const volLabel = "成交量";
    const volText = fmtVol(bar.volume) + " 張";
    let extra = "";
    if (currentId === "TAIEX" && bar.turnover != null) {
      extra = `<span><span class="lab">成交金額</span><b>${fmtTurnover(bar.turnover)}</b></span>`;
    }
    elOhlcv.innerHTML = `
      <span><span class="lab">開</span><b>${fmtNum(bar.open, priceDigits())}</b></span>
      <span><span class="lab">高</span><b>${fmtNum(bar.high, priceDigits())}</b></span>
      <span><span class="lab">低</span><b>${fmtNum(bar.low, priceDigits())}</b></span>
      <span><span class="lab">收</span><b class="${up}">${fmtNum(bar.close, priceDigits())}</b></span>
      <span class="${up}"><span class="lab">漲跌</span><b>${signNum(chg, priceDigits())}（${signNum(pct, 2)}%）</b></span>
      <span><span class="lab">${volLabel}</span><b>${volText}</b></span>
      ${extra}
    `;
  }

  function showLast() {
    if (!bars.length) return;
    renderLegend(bars[bars.length - 1], bars.length > 1 ? bars[bars.length - 2] : null);
  }

  function findBar(time) {
    if (time == null) return -1;
    const key = typeof time === "object"
      ? `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`
      : String(time);
    for (let i = bars.length - 1; i >= 0; i--) {
      if (bars[i].time === key) return i;
    }
    return -1;
  }

  async function loadSymbol(id) {
    if (cache[id]) return cache[id];
    const res = await fetch(SYMBOLS[id].file, { cache: "no-cache" });
    if (!res.ok) throw new Error("無法載入 " + SYMBOLS[id].file + "（" + res.status + "）");
    const json = await res.json();
    cache[id] = json;
    return json;
  }

  function applyData(id, json) {
    currentId = id;
    meta = json.meta;
    bars = json.bars || [];
    const candleData = bars.map((b) => ({
      time: b.time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    const volData = bars.map((b) => ({
      time: b.time,
      value: b.volume == null ? 0 : b.volume,
      color: b.close >= b.open ? "rgba(255,59,92,0.55)" : "rgba(0,214,143,0.55)",
    }));
    candleSeries.setData(candleData);
    volumeSeries.setData(volData);
    chart.timeScale().fitContent();
    showLast();
    const src = meta.source || "臺灣證券交易所 TWSE";
    elFooter.innerHTML =
      `<strong>資料來源</strong> ${src}<br>` +
      `<strong>資料期間</strong> ${meta.start} 至 <strong>資料截止日</strong> ${meta.end}` +
      `　共 ${meta.bars} 根日 K　成交量單位：${meta.unit_volume || "張"}` +
      (meta.bars_without_volume ? `　（其中 ${meta.bars_without_volume} 根無成交量）` : "") +
      `<br>官方盤後資料，無任何推估或補值。圖表函式庫：<a href="https://www.tradingview.com/lightweight-charts/" style="color:#2FE6FF">TradingView Lightweight Charts</a>。建議以 Safari「分享 → 加入主畫面」全螢幕測試。`;
  }

  function setActiveButtons(id) {
    document.getElementById("btn-taiex").setAttribute("aria-pressed", id === "TAIEX" ? "true" : "false");
    document.getElementById("btn-2330").setAttribute("aria-pressed", id === "2330" ? "true" : "false");
  }

  async function switchSymbol(id) {
    if (id === currentId && bars.length) return;
    elStatus.textContent = "正在載入資料…";
    elStatus.style.display = "flex";
    try {
      const json = await loadSymbol(id);
      applyData(id, json);
      setActiveButtons(id);
      elStatus.style.display = "none";
    } catch (err) {
      elStatus.textContent = "載入失敗：" + (err && err.message ? err.message : err);
      elStatus.style.display = "flex";
    }
  }

  function create() {
    if (!window.LightweightCharts) {
      elStatus.textContent = "圖表函式庫載入失敗";
      return;
    }
    const L = LightweightCharts;
    chart = L.createChart(elChart, {
      autoSize: true,
      layout: {
        background: { type: L.ColorType.Solid, color: "#070A14" },
        textColor: TEXT,
        fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans CJK TC", sans-serif',
        panes: { separatorColor: GRID, separatorHoverColor: "rgba(47,230,255,0.25)" },
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      crosshair: {
        mode: L.CrosshairMode.Magnet,
        vertLine: { color: CROSS, width: 1, style: L.LineStyle.Dashed, labelBackgroundColor: "#163044" },
        horzLine: { color: CROSS, width: 1, style: L.LineStyle.Dashed, labelBackgroundColor: "#163044" },
      },
      rightPriceScale: {
        borderColor: GRID,
        scaleMargins: { top: 0.08, bottom: 0.04 },
      },
      timeScale: {
        borderColor: GRID,
        timeVisible: false,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 8,
        minBarSpacing: 3,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      kineticScroll: { touch: true, mouse: false },
    });

    candleSeries = chart.addSeries(L.CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      borderVisible: true,
      wickVisible: true,
    }, 0);

    volumeSeries = chart.addSeries(L.HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    }, 1);

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.2, bottom: 0 },
      borderColor: GRID,
    });

    const panes = chart.panes();
    if (panes.length >= 2) {
      panes[0].setStretchFactor(3.2);
      panes[1].setStretchFactor(1);
    }

    chart.subscribeCrosshairMove((param) => {
      if (!param || param.time == null || !param.seriesData || param.seriesData.size === 0) {
        showLast();
        return;
      }
      const i = findBar(param.time);
      if (i < 0) {
        showLast();
        return;
      }
      renderLegend(bars[i], i > 0 ? bars[i - 1] : null);
    });

    // Backup resize for rotation / Split View (library autoSize already uses ResizeObserver)
    function fitChart() {
      const r = elChart.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && chart) {
        chart.resize(Math.floor(r.width), Math.floor(r.height));
      }
    }
    ro = new ResizeObserver(() => { /* autoSize handles routine size changes */ });
    ro.observe(elChart);
    window.addEventListener("orientationchange", () => setTimeout(fitChart, 250));
    window.addEventListener("resize", () => setTimeout(fitChart, 100));
  }

  // Prevent Safari page zoom from hijacking chart pinch
  const block = (e) => { e.preventDefault(); };
  ["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
    document.addEventListener(type, block, { passive: false });
  });
  elChart.addEventListener("touchmove", (e) => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  document.getElementById("btn-taiex").addEventListener("click", () => switchSymbol("TAIEX"));
  document.getElementById("btn-2330").addEventListener("click", () => switchSymbol("2330"));
  document.getElementById("btn-reset").addEventListener("click", () => {
    if (chart) chart.timeScale().fitContent();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  create();
  switchSymbol("TAIEX");
})();
