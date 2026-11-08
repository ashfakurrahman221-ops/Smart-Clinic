/**
 * Smart Clinic Bangladesh Healthcare Presentation Utilities
 * Formats dates, times, and currency for human comfort and localized readability.
 */

/**
 * Human-friendly time formatting:
 * Converts raw backend time strings such as "01:40:16.250603", "14:30:00", or "14:30"
 * into a clean, human-readable format like "1:40 AM" or "2:30 PM".
 *
 * @param {string|Date} timeStr - Time string or Date object
 * @param {'en'|'bn'} language - Current UI language
 * @returns {string} Clean formatted time (e.g. "2:30 PM")
 */
export function formatTime(timeStr, language = "en") {
  if (!timeStr) return "--:--";

  try {
    const cleanStr = String(timeStr).trim();

    // Already formatted with 12h indicator
    if (
      cleanStr.includes("AM") ||
      cleanStr.includes("PM") ||
      cleanStr.includes("am") ||
      cleanStr.includes("pm")
    ) {
      return cleanStr;
    }

    // Strip microsecond decimals if present (e.g. "01:40:16.250603" -> "01:40:16")
    const timeWithoutMicros = cleanStr.split(".")[0];
    const parts = timeWithoutMicros.split(":");

    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1].padStart(2, "0");

      if (isNaN(hours)) return cleanStr;

      const ampm =
        hours >= 12
          ? language === "bn"
            ? "অপরাহ্ন"
            : "PM"
          : language === "bn"
          ? "পূর্বাহ্ন"
          : "AM";

      hours = hours % 12;
      hours = hours ? hours : 12; // '0' hours becomes 12

      return `${hours}:${minutes} ${ampm}`;
    }

    return timeWithoutMicros;
  } catch {
    return String(timeStr).split(".")[0];
  }
}

/**
 * Consistent Bangladesh Currency formatting:
 * Returns standard ৳ format e.g. "৳700" or "৳1,200".
 *
 * @param {number|string} amount
 * @returns {string} (e.g. "৳800")
 */
export function formatCurrency(amount) {
  if (amount == null || amount === "" || isNaN(Number(amount))) return "৳0";
  const num = Math.round(Number(amount));
  return `৳${num.toLocaleString("en-US")}`;
}

/**
 * Human-friendly date formatting:
 * Converts "2026-09-26" to "26 Sep 2026".
 *
 * @param {string|Date} dateStr
 * @param {'en'|'bn'} language
 * @returns {string}
 */
export function formatDate(dateStr, language = "en") {
  if (!dateStr) return "--";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const options = { day: "numeric", month: "short", year: "numeric" };
    return d.toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB", options);
  } catch {
    return String(dateStr);
  }
}

/**
 * Safe Doctor Name Presentation Formatter:
 * Ensures exactly one "Dr." title prefix without duplication.
 * Handles inputs like "Dr. Nusrat Jahan", "Dr. Dr. Nusrat", "Prof. Dr. Rahman", or "Nusrat Jahan".
 *
 * @param {string} name - Raw name string
 * @returns {string} (e.g. "Dr. Nusrat Jahan")
 */
export function formatDoctorName(name) {
  if (!name || typeof name !== "string") return "Doctor";
  const trimmed = name.trim();
  if (!trimmed) return "Doctor";

  // If already starts with Dr. / Dr / Doctor, normalize to exactly one "Dr. "
  if (/^dr\.?\s+/i.test(trimmed)) {
    return trimmed.replace(/^(dr\.?\s*)+/i, "Dr. ");
  }

  // If name has other clinical titles (Prof., Assoc. Prof., MD), keep as-is
  if (/^(prof|professor|assoc|md)\b/i.test(trimmed)) {
    return trimmed;
  }

  return `Dr. ${trimmed}`;
}

/**
 * Safe Chamber Room Presentation Formatter:
 * Ensures exactly one "Room" prefix without duplication.
 * Handles inputs like "Room 105, 1st Floor", "Room Room 105", or "105".
 *
 * @param {string} room - Raw room string
 * @returns {string} (e.g. "Room 105, 1st Floor")
 */
export function formatRoomNumber(room) {
  if (!room || typeof room !== "string") return "—";
  const trimmed = room.trim();
  if (!trimmed || trimmed === "—") return "—";

  // Strip duplicate "Room Room " prefixes and ensure single "Room "
  if (/^room\b/i.test(trimmed)) {
    return trimmed.replace(/^(room\s*)+/i, "Room ");
  }

  return `Room ${trimmed}`;
}

