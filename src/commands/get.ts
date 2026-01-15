import { Command } from "commander";
import { select, input, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { OuraClient } from "../api/client";

function printJSON(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

interface DateOptions {
  start?: string;
  end?: string;
}

// Data type definitions with categories
interface DataType {
  name: string;
  value: string;
  description: string;
  hasDateRange: boolean;
  fetch: (client: OuraClient, start?: string, end?: string) => Promise<unknown>;
}

const DATA_CATEGORIES: Record<string, DataType[]> = {
  "👤 Personal": [
    {
      name: "Personal Info",
      value: "personal",
      description: "Your profile information (age, weight, email)",
      hasDateRange: false,
      fetch: (client) => client.getPersonalInfo(),
    },
    {
      name: "Ring Configuration",
      value: "ring-config",
      description: "Ring hardware info and settings",
      hasDateRange: true,
      fetch: (client, start, end) => client.getRingConfiguration(start, end),
    },
  ],
  "😴 Sleep": [
    {
      name: "Daily Sleep",
      value: "sleep",
      description: "Daily sleep summary with scores",
      hasDateRange: true,
      fetch: (client, start, end) => client.getDailySleep(start, end),
    },
    {
      name: "Sleep Details",
      value: "sleep-details",
      description: "Detailed sleep sessions and stages",
      hasDateRange: true,
      fetch: (client, start, end) => client.getSleep(start, end),
    },
    {
      name: "Optimal Bedtime",
      value: "sleep-times",
      description: "Recommended bedtime guidance",
      hasDateRange: true,
      fetch: (client, start, end) => client.getSleepTimes(start, end),
    },
  ],
  "🏃 Activity": [
    {
      name: "Daily Activity",
      value: "activity",
      description: "Steps, calories, and movement data",
      hasDateRange: true,
      fetch: (client, start, end) => client.getDailyActivity(start, end),
    },
    {
      name: "Workouts",
      value: "workout",
      description: "Recorded workout sessions",
      hasDateRange: true,
      fetch: (client, start, end) => client.getWorkouts(start, end),
    },
    {
      name: "Sessions",
      value: "sessions",
      description: "Activity and meditation sessions",
      hasDateRange: true,
      fetch: (client, start, end) => client.getSessions(start, end),
    },
  ],
  "❤️ Heart & Body": [
    {
      name: "Heart Rate",
      value: "heartrate",
      description: "Heart rate time series data",
      hasDateRange: true,
      fetch: (client, start, end) => client.getHeartRate(start, end),
    },
    {
      name: "Blood Oxygen (SpO2)",
      value: "spo2",
      description: "Blood oxygen saturation levels",
      hasDateRange: true,
      fetch: (client, start, end) => client.getSpO2(start, end),
    },
    {
      name: "Cardiovascular Age",
      value: "cv-age",
      description: "Estimated cardiovascular age",
      hasDateRange: true,
      fetch: (client, start, end) => client.getCVAge(start, end),
    },
    {
      name: "VO2 Max",
      value: "vo2-max",
      description: "VO2 max fitness estimate",
      hasDateRange: true,
      fetch: (client, start, end) => client.getVO2Max(start, end),
    },
  ],
  "🧘 Wellness": [
    {
      name: "Readiness",
      value: "readiness",
      description: "Daily readiness score and contributors",
      hasDateRange: true,
      fetch: (client, start, end) => client.getDailyReadiness(start, end),
    },
    {
      name: "Stress",
      value: "stress",
      description: "Daily stress levels",
      hasDateRange: true,
      fetch: (client, start, end) => client.getDailyStress(start, end),
    },
    {
      name: "Resilience",
      value: "resilience",
      description: "Daily resilience data",
      hasDateRange: true,
      fetch: (client, start, end) => client.getDailyResilience(start, end),
    },
    {
      name: "Rest Mode",
      value: "rest-mode",
      description: "Rest mode periods",
      hasDateRange: true,
      fetch: (client, start, end) => client.getRestModePeriod(start, end),
    },
  ],
  "🏷️ Other": [
    {
      name: "Tags",
      value: "tags",
      description: "Enhanced tags you've added",
      hasDateRange: true,
      fetch: (client, start, end) => client.getEnhancedTags(start, end),
    },
  ],
};

// Flatten for lookup
const ALL_DATA_TYPES: DataType[] = Object.values(DATA_CATEGORIES).flat();

function getDataTypeByValue(value: string): DataType | undefined {
  return ALL_DATA_TYPES.find((dt) => dt.value === value);
}

// Helper to add common date options to a command
function addDateOptions(command: Command): Command {
  return command
    .option("-s, --start <date>", "Start date (YYYY-MM-DD)")
    .option("-e, --end <date>", "End date (YYYY-MM-DD)");
}

// Helper to handle errors consistently
async function executeCommand<T>(fn: () => Promise<T>): Promise<void> {
  try {
    const result = await fn();
    printJSON(result);
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

// Interactive date range prompt
async function promptForDateRange(): Promise<DateOptions> {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const useRange = await confirm({
    message: "Do you want to specify a date range?",
    default: false,
  });

  if (!useRange) {
    return {};
  }

  const rangeChoice = await select({
    message: "Select a date range:",
    choices: [
      { name: "Today", value: "today" },
      { name: "Last 7 days", value: "week" },
      { name: "Last 30 days", value: "month" },
      { name: "Custom range", value: "custom" },
    ],
  });

  switch (rangeChoice) {
    case "today":
      return { start: today, end: today };
    case "week":
      return { start: weekAgo, end: today };
    case "month": {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      return { start: monthAgo, end: today };
    }
    case "custom": {
      const start = await input({
        message: "Start date (YYYY-MM-DD):",
        default: weekAgo,
        validate: (value) => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return "Please enter a valid date in YYYY-MM-DD format";
          }
          return true;
        },
      });
      const end = await input({
        message: "End date (YYYY-MM-DD):",
        default: today,
        validate: (value) => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return "Please enter a valid date in YYYY-MM-DD format";
          }
          return true;
        },
      });
      return { start, end };
    }
    default:
      return {};
  }
}

