import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { statSync } from "fs";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { IAMClient } from "@aws-sdk/client-iam";

const metrics = new Metrics({
  namespace: "benchmark",
  serviceName: "thiccc",
});

const stsClient = new STSClient({ region: process.env.AWS_REGION });
const iamClient = new IAMClient({ region: process.env.AWS_REGION });
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddbDocClient = DynamoDBDocument.from(dynamoDBClient);
let size, runtimeBuildDate;
try {
  runtimeBuildDate = statSync("/var/runtime").mtime;
} catch (e) {
  console.error("Unable to determine runtime build date", e);
}
try {
  size = statSync(__filename).size;
} catch (e) {
  console.error("Unable to determine size of handler.mjs", e);
}

export const handler = async (event, context) => {
  let startTime = Date.now();
  let success = 0;
  try {
    metrics.addMetadata("node", process.version);
    metrics.addMetadata("coldstart", metrics.isColdStart());
    metrics.addMetadata("sdkVersion", process.env.sdkVersion);
    metrics.addMetadata("requestId", context.awsRequestId);
    metrics.addMetadata("size", size);
    metrics.addMetadata("runtimeBuildDate", runtimeBuildDate);
    await stsClient.send(new GetCallerIdentityCommand());
    success = 1;
    return {
      statusCode: 200,
      body: {
        requestId: context.awsRequestId,
      },
    };
  } finally {
    metrics.addMetadata("latency", Date.now() - startTime);
    metrics.addMetric("fault", success, MetricUnit.Count);
    metrics.publishStoredMetrics();
  }
};
