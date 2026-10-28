(function () {
    const STORAGE_KEY = "bx_attribution";
    const MAX_AGE_DAYS = 30;

    function getParam(name) {
      return new URLSearchParams(window.location.search).get(name);
    }

    function readAttribution() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        const ageDays = (Date.now() - data.saved_at) / (1000 * 60 * 60 * 24);
        if (ageDays > MAX_AGE_DAYS) {
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }
        return data;
      } catch (e) {
        return null;
      }
    }

    function saveAttribution() {
      const utm_source = getParam("utm_source");
      const utm_medium = getParam("utm_medium");
      const utm_campaign = getParam("utm_campaign");
      const fbclid = getParam("fbclid");
      const ttclid = getParam("ttclid");
      const gclid = getParam("gclid");
      const clickId = fbclid || ttclid || gclid || null;

      if (utm_source || clickId) {
        const data = {
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          click_id: clickId,
          referrer: document.referrer || "direct",
          landing_url: window.location.pathname,
          saved_at: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return;
      }

      if (!readAttribution()) {
        const data = {
          utm_source: null,
          utm_medium: null,
          utm_campaign: null,
          click_id: null,
          referrer: document.referrer || "direct",
          landing_url: window.location.pathname,
          saved_at: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    }

    saveAttribution();

    window.getAttributionData = function () {
      const data = readAttribution() || {};
      return {
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        click_id: data.click_id || null,
        referrer: data.referrer || null,
        landing_url: data.landing_url || null,
      };
    };
  })();


