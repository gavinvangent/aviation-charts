import { DefaultService } from '../../lib/services/default-service'
import { AwsLambdaHandler } from '../../lib/lambda-handler'
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

  async default(event: any): Promise<any> {
    this.logger.trace('Event', { data: { event } })

    switch (this.detectEventSource(event)) {
      default:
        await this.defaultService.default()
        return {
          statusCode: 200,
          headers: {
            'x-custom-header': 'My Header Value',
          },
          body: JSON.stringify({ message: 'Hello World!' })
        }
    }
  }
}
