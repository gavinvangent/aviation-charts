import { Context } from 'aws-lambda'
import { IMetric } from './metric'
import { ILogger } from './logger'
import { AppError } from './errors'

export interface ILambdaHandler {
  decorate(name: string): (event: any, context: any) => any
  detectEventSource(event: any): string
}

export class AwsLambdaHandler implements ILambdaHandler {
  constructor(public readonly logger: ILogger, public readonly metric: IMetric) { }

  [key: string]: any;

  decorate(name: string): (event: any, context: Context) => any | Promise<any> {
    return (event: any, context: Context) => {
      const startDate = new Date()

      return Promise.resolve()
                .then(() => {
                  this.logger.trace(`${name} - Start`, { data: { event, context } })
                  this.metric.gauge(name, 'start', 1)
                  return this[name](event, context)
                })
                .then((result: any) => {
                  this.logger.debug(`${name} - Complete`, { data: { result, event, context } })
                  this.metric.gauge(name, 'success', 1)
                  return result
                }, error => {
                  this.logger.error(`${name} - Error`, { error, data: { event, context } })
                  this.metric.gauge(name, 'failure', 1)

                  if (!(error instanceof AppError)) {
                    throw new AppError(error.message, 'An unexpected error occurred')
                  }

                  throw error
                })
                .finally(() => {
                  this.metric.timer(name, 'latency', startDate)
                })
    }
  }

  detectEventSource(event: any): string {
    if (event.Records && event.Records.length) {
      const record = event.Records[0]
      if (record.cf) {
        return AwsLambdaInvoker.CLOUDFRONT
      }

      switch (record.eventSource) {
        case 'aws:codecommit':
          return AwsLambdaInvoker.CODE_COMMIT
        case 'aws:sqs':
          return AwsLambdaInvoker.SQS
        case 'aws:ses':
          return AwsLambdaInvoker.SES
        case 'aws:sns':
          return AwsLambdaInvoker.SNS
        case 'aws:dynamodb':
          return AwsLambdaInvoker.DDB
        case 'aws:kinesis':
          return AwsLambdaInvoker.KINESIS
        case 'aws:s3':
          return AwsLambdaInvoker.S3
      }
    }

    if (event.records && event.records.length) {
      if (event.records[0].approximateArrivalTimestamp) {
        return AwsLambdaInvoker.KINESIS_FIREHOSE
      }

      if (event.deliveryStreamArn && event.deliveryStreamArn.startsWith('arn:aws:kinesis:')) {
        return AwsLambdaInvoker.KINESIS_FIREHOSE
      }
    }

    if (event.configRuleId && event.configRuleName && event.configRuleArn) {
      return AwsLambdaInvoker.AWS_CONFIG
    }

    if (event.authorizationToken === 'incoming-client-token') {
      return AwsLambdaInvoker.API_GATEWAY_AUTHORIZER
    }

    if (event.StackId && event.RequestType && event.ResourceType) {
      return AwsLambdaInvoker.CLOUDFORMATION
    }

    if (event.pathParameters && event.pathParameters.proxy) {
      return AwsLambdaInvoker.API_GATEWAY_PROXY
    }

    if (event.source === 'aws.events') {
      return AwsLambdaInvoker.SCHEDULED
    }

    if (event.awslogs && event.awslogs.data) {
      return AwsLambdaInvoker.CLOUDWATCH_LOGS
    }

    if (event.eventType === 'SyncTrigger' && event.identityId && event.identityPoolId) {
      return AwsLambdaInvoker.COGNITO_SYNC_TRIGGER
    }

    if (event.operation && event.message) {
      return AwsLambdaInvoker.MOBILE_BACKEND
    }

    return AwsLambdaInvoker.UNKNOWN
  }
}

export enum AwsLambdaInvoker {
    API_GATEWAY_AUTHORIZER = 'api-gateway-authorizer',
    API_GATEWAY_PROXY = 'api-gateway-proxy',
    AWS_CONFIG = 'aws-config',
    COGNITO_SYNC_TRIGGER = 'cognito-sync-trigger',
    CLOUDFORMATION = 'cloudformation',
    CLOUDFRONT = 'cloudfront',
    CLOUDWATCH_LOGS = 'cloudwatch-logs',
    CODE_COMMIT = 'code-commit',
    DDB = 'dynamodb',
    KINESIS = 'kinesis',
    KINESIS_FIREHOSE = 'kinesis-firehose',
    MOBILE_BACKEND = 'mobile-backend',
    SCHEDULED = 'scheduled',
    S3 = 's3',
    SES = 'simple-email-service',
    SNS = 'simple-notification-service',
    SQS = 'simple-queue-service',
    UNKNOWN = 'unknown'
}
