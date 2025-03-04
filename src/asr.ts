import { getPrayerTime } from "./utils/prayerTimes";
import { showFailureToast } from "@raycast/utils";

export default async function command() {
  try {
    await getPrayerTime("Asr");
  } catch (error) {
    await showFailureToast("Failed to get Asr prayer time", {
      title: "Error",
      message: "Please try again.",
    });
    console.error(error);
  }
}
