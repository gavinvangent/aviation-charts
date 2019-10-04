import { DefaultService } from '../../lib/services/default-service'
import { DefaultHandler } from './handler'
import { Logger } from '../../lib/logger'
import { NoopMetric } from '../../lib/metric'

const logger = new Logger({ name: 'default-handler', level: 'debug' })
const metric = new NoopMetric()

const defaultService = new DefaultService()
const defaultHandler = new DefaultHandler(defaultService, logger, metric)

module.exports = {
  default: defaultHandler.default.bind(defaultHandler)
}
