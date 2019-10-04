export interface IMetric {
  gauge(name: string, action: string, value: number): void
  timer(name: string, action: string, startDate: Date): void
}

export class NoopMetric implements IMetric {
  gauge(): void {
    return
  }
  timer(): void {
    return
  }
}
