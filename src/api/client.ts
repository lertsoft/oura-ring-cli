import { loadConfig, isTokenExpired, type Config } from "../config/config";
import { refreshAccessToken } from "../auth/oauth";
import type {
  PersonalInfo,
  DailySleepResponse,
  DailyActivityResponse,
  DailyReadinessResponse,
  HeartRateResponse,
  WorkoutResponse,
  SpO2Response,
  SleepResponse,
  SessionResponse,
  SleepTimeResponse,
  EnhancedTagResponse,
  DailyStressResponse,
  DailyResilienceResponse,
  DailyCardiovascularAgeResponse,
  VO2MaxResponse,
  RingConfigurationResponse,
  RestModePeriodResponse,
} from "./types";

const BASE_URL = "https://api.ouraring.com/v2/usercollection/";

export class OuraClient {
  private config: Config;

  private constructor(config: Config) {
    this.config = config;
  }

  static async create(): Promise<OuraClient> {
    let config = await loadConfig();

    if (!config.access_token) {
      throw new Error(
        "Not authenticated. Please run 'oura auth' first to authenticate."
      );
    }

    // Refresh token if expired
    if (isTokenExpired(config)) {
      config = await refreshAccessToken(config);
    }

    return new OuraClient(config);
  }

  private async get<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(endpoint, BASE_URL);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          url.searchParams.set(key, value);
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.config.access_token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  // --- API Methods ---

  async getPersonalInfo(): Promise<PersonalInfo> {
    return this.get<PersonalInfo>("personal_info");
  }

  async getDailySleep(start?: string, end?: string): Promise<DailySleepResponse> {
    return this.get<DailySleepResponse>("daily_sleep", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getDailyActivity(start?: string, end?: string): Promise<DailyActivityResponse> {
    return this.get<DailyActivityResponse>("daily_activity", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getDailyReadiness(start?: string, end?: string): Promise<DailyReadinessResponse> {
    return this.get<DailyReadinessResponse>("daily_readiness", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getHeartRate(start?: string, end?: string): Promise<HeartRateResponse> {
    return this.get<HeartRateResponse>("heartrate", {
      start_datetime: start || "",
      end_datetime: end || "",
    });
  }

  async getWorkouts(start?: string, end?: string): Promise<WorkoutResponse> {
    return this.get<WorkoutResponse>("workout", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getSpO2(start?: string, end?: string): Promise<SpO2Response> {
    return this.get<SpO2Response>("daily_spo2", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getSleep(start?: string, end?: string): Promise<SleepResponse> {
    return this.get<SleepResponse>("sleep", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getSessions(start?: string, end?: string): Promise<SessionResponse> {
    return this.get<SessionResponse>("session", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getSleepTimes(start?: string, end?: string): Promise<SleepTimeResponse> {
    return this.get<SleepTimeResponse>("sleep_time", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getEnhancedTags(start?: string, end?: string): Promise<EnhancedTagResponse> {
    return this.get<EnhancedTagResponse>("enhanced_tag", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getDailyStress(start?: string, end?: string): Promise<DailyStressResponse> {
    return this.get<DailyStressResponse>("daily_stress", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getDailyResilience(start?: string, end?: string): Promise<DailyResilienceResponse> {
    return this.get<DailyResilienceResponse>("daily_resilience", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getCVAge(start?: string, end?: string): Promise<DailyCardiovascularAgeResponse> {
    return this.get<DailyCardiovascularAgeResponse>("daily_cardiovascular_age", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getVO2Max(start?: string, end?: string): Promise<VO2MaxResponse> {
    return this.get<VO2MaxResponse>("vO2_max", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getRingConfiguration(start?: string, end?: string): Promise<RingConfigurationResponse> {
    return this.get<RingConfigurationResponse>("ring_configuration", {
      start_date: start || "",
      end_date: end || "",
    });
  }

  async getRestModePeriod(start?: string, end?: string): Promise<RestModePeriodResponse> {
    return this.get<RestModePeriodResponse>("rest_mode_period", {
      start_date: start || "",
      end_date: end || "",
    });
  }
}
