export type RunStats = {
  shots: number;
  hits: number;
  hp: number;
  kills: number;
  seconds: number;
  won: boolean;
};

export class StatsTracker {
  shots = 0;
  hits = 0;
  kills = 0;
  private started = 0;

  begin(): void {
    this.shots = 0;
    this.hits = 0;
    this.kills = 0;
    this.started = performance.now();
  }

  snapshot(hp: number, won: boolean): RunStats {
    return {
      shots: this.shots,
      hits: this.hits,
      hp,
      kills: this.kills,
      seconds: (performance.now() - this.started) / 1000,
      won,
    };
  }
}

export function accuracyText(stats: RunStats): string {
  if (stats.shots === 0) return "0%";
  return `${Math.round((stats.hits / stats.shots) * 100)}%`;
}
