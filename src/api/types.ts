// Oura API Types - TypeScript equivalents of Go structs

// --- Personal Info ---
export interface PersonalInfo {
  id: string;
  age: number;
  weight: number;
  height: number;
  gender: string;
  email: string;
}

// --- Daily Sleep ---
export interface DailySleep {
  id: string;
  day: string;
  score: number;
  timestamp: string;
}

export interface DailySleepResponse {
  data: DailySleep[];
  next_token: string;
}

// --- Daily Activity ---
export interface DailyActivity {
  id: string;
  day: string;
  score: number;
  steps: number;
}

export interface DailyActivityResponse {
  data: DailyActivity[];
  next_token: string;
}

// --- Daily Readiness ---
export interface DailyReadiness {
  id: string;
  day: string;
  score: number;
}

export interface DailyReadinessResponse {
  data: DailyReadiness[];
  next_token: string;
}

// --- Heart Rate ---
export interface HeartRate {
  id: string;
  bpm: number;
  source: string;
  timestamp: string;
}

export interface HeartRateResponse {
  data: HeartRate[];
  next_token: string;
}

// --- Workout ---
export interface Workout {
  id: string;
  activity: string;
  calories: number;
  day: string;
  distance: number;
  end_datetime: string;
  start_datetime: string;
  label: string;
}

export interface WorkoutResponse {
  data: Workout[];
  next_token: string;
}

// --- SpO2 ---
export interface SpO2 {
  id: string;
  day: string;
  spo2_percentage: {
    average: number;
  };
}

export interface SpO2Response {
  data: SpO2[];
  next_token: string;
}

// --- Sleep (Detailed) ---
export interface Sleep {
  id: string;
  day: string;
  score: number;
  efficiency: number;
  type: string;
  bedtime_start: string;
  bedtime_end: string;
  hypnogram_5min: string;
}

export interface SleepResponse {
  data: Sleep[];
  next_token: string;
}

// --- Session ---
export interface Session {
  id: string;
  day: string;
  start_datetime: string;
  end_datetime: string;
  type: string;
  status: string;
  motion_count: number;
}

export interface SessionResponse {
  data: Session[];
  next_token: string;
}

// --- Sleep Time ---
export interface SleepTime {
  id: string;
  day: string;
  optimal_bedtime: {
    day_tz: number;
    end_offset: number;
    start_offset: number;
    status: string;
  };
  recommendation: string;
}

export interface SleepTimeResponse {
  data: SleepTime[];
  next_token: string;
}

// --- Enhanced Tag ---
export interface EnhancedTag {
  id: string;
  tag_type_code: string;
  start_time: string;
  end_time: string;
  comment: string;
}

export interface EnhancedTagResponse {
  data: EnhancedTag[];
  next_token: string;
}

// --- Daily Stress ---
export interface DailyStress {
  id: string;
  day: string;
  stress_high: number;
  recovery_high: number;
  day_summary: string;
}

export interface DailyStressResponse {
  data: DailyStress[];
  next_token: string;
}

// --- Daily Resilience ---
export interface DailyResilience {
  id: string;
  day: string;
  level: string;
  contributors: {
    sleep_recovery: number;
    daytime_recovery: number;
    stress: number;
  };
}

export interface DailyResilienceResponse {
  data: DailyResilience[];
  next_token: string;
}

// --- Daily Cardiovascular Age ---
export interface DailyCardiovascularAge {
  id: string;
  day: string;
  vascular_age_range: number;
}

export interface DailyCardiovascularAgeResponse {
  data: DailyCardiovascularAge[];
  next_token: string;
}

// --- VO2 Max ---
export interface VO2Max {
  id: string;
  day: string;
  vo2_max: number;
}

export interface VO2MaxResponse {
  data: VO2Max[];
  next_token: string;
}

// --- Ring Configuration ---
export interface RingConfiguration {
  id: string;
  color: string;
  design: string;
  firmware_version: string;
  hardware_type: string;
  size: number;
}

export interface RingConfigurationResponse {
  data: RingConfiguration[];
  next_token: string;
}

// --- Rest Mode Period ---
export interface RestModePeriod {
  id: string;
  day: string;
  end_day: string;
  start_day: string;
  start_time: string;
  end_time: string;
}

export interface RestModePeriodResponse {
  data: RestModePeriod[];
  next_token: string;
}

// --- OAuth Token Response ---
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}
