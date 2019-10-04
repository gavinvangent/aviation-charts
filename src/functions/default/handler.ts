import { SQSEvent } from 'aws-lambda'
import { DefaultService } from '../../lib/services/default-service'
import { NotImplementedError } from '../../lib/errors'
import { AwsLambdaHandler, AwsLambdaInvoker } from '../../lib/lambda-handler'
import { ILogger } from '../../lib/logger'
import { IMetric } from '../../lib/metric'

export class DefaultHandler extends AwsLambdaHandler {
  constructor(
        public readonly defaultService: DefaultService,
        public readonly logger: ILogger,
        public readonly metric: IMetric
    ) {
    super(logger, metric)
  }

  async default(event: any): Promise<void> {
    this.logger.trace('Event', { data: { event } })

    switch (this.detectEventSource(event)) {
            // If you are using SQS, this is a nice example, remove this and reimplement if using another means
      case AwsLambdaInvoker.SQS:
        this.logger.info('SQS Event', { data: { event } })
        const sqsEvent = event as SQSEvent

                // Extract the information you need and send that to the service
        const id = sqsEvent.Records.map(x => {
                    const body = JSON.parse(x.body)
                    const message = JSON.parse(body.Message)
                    return message.id
                }).find(() => true)

        return this.defaultService.default(id || 'test')
      default:
        throw new NotImplementedError('No handling implemented to handle this request')
    }
  }
}
