const NORMAL_PHONE_MINUTES_PER_WAKING_HOUR = 45;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(input) {
  return Number.parseFloat(input);
}

function timeToMinutes(timeValue) {
  const [hour, minute] = timeValue.split(":").map((v) => Number.parseInt(v, 10));
  return hour * 60 + minute;
}

function wakingHoursBetween(wakeTime, bedTime) {
  const wakeMinutes = timeToMinutes(wakeTime);
  const bedMinutes = timeToMinutes(bedTime);
  let delta = bedMinutes - wakeMinutes;

  if (delta <= 0) {
    delta += 24 * 60;
  }

  return delta / 60;
}

function scoreFromStrain(strain) {
  const centered = 100 - Math.abs(strain - 13) * 8;
  return clamp(centered, 0, 100);
}

function socialUsageSignal(socialHours, totalHours) {
  if (totalHours <= 0) return 100;
  const socialRatio = socialHours / totalHours;
  return clamp(100 - socialRatio * 100, 0, 100);
}

function screenScoreFromDayShare(totalPhoneHours, wakingHours, socialHours) {
  const baselineShare = NORMAL_PHONE_MINUTES_PER_WAKING_HOUR / 60;
  const actualShare = totalPhoneHours / wakingHours;
  const overBaselineRatio = actualShare / baselineShare;

  // At or below baseline keeps full score. Above baseline drops progressively.
  const usageScore = clamp(100 - Math.max(0, (overBaselineRatio - 1) * 100), 0, 100);
  const socialSignal = socialUsageSignal(socialHours, totalPhoneHours);
  const blendedScore = usageScore * 0.8 + socialSignal * 0.2;

  return {
    score: clamp(blendedScore, 0, 100),
    actualShare,
    baselineShare,
    socialSignal,
  };
}

function getLabel(score) {
  if (score >= 85) return "Excellent balance today.";
  if (score >= 70) return "Good overall balance.";
  if (score >= 50) return "Mixed day — room to improve.";
  return "Needs attention — recovery habits may need support.";
}

function parseWhoopPayload(payload) {
  return {
    recovery: toNumber(payload.recovery),
    sleep: toNumber(payload.sleepPerformance),
    strain: toNumber(payload.dayStrain),
    wakeTime: payload.wakeTime,
    bedTime: payload.bedTime,
  };
}

function parseScreenPayload(payload) {
  return {
    socialTime: toNumber(payload.socialHours),
    otherTime: toNumber(payload.otherHours),
  };
}

const STORAGE_KEY = "whoop-screen-score:sources";

const form = document.getElementById("score-form");
const result = document.getElementById("result");
const scoreValue = document.getElementById("score-value");
const scoreLabel = document.getElementById("score-label");
const syncStatus = document.getElementById("sync-status");

const whoopEndpointNode = document.getElementById("whoopEndpoint");
const screenEndpointNode = document.getElementById("screenEndpoint");
const apiTokenNode = document.getElementById("apiToken");
const syncButton = document.getElementById("syncButton");
const saveSourcesButton = document.getElementById("saveSources");

const wakeTimeNode = document.getElementById("wakeTime");
const bedTimeNode = document.getElementById("bedTime");
const recoveryNode = document.getElementById("recovery");
const sleepNode = document.getElementById("sleep");
const strainNode = document.getElementById("strain");
const socialTimeNode = document.getElementById("socialTime");
const otherTimeNode = document.getElementById("otherTime");

const recoveryScoreNode = document.getElementById("recovery-score");
const sleepScoreNode = document.getElementById("sleep-score");
const strainScoreNode = document.getElementById("strain-score");
const screenScoreNode = document.getElementById("screen-score");
const wakingHoursNode = document.getElementById("waking-hours");
const dayPhoneShareNode = document.getElementById("day-phone-share");
const baselineShareNode = document.getElementById("baseline-share");
const socialSignalNode = document.getElementById("social-signal");
const totalScreenTimeNode = document.getElementById("total-screen-time");

function saveSourceSettings() {
  const settings = {
    whoopEndpoint: whoopEndpointNode.value.trim(),
    screenEndpoint: screenEndpointNode.value.trim(),
    apiToken: apiTokenNode.value.trim(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  syncStatus.textContent = "Saved data source settings locally in this browser.";
}

function loadSourceSettings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const settings = JSON.parse(raw);
    whoopEndpointNode.value = settings.whoopEndpoint || "";
    screenEndpointNode.value = settings.screenEndpoint || "";
    apiTokenNode.value = settings.apiToken || "";
  } catch {
    syncStatus.textContent = "Could not read saved source settings; please re-enter them.";
  }
}

