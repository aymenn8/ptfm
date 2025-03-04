import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import axios from "axios";

interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  Firstthird: string;
  Lastthird: string;
}

interface ApiResponse {
  data: {
    timings: PrayerTimings;
  };
}

interface LocationResponse {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

function formatTime(time: string): string {
  // Keep 24-hour format
  const [hours, minutes] = time.split(":");
  return `${hours}:${minutes}`;
}

function getTimeDifference(prayerTime: string): string {
  const now = new Date();
  const [hours, minutes] = prayerTime.split(":");
  const prayerDate = new Date();
  prayerDate.setHours(parseInt(hours));
  prayerDate.setMinutes(parseInt(minutes));
  prayerDate.setSeconds(0);

  // If prayer time is earlier than current time, it's for tomorrow
  if (prayerDate.getTime() < now.getTime()) {
    prayerDate.setDate(prayerDate.getDate() + 1);
  }

  const diffMs = prayerDate.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000); // Convert to minutes

  if (diffMins === 0) {
    return "now";
  }

  const hours_diff = Math.floor(Math.abs(diffMins) / 60);
  const mins_diff = Math.abs(diffMins) % 60;
  const isNextDay = prayerDate.getDate() !== now.getDate();

  let timeStr = "";
  if (hours_diff > 0) {
    timeStr += `${hours_diff} hour${hours_diff === 1 ? "" : "s"}`;
    if (mins_diff > 0) {
      timeStr += ` and ${mins_diff} minute${mins_diff === 1 ? "" : "s"}`;
    }
  } else {
    timeStr = `${mins_diff} minute${mins_diff === 1 ? "" : "s"}`;
  }

  if (isNextDay) {
    return "tomorrow";
  } else if (diffMins > 0) {
    return `in ${timeStr}`;
  } else {
    return `${timeStr} ago`;
  }
}

async function getLocation(): Promise<LocationResponse> {
  try {
    const response = await axios.get("https://ipapi.co/json/");
    return {
      latitude: response.data.latitude,
      longitude: response.data.longitude,
      city: response.data.city,
      country: response.data.country_name,
    };
  } catch (error) {
    console.error("Error getting location:", error);
    throw new Error("Failed to get location");
  }
}

export async function getPrayerTime(prayerName: keyof PrayerTimings) {
  try {
    // Show loading toast
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Getting Prayer Times",
      message: "Fetching your location...",
    });

    const { latitude, longitude, city, country } = await getLocation();

    // Update toast while fetching prayer times
    toast.message = "Calculating prayer times...";

    // Format current date
    const now = new Date();
    const date = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    const formattedDate = `${date}-${month}-${year}`;

    const response = await axios.get<ApiResponse>(`https://api.aladhan.com/v1/timings/${formattedDate}`, {
      params: {
        latitude,
        longitude,
        method: 2, // Islamic Society of North America (ISNA)
      },
    });

    const time = response.data.data.timings[prayerName];
    const formattedTime = formatTime(time);
    const timeDiff = getTimeDifference(time);

    // Create a prayer-specific emoji mapping
    const emojiMap: Record<keyof PrayerTimings, string> = {
      Fajr: "🌅",
      Sunrise: "☀️",
      Dhuhr: "🌞",
      Asr: "🌤",
      Sunset: "🌅",
      Maghrib: "🌆",
      Isha: "🌙",
      Imsak: "🌌",
      Midnight: "🕛",
      Firstthird: "⏰",
      Lastthird: "⏰",
    };

    const emoji = emojiMap[prayerName] || "🕌";

    // Show success toast with the prayer time
    await showToast({
      style: Toast.Style.Success,
      title: `${emoji} ${prayerName} Prayer Time`,
      message: `${formattedTime} (${timeDiff})\nin ${city}, ${country}`,
      primaryAction: {
        title: "Refresh",
        shortcut: { modifiers: ["cmd"], key: "r" },
        onAction: () => getPrayerTime(prayerName),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to get location") {
      await showFailureToast("Could not determine your location", {
        title: "Location Error",
        message: "Please check your internet connection and try again.",
      });
    } else {
      await showFailureToast("Failed to fetch prayer time", {
        title: "Error",
        message: "Please check your connection and try again.",
      });
    }
    console.error(error);
  }
}