// Interactive mode when no subcommand is provided
async function runInteractiveMode(): Promise<void> {
  console.log("\n" + chalk.cyan.bold("📊 Oura Ring Data Explorer\n"));
  console.log(chalk.dim("Select the type of data you want to retrieve:\n"));

  // Build choices with separators for categories
  const choices: Array<{
    name: string;
    value: string;
    description?: string;
  } | { type: "separator"; separator: string }> = [];

  for (const [category, dataTypes] of Object.entries(DATA_CATEGORIES)) {
    choices.push({ type: "separator", separator: chalk.bold(`\n${category}`) });
    for (const dt of dataTypes) {
      choices.push({
        name: dt.name,
        value: dt.value,
        description: chalk.dim(dt.description),
      });
    }
  }

  try {
    const selectedValue = await select({
      message: "What data would you like to get?",
      choices: choices as any,
      pageSize: 15,
    });

    const dataType = getDataTypeByValue(selectedValue);
    if (!dataType) {
      console.error(chalk.red("Unknown data type selected"));
      process.exit(1);
    }

    let dateOptions: DateOptions = {};
    if (dataType.hasDateRange) {
      dateOptions = await promptForDateRange();
    }

    console.log(
      chalk.dim(
        `\nFetching ${dataType.name}${
          dateOptions.start ? ` from ${dateOptions.start} to ${dateOptions.end}` : ""
        }...\n`
      )
    );

    const client = await OuraClient.create();
    const result = await dataType.fetch(client, dateOptions.start, dateOptions.end);
    printJSON(result);

    // Helpful tip after fetching
    console.log(
      chalk.dim(
        `\n💡 Tip: You can also run ${chalk.yellow(
          `oura get ${dataType.value}${
            dateOptions.start ? ` -s ${dateOptions.start} -e ${dateOptions.end}` : ""
          }`
        )} directly next time.`
      )
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ExitPromptError") {
      console.log(chalk.yellow("\n\nCancelled."));
      process.exit(0);
    }
    console.error(
      chalk.red("\nError:"),
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

export function createGetCommand(): Command {
  const getCommand = new Command("get")
    .description("Get data from your Oura Ring")
    .action(async () => {
      // If no subcommand is provided, run interactive mode
      await runInteractiveMode();
    });

  // personal - Get personal info
  getCommand
    .command("personal")
    .description("Get personal information")
    .action(async () => {
      await executeCommand(async () => {
        const client = await OuraClient.create();
        return client.getPersonalInfo();
      });
    });

  // sleep - Get daily sleep summary
  addDateOptions(
    getCommand.command("sleep").description("Get daily sleep summary")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getDailySleep(options.start, options.end);
    });
  });

  // activity - Get daily activity summary
  addDateOptions(
    getCommand.command("activity").description("Get daily activity summary")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getDailyActivity(options.start, options.end);
    });
  });

  // readiness - Get daily readiness score
  addDateOptions(
    getCommand.command("readiness").description("Get daily readiness score")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getDailyReadiness(options.start, options.end);
    });
  });

  // heartrate - Get heart rate time series
  addDateOptions(
    getCommand.command("heartrate").description("Get heart rate time series")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getHeartRate(options.start, options.end);
    });
  });

  // workout - Get workout data
  addDateOptions(
    getCommand.command("workout").description("Get workout data")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getWorkouts(options.start, options.end);
    });
  });

  // spo2 - Get blood oxygen levels
  addDateOptions(
    getCommand.command("spo2").description("Get blood oxygen (SpO2) levels")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getSpO2(options.start, options.end);
    });
  });

  // sleep-details - Get detailed sleep sessions
  addDateOptions(
    getCommand.command("sleep-details").description("Get detailed sleep sessions")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getSleep(options.start, options.end);
    });
  });

  // sessions - Get activity sessions
  addDateOptions(
    getCommand.command("sessions").description("Get activity sessions")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getSessions(options.start, options.end);
    });
  });

  // sleep-times - Get optimal bedtime guidance
  addDateOptions(
    getCommand.command("sleep-times").description("Get optimal bedtime guidance")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getSleepTimes(options.start, options.end);
    });
  });

  // stress - Get daily stress data
  addDateOptions(
    getCommand.command("stress").description("Get daily stress data")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getDailyStress(options.start, options.end);
    });
  });

  // resilience - Get daily resilience
  addDateOptions(
    getCommand.command("resilience").description("Get daily resilience data")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getDailyResilience(options.start, options.end);
    });
  });

  // cv-age - Get cardiovascular age
  addDateOptions(
    getCommand.command("cv-age").description("Get cardiovascular age data")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getCVAge(options.start, options.end);
    });
  });

  // vo2-max - Get VO2 max estimate
  addDateOptions(
    getCommand.command("vo2-max").description("Get VO2 max estimate")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getVO2Max(options.start, options.end);
    });
  });

  // ring-config - Get ring hardware info
  addDateOptions(
    getCommand.command("ring-config").description("Get ring configuration and hardware info")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getRingConfiguration(options.start, options.end);
    });
  });

  // rest-mode - Get rest mode periods
  addDateOptions(
    getCommand.command("rest-mode").description("Get rest mode periods")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getRestModePeriod(options.start, options.end);
    });
  });

  // tags - Get enhanced tags
  addDateOptions(
    getCommand.command("tags").description("Get enhanced tags")
  ).action(async (options: DateOptions) => {
    await executeCommand(async () => {
      const client = await OuraClient.create();
      return client.getEnhancedTags(options.start, options.end);
    });
  });

  return getCommand;
}