async function fetchJson(url, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

async function syncConnectedData() {
  const whoopUrl = whoopEndpointNode.value.trim();
  const screenUrl = screenEndpointNode.value.trim();
  const token = apiTokenNode.value.trim();

  if (!whoopUrl || !screenUrl) {
    syncStatus.textContent = "Please set both WHOOP and phone usage endpoint URLs.";
    return;
  }

  syncStatus.textContent = "Syncing data...";

  try {
    const [whoopPayload, screenPayload] = await Promise.all([
      fetchJson(whoopUrl, token),
      fetchJson(screenUrl, token),
    ]);

    const whoop = parseWhoopPayload(whoopPayload);
    const screen = parseScreenPayload(screenPayload);

    const allValues = [whoop.recovery, whoop.sleep, whoop.strain, screen.socialTime, screen.otherTime];
    if (allValues.some((n) => Number.isNaN(n))) {
      throw new Error("One or more synced values were invalid numbers.");
    }

    recoveryNode.value = String(clamp(whoop.recovery, 0, 100));
    sleepNode.value = String(clamp(whoop.sleep, 0, 100));
    strainNode.value = String(clamp(whoop.strain, 0, 21));
    socialTimeNode.value = String(clamp(screen.socialTime, 0, 24));
    otherTimeNode.value = String(clamp(screen.otherTime, 0, 24));

    if (typeof whoop.wakeTime === "string" && /^\d{2}:\d{2}$/.test(whoop.wakeTime)) {
      wakeTimeNode.value = whoop.wakeTime;
    }

    if (typeof whoop.bedTime === "string" && /^\d{2}:\d{2}$/.test(whoop.bedTime)) {
      bedTimeNode.value = whoop.bedTime;
    }

    syncStatus.textContent = "Sync complete. Score updated from connected data.";
    form.requestSubmit();
  } catch (error) {
    syncStatus.textContent = `Sync failed: ${error.message}`;
  }
}

function calculateScore(event) {
  event.preventDefault();

  const wakeTime = wakeTimeNode.value;
  const bedTime = bedTimeNode.value;
  const recovery = clamp(toNumber(recoveryNode.value), 0, 100);
  const sleep = clamp(toNumber(sleepNode.value), 0, 100);
  const strain = clamp(toNumber(strainNode.value), 0, 21);
  const socialTime = clamp(toNumber(socialTimeNode.value), 0, 24);
  const otherTime = clamp(toNumber(otherTimeNode.value), 0, 24);

  if (!wakeTime || !bedTime) {
    scoreLabel.textContent = "Please enter wake time and bed time.";
    result.classList.remove("hidden");
    return;
  }

  if ([recovery, sleep, strain, socialTime, otherTime].some((n) => Number.isNaN(n))) {
    scoreLabel.textContent = "Please enter valid numbers in all fields.";
    result.classList.remove("hidden");
    return;
  }

  const totalScreenTime = socialTime + otherTime;

  if (totalScreenTime > 24) {
    scoreLabel.textContent = "Social + other screen time must be 24 hours or less.";
    result.classList.remove("hidden");
    return;
  }

  const wakingHours = wakingHoursBetween(wakeTime, bedTime);

  if (wakingHours <= 0 || wakingHours > 24) {
    scoreLabel.textContent = "Please enter a valid wake/bed schedule.";
    result.classList.remove("hidden");
    return;
  }

  if (totalScreenTime > wakingHours) {
    scoreLabel.textContent = "Phone time cannot exceed waking hours.";
    result.classList.remove("hidden");
    return;
  }

  const recoveryScore = recovery;
  const sleepScore = sleep;
  const strainScore = scoreFromStrain(strain);
  const screenMetrics = screenScoreFromDayShare(totalScreenTime, wakingHours, socialTime);

  const finalScore =
    recoveryScore * 0.35 +
    sleepScore * 0.25 +
    strainScore * 0.2 +
    screenMetrics.score * 0.2;

  const roundedScore = Math.round(clamp(finalScore, 0, 100));

  scoreValue.textContent = String(roundedScore);
  scoreLabel.textContent = getLabel(roundedScore);

  recoveryScoreNode.textContent = `${Math.round(recoveryScore)} / 100`;
  sleepScoreNode.textContent = `${Math.round(sleepScore)} / 100`;
  strainScoreNode.textContent = `${Math.round(strainScore)} / 100`;
  screenScoreNode.textContent = `${Math.round(screenMetrics.score)} / 100`;
  wakingHoursNode.textContent = `${wakingHours.toFixed(1)}h`;
  dayPhoneShareNode.textContent = `${(screenMetrics.actualShare * 100).toFixed(1)}%`;
  baselineShareNode.textContent = `${(screenMetrics.baselineShare * 100).toFixed(1)}%`;
  socialSignalNode.textContent = `${Math.round(screenMetrics.socialSignal)} / 100`;
  totalScreenTimeNode.textContent = `${totalScreenTime.toFixed(1)}h`;

  result.classList.remove("hidden");
}

saveSourcesButton.addEventListener("click", saveSourceSettings);
syncButton.addEventListener("click", syncConnectedData);
form.addEventListener("submit", calculateScore);

loadSourceSettings();
