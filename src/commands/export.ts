import { Command } from "commander";
import { select, input, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import { OuraClient } from "../api/client";

interface DateOptions {
  start?: string;
  end?: string;
}

// Helper to extract a YYYY-MM-DD date key from an item
function getDateKey(item: any): string | null {
  if (item.day) {
    return item.day;
  }
  if (item.timestamp) {
    return item.timestamp.split("T")[0];
  }
  if (item.start_datetime) {
    return item.start_datetime.split("T")[0];
  }
  if (item.start_time) {
    return item.start_time.split("T")[0]; // For EnhancedTag
  }
  return null;
}

export function createExportCommand(): Command {
  return new Command("export")
    .description("Export all Oura data to a JSON file")
    .option("-s, --start <date>", "Start date (YYYY-MM-DD)")
    .option("-e, --end <date>", "End date (YYYY-MM-DD)")
    .action(async (options: DateOptions) => {
      try {
        await runExport(options);
      } catch (error) {
        console.error(
          chalk.red("Error exporting data:"),
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });
}

async function runExport(options: DateOptions): Promise<void> {
  // Determine date range
  let start = options.start;
  let end = options.end;

  if (!start || !end) {
    const useRange = await confirm({
      message: "Do you want to specify a date range for the export?",
      default: false,
    });

    if (useRange) {
        if(!start) {
             start = await input({
                message: "Start date (YYYY-MM-DD):",
                validate: (value) => {
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    return "Please enter a valid date in YYYY-MM-DD format";
                  }
                  return true;
                },
              });
        }
        if(!end) {
             end = await input({
                message: "End date (YYYY-MM-DD):",
                default: new Date().toISOString().split("T")[0],
                validate: (value) => {
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    return "Please enter a valid date in YYYY-MM-DD format";
                  }
                  return true;
                },
              });
        }
    }
  }

  console.log(chalk.cyan(`\n🚀 Starting export${start ? ` from ${start} to ${end || 'now'}` : ''}...\n`));

  const client = await OuraClient.create();
  
  // 1. Fetch Personal Info (Not date based)
  console.log(chalk.dim("Fetching Personal Info..."));
  const personalInfo = await checkError(() => client.getPersonalInfo());

  // 2. Fetch Ring Config (Not easily date based in type definition, though API accepts dates)
  console.log(chalk.dim("Fetching Ring Configuration..."));
  const ringConfig = await checkError(() => client.getRingConfiguration(start, end));

  // 3. Define all time-series fetchers
  const fetchers = [
    { key: "sleep", label: "Daily Sleep", fn: () => client.getDailySleep(start, end) },
    { key: "activity", label: "Daily Activity", fn: () => client.getDailyActivity(start, end) },
    { key: "readiness", label: "Daily Readiness", fn: () => client.getDailyReadiness(start, end) },
    { key: "heartrate", label: "Heart Rate", fn: () => client.getHeartRate(start, end) },
    { key: "workouts", label: "Workouts", fn: () => client.getWorkouts(start, end) },
    { key: "spo2", label: "SpO2", fn: () => client.getSpO2(start, end) },
    { key: "sleep_detailed", label: "Sleep Details", fn: () => client.getSleep(start, end) },
    { key: "sessions", label: "Sessions", fn: () => client.getSessions(start, end) },
    { key: "sleep_times", label: "Sleep Times", fn: () => client.getSleepTimes(start, end) },
    { key: "stress", label: "Daily Stress", fn: () => client.getDailyStress(start, end) },
    { key: "resilience", label: "Daily Resilience", fn: () => client.getDailyResilience(start, end) },
    { key: "cv_age", label: "Cardiovascular Age", fn: () => client.getCVAge(start, end) },
    { key: "vo2_max", label: "VO2 Max", fn: () => client.getVO2Max(start, end) },
    { key: "rest_mode", label: "Rest Mode", fn: () => client.getRestModePeriod(start, end) },
    { key: "tags", label: "Enhanced Tags", fn: () => client.getEnhancedTags(start, end) },
  ];

  // 4. Fetch all data in parallel
  const results: Record<string, any> = {};
  
  // We'll execute them sequentially or in batches to avoid overwhelming the API rate limits if strictly necessary,
  // but usually parallel is fine for this number of endpoints unless the range is huge.
  // Let's do parallel for speed.
  const promises = fetchers.map(async (item) => {
    console.log(chalk.dim(`Fetching ${item.label}...`));
    try {
        const response: any = await item.fn();
        return { key: item.key, data: response?.data || [] };
    } catch (e) {
        console.warn(chalk.yellow(`Warning: Failed to fetch ${item.label}: ${e instanceof Error ? e.message : e}`));
        return { key: item.key, data: [] };
    }
  });

  const fetchedData = await Promise.all(promises);

  // 5. Group by Date
  console.log(chalk.dim("\nProcessing and grouping data..."));
  
  const groupedData: Record<string, Record<string, any>> = {};

  for (const { key, data } of fetchedData) {
    if (!Array.isArray(data)) continue;

    for (const item of data) {
      const dateKey = getDateKey(item);
      if (dateKey) {
        if (!groupedData[dateKey]) {
          groupedData[dateKey] = {};
        }
        if (!groupedData[dateKey][key]) {
          groupedData[dateKey][key] = [];
        }
        groupedData[dateKey][key].push(item);
      } else {
        // Fallback for items without a clear date, though most should have one
        if (!groupedData["unknown_date"]) groupedData["unknown_date"] = {};
        if (!groupedData["unknown_date"][key]) groupedData["unknown_date"][key] = [];
        groupedData["unknown_date"][key].push(item);
      }
    }
  }

  // 6. Sort Dates
  const sortedDates = Object.keys(groupedData).sort();
  const sortedGroupedData: Record<string, any> = {};
  for (const date of sortedDates) {
    sortedGroupedData[date] = groupedData[date];
  }

  // 7. unexpected items (like ring config)
  // Ring config technically can be multiple items over time? 
  // Let's just put ring config at root or in a separate "global" bucket if we couldn't date it.
  // Actually, let's look at checkError helper output.

  const exportObject = {
    meta: {
      export_date: new Date().toISOString(),
      date_range: { start, end },
      version: "1.0.0"
    },
    personal_info: personalInfo,
    ring_configuration: ringConfig?.data || [], // Put here if not mapped to dates
    data: sortedGroupedData
  };

  // 8. Write to file
  const filename = `oura_export_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const filePath = path.join(process.cwd(), filename);

  await fs.writeFile(filePath, JSON.stringify(exportObject, null, 2));

  console.log(chalk.green(`\n✅ Export successful!`));
  console.log(chalk.white(`Data saved to: ${chalk.bold(filePath)}`));
}

async function checkError<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
        return await fn();
    } catch (e) {
        console.warn(chalk.yellow(`Warning: Failed to fetch data: ${e instanceof Error ? e.message : e}`));
        return null;
    }
}
