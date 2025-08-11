export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  debug(..._args: any[]) {}
  info(..._args: any[]) {}
  warn(..._args: any[]) {}
  error(..._args: any[]) {}
}

export const logger = new Logger()
