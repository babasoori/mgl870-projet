import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Create an IAM role for the Lambda function
const lambdaRole = new aws.iam.Role("lambdaRole", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "lambda.amazonaws.com",
            },
        }],
    }),
});

// Attach the AWSLambdaBasicExecutionRole policy to the IAM role
const lambdaRolePolicyAttachment = new aws.iam.RolePolicyAttachment("lambdaRolePolicyAttachment", {
    role: lambdaRole,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

// Create a policy that allows writing logs to CloudWatch
const logPolicy = new aws.iam.Policy("logPolicy", {
    policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            Resource: "arn:aws:logs:*:*:*",
            Effect: "Allow",
        }],
    }),
});

// Attach the policy to the IAM role
const logPolicyAttachment = new aws.iam.RolePolicyAttachment("logPolicyAttachment", {
    role: lambdaRole,
    policyArn: logPolicy.arn,
});

const layer = new aws.lambda.LayerVersion("lambdaLayer", {
    layerName: "lambdaLayer",
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("../lambda_layer"),
    }),
    compatibleRuntimes: ["python3.12"],
});

// Create a Lambda function that uses the Layer
const lambdaFunction = new aws.lambda.Function("sportsTickerFunction", {
    runtime: aws.lambda.Python3d8Runtime,
    code: new pulumi.asset.FileArchive("../src"),
    handler: "sports_ticker.handler", // Assuming the handler function is named 'handler' in sports_ticker.py
    layers: [layer.arn],
    role: lambdaRole.arn, // Replace with the ARN of the IAM role for the Lambda function
});

const logGroup = new aws.cloudwatch.LogGroup("logGroup", {
    name: lambdaFunction.name.apply(name => `/aws/lambda/${name}`),
    retentionInDays: 14, // Set the retention period to 14 days
});


const awsPermissionResource = new aws.lambda.Permission("awsPermissionResource", {
    action: "lambda:InvokeFunction",
    "function": lambdaFunction.name,
    principal: "*",
});

// Export the name of the lambda function
export const lambdaFunctionName = lambdaFunction.name;