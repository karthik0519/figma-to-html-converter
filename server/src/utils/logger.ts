// Logger utility

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private errors: Array<{ message: string; context?: any }> = [];
  private warnings: Array<{ message: string; context?: any }> = [];

  setLevel(level: LogLevel) {
    this.level = level;
  }

  error(message: string, context?: any) {
    this.errors.push({ message, context });
    this.log(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: any) {
    this.warnings.push({ message, context });
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: any) {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: any) {
    this.log(LogLevel.DEBUG, message, context);
  }

  getErrors(): Array<{ message: string; context?: any }> {
    return this.errors;
  }

  getWarnings(): Array<{ message: string; context?: any }> {
    return this.warnings;
  }

  clearErrors() {
    this.errors = [];
  }

  clearWarnings() {
    this.warnings = [];
  }

  getSummary(): { errorCount: number; warningCount: number; errors: string[]; warnings: string[] } {
    return {
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      errors: this.errors.map(e => e.message),
      warnings: this.warnings.map(w => w.message),
    };
  }

  private log(level: LogLevel, message: string, context?: any) {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    if (levels.indexOf(level) <= levels.indexOf(this.level)) {
      const timestamp = new Date().toISOString();
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      console.log(`[${timestamp}] ${level}: ${message}${contextStr}`);
    }
  }
}

export const logger = new Logger();
