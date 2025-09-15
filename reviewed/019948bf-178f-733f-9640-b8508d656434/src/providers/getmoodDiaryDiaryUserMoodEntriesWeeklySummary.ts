import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IMoodDiaryMoodEntryWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryMoodEntryWeeklySummary";
import { DiaryuserPayload } from "../decorators/payload/DiaryuserPayload";

/**
 * Generate a weekly summary of moods for the last 7 active days, aggregating
 * counts from mood_diary_mood_entries.
 *
 * This endpoint computes and returns the mood summary statistics for the past 7
 * calendar days (not including today) for the single diaryUser. For each
 * day/mood, the system counts non-archived entries and returns daily and total
 * mood counts for all 8 standard types (zero when none logged). The summary
 * includes start/end ISO dates for the time window. If no entries are present
 * in the time window, the summary is zeroed accordingly.
 *
 * Business and security rules: no authentication or user separation, single
 * user logical model. Archived entries are always excluded (business logic and
 * application-level enforcement). Performance is expected within 2 seconds as
 * per requirements. This API does not expose any individual entry details, only
 * summary statistics. Related endpoints enable listing or creation of entries.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.diaryUser - The authenticated Diaryuser, contains the logical
 *   diary user id
 * @returns Weekly summary of moods over the last 7 calendar days, including
 *   per-day and total counts for each mood type
 * @throws {Error} If there is a system or database failure during summary
 *   construction
 */
export async function getmoodDiaryDiaryUserMoodEntriesWeeklySummary(props: {
  diaryUser: DiaryuserPayload;
}): Promise<IMoodDiaryMoodEntryWeeklySummary> {
  const moodTypes = [
    "happy",
    "sad",
    "anxious",
    "excited",
    "angry",
    "calm",
    "stressed",
    "tired",
  ];

  // Step 1: Establish boundaries using Asia/Calcutta timezone
  // We cannot use native Date in output, but we can use JS Dates for calculations
  const zone = "Asia/Calcutta";
  // Compute current date/time in Asia/Calcutta
  const now = new Date();
  const utc = now.getTime();
  // Get the offset (minutes) for IST as of now
  const localNow = new Date(now.toLocaleString("en-US", { timeZone: zone }));
  // Find local midnight at today (Asia/Calcutta today = end boundary, not included in window)
  localNow.setHours(0, 0, 0, 0);
  const msPerDay = 24 * 60 * 60 * 1000;
  // Compute 7 days prior
  const weekStart = new Date(localNow.getTime() - 7 * msPerDay);
  const weekDates: string[] = [];
  for (let i = 0; i < 7; ++i) {
    const d = new Date(weekStart.getTime() + i * msPerDay);
    const localDateParts = d
      .toLocaleDateString("en-CA", { timeZone: zone })
      .split("-");
    // en-CA gets YYYY-MM-DD even in Node
    weekDates.push(
      `${localDateParts[0]}-${localDateParts[1]}-${localDateParts[2]}`,
    );
  }
  // weekDates[0]=start, weekDates[6]=yesterday as local ISO (Asia/Calcutta)

  // Step 2: Calculate UTC boundaries for Prisma query
  // Start: weekStart at local day 0 in Asia/Calcutta, but in UTC
  // End: localNow (midnight Asia/Calcutta today), in UTC
  // We'll need to query all entries for the diaryUser in this UTC range
  const rangeStartUTC = new Date(
    weekStart.toLocaleString("en-US", { timeZone: "UTC" }),
  );
  rangeStartUTC.setHours(0, 0, 0, 0);
  const rangeEndUTC = new Date(
    localNow.toLocaleString("en-US", { timeZone: "UTC" }),
  );
  rangeEndUTC.setHours(0, 0, 0, 0);

  // Step 3: Query all unarchived entries for this diaryUser in window
  const entries = await MyGlobal.prisma.mood_diary_mood_entries.findMany({
    where: {
      mood_diary_diaryuser_id: props.diaryUser.id,
      archived: false,
      created_at: {
        gte: rangeStartUTC.toISOString(),
        lt: rangeEndUTC.toISOString(),
      },
    },
    select: {
      mood_type: true,
      created_at: true,
    },
  });

  // Step 4: Aggregate per mood, per day
  // Build a map: mood_type -> array of 7 zeros, then fill
  const moodStats: Record<string, number[]> = {};
  moodTypes.forEach((mood) => {
    moodStats[mood] = [0, 0, 0, 0, 0, 0, 0];
  });

  for (const entry of entries) {
    // Convert entry.created_at (which is UTC ISO string) to a local date string (Asia/Calcutta: YYYY-MM-DD)
    const localEntryDate = new Date(
      new Date(entry.created_at).toLocaleString("en-US", { timeZone: zone }),
    );
    localEntryDate.setHours(0, 0, 0, 0);
    const localDateString = localEntryDate.toLocaleDateString("en-CA", {
      timeZone: zone,
    });
    // Find which day index this date is in our weekDates array
    const dayIdx = weekDates.indexOf(localDateString);
    if (dayIdx !== -1 && moodStats[entry.mood_type] !== undefined) {
      moodStats[entry.mood_type][dayIdx]++;
    }
  }
  // Step 5: Build output mood_counts array
  const mood_counts = moodTypes.map((mood) => ({
    mood_type: mood,
    total_count: moodStats[mood].reduce((a, b) => a + b, 0),
    daily_counts: moodStats[mood],
  }));

  // Step 6: Output: start_date/end_date (string & tags.Format<'date'>) and mood_counts
  return {
    start_date: weekDates[0],
    end_date: weekDates[6],
    mood_counts: mood_counts,
  };
}
