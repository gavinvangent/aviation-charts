export enum LogLevels {
    TRACE = 'trace',
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    FATAL = 'fatal'
}

export enum LogLevelValues {
    trace = 10,
    debug = 20,
    info = 30,
    warn = 40,
    error = 50,
    fatal = 60
}

const HOSTNAME = 'aws-lambda'
const LAMBDA_PID = 1
const LOG_VERSION = 0
const DEFAULT_LOG_LEVEL = LogLevels.INFO

export interface ILoggerOptions {
  name?: string
  level?: string
  fields?: { [key: string]: any }
  [key: string]: any
}

export interface ILogger {
  trace (msg: string, options: ILoggerOptions): void
  debug (msg: string, options: ILoggerOptions): void
  info (msg: string, options: ILoggerOptions): void
  warn (msg: string, options: ILoggerOptions): void
  error (msg: string, options: ILoggerOptions): void
  fatal (msg: string, options: ILoggerOptions): void
  child(options: ILoggerOptions): Logger
}

export class Logger implements ILogger {
  constructor(options: ILoggerOptions = {}, _childOptions?: ILoggerOptions) {
    let parent

    if (_childOptions !== undefined) {
      parent = options
      options = _childOptions
    }

        // If we have a parent logger passed, then we construct the logger slightly differently by taking
        // over configuration options and additional fields.
    if (parent) {
      if (options.name) {
        throw new TypeError('invalid options.name: child cannot set logger name')
      }

      this.name = parent.name
      this.level = parent.level

      const parentFieldNames = Object.getOwnPropertyNames(parent.fields)
      for (let i = 0; i < parentFieldNames.length; i++) {
        const name = parentFieldNames[i]
        this.fields[name] = parent.fields[name]
      }
    } else {
      if (!options.name) {
        throw new TypeError('options.name (string) is required')
      }

      this.name = options.name
      this.level = options.level || DEFAULT_LOG_LEVEL
    }

        // Add options to fields map
    const names = Object.getOwnPropertyNames(options)
    for (let i = 0; i < names.length; i++) {
      const name = names[i]
      this.fields[name] = options[name]
    }
  }

  public parent: { fields: { [key: string]: any } }
  public fields: { [key: string]: any } = {}
  public name: string
  public level: string

    /**
     * Create a child logger of this logger instance.
     */
  child(options: ILoggerOptions): Logger {
    return new Logger(this, options)
  }

    /**
     * Prepare log object.
     *
     * When preparing a log object, this will stringify the object to a JSON string, and append a newline.
     */
  static prepareLogObject(obj: object): string {
    return JSON.stringify(obj).concat('\n')
  }

    /**
     * Check if we are able/allowed to log the message
     *
     * @param {number} level log level
     * @return {boolean} returns true if allowed to log
     */
  isLoggable(level: string): boolean {
        // Drop out early if not the required log level
    return LogLevelValues[this.level] <= LogLevelValues[level]
  }

  writeLog(logLevel: string, msg: string, options: ILoggerOptions): void {
    const level = LogLevelValues[logLevel]

        // Drop out early if not the required log level
    if (!this.isLoggable(level)) {
      return
    }

        // Construct the entire log record
    const logMessageProperties = {
      v: LOG_VERSION,
      pid: LAMBDA_PID,
      hostname: HOSTNAME,
      time: new Date().toISOString(),
      level,
      msg
    }

    const logRecord = Object.assign({}, options, this.fields, logMessageProperties)

        // Log x-rrid as rrid and remove the original
    if (logRecord['x-rrid']) {
      logRecord['rrid'] = logRecord['x-rrid']
      delete logRecord['x-rrid']
    }

    const logOutputString = Logger.prepareLogObject(logRecord)

        // Write to stdout
    process.stdout.write(logOutputString)
  }

  trace (msg: string, options: ILoggerOptions) {
    this.writeLog(LogLevels.TRACE, msg, options)
  }

  debug (msg: string, options: ILoggerOptions) {
    this.writeLog(LogLevels.DEBUG, msg, options)
  }

  info (msg: string, options: ILoggerOptions) {
    this.writeLog(LogLevels.INFO, msg, options)
  }

  warn (msg: string, options: ILoggerOptions) {
    this.writeLog(LogLevels.WARN, msg, options)
  }

  error (msg: string, options: ILoggerOptions) {
    this.writeLog(LogLevels.ERROR, msg, options)
  }

  fatal (msg: string, options: ILoggerOptions) {
    this.writeLog(LogLevels.FATAL, msg, options)
  }
}
