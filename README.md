# AWS Javascript SDK v3.575 vs v3.577.0 Benchmark

This is to repro the size and coldstart performance difference between the AWS JavaScript SDK v3.575.0 and v3.577.0

## Code notes
The lambda function does a simple `ListTables` call to dynamodb and logs some metadata [src/handler.mjs](src/handler.mjs).  It is frontend by a Lambda Function url.

The CDK stack uses esbuild to bundle the function and marks a few unnecessary packages as external per my previous investigation on the credentials providers. It doesn't do any minification. [lib/sdk-577-thiccc-stack.mjs](lib/sdk-577-thiccc-stack.mjs) Enable the metafile option if you want to [analyze](https://esbuild.github.io/analyze/) the bundle which is output in `cdk.out/asset.<xxxxx>/index.meta.json` when you do a `npx cdk synth`.

## Switching between AWS SDK versions
### 3.575.0
`npm install @aws-sdk/client-dynamodb@3.575.0 --save-exact && npx cdk deploy;`

### 3.577.0
`npm install @aws-sdk/client-dynamodb@3.577.0 --save-exact && npx cdk deploy;`

## Triggering a coldstart

Once you've deployed the stack you can trigger a coldstart by hitting the url in the stack output.  You need to switch between versions and hit the url to force a coldstart, multiple invocations of the same version won't necessarily trigger a coldstart.

## Collating the results
Run the following CloudWatch Insights Query on `/aws/lambda/ThicccBenchmark` to collate the results:

```
filter @message like /(Init Duration|"coldstart":true)/
| stats max(@initDuration) as `initDuration`, sortsfirst(sdkVersion) as @awsSdk, sortsFirst(size) as @bundleSize, sortsFirst(runtime), sortsFirst(node) as @node by coalesce(@requestId,requestId)
| display `initDuration`, `@awsSdk`, `@bundleSize`, @node
| stats avg(`initDuration`), max(`@bundleSize`), count(*) as runs by @awsSdk, @node 
| order by `@awsSdk` asc
```

Or log into the console and hit this [url](https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2#logsV2:logs-insights$3FqueryDetail$3D~(end~0~start~-3600~timeType~'RELATIVE~unit~'seconds~editorString~'filter*20*40message*20like*20*2f*28Init*20Duration*7c*22coldstart*22*3atrue*29*2f*0a*7c*20stats*20max*28*40initDuration*29*20as*20*60initDuration*60*2c*20sortsfirst*28sdkVersion*29*20as*20*40awsSdk*2c*20sortsFirst*28size*29*20as*20*40bundleSize*2c*20sortsFirst*28runtime*29*2c*20sortsFirst*28node*29*20as*20*40node*20by*20coalesce*28*40requestId*2crequestId*29*0a*7c*20display*20*60initDuration*60*2c*20*60*40awsSdk*60*2c*20*60*40bundleSize*60*2c*20*40node*0a*7c*20stats*20avg*28*60initDuration*60*29*2c*20max*28*60*40bundleSize*60*29*2c*20count*28*2a*29*20as*20runs*20by*20*40awsSdk*2c*20*40node*20*0a*7c*20order*20by*20*60*40awsSdk*60*20asc~queryId~'d9f1588e6ca3e471-74fc35cd-49bc077-a3b9d870-c1dba4b810b8bdc3cc43de2d~source~(~'*2faws*2flambda*2fThicccBenchmark))) and change the region as appropriate.

## Cleaning up

`npx cdk destroy`

## Running locally

Start docker then:

`sam local invoke -t ./cdk.out/Sdk577ThicccStack.template.json Sdk577ThicccFunction`


## Useful commands

* `npx cdk deploy`       deploy this stack to your default AWS account/region
* `npx cdk diff`         compare deployed stack with current state
* `npx cdk synth`        emits the synthesized CloudFormation template
