import { getPrayerTime } from "./utils/prayerTimes";
import { showFailureToast } from "@raycast/utils";

export default async function command() {
  try {
    await getPrayerTime("Fajr");
  } catch (error) {
    await showFailureToast("Failed to get Fajr prayer time", {
      title: "Error",
      message: "Please try again.",
    });
    console.error(error);
  }
}
