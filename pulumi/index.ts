import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

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

const lambdaRolePolicyAttachment = new aws.iam.RolePolicyAttachment("lambdaRolePolicyAttachment", {
    role: lambdaRole,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

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

const lambdaFunction = new aws.lambda.Function("sportsTickerFunction", {
    runtime: "python3.12",
    code: new pulumi.asset.FileArchive("../src"),
    handler: "sports_ticker.lambda_handler",
    layers: [layer.arn],
    role: lambdaRole.arn,
});

const logGroup = new aws.cloudwatch.LogGroup("logGroup", {
    name: lambdaFunction.name.apply(name => `/aws/lambda/${name}`),
    retentionInDays: 14,
});


const awsPermissionResource = new aws.lambda.Permission("awsPermissionResource", {
    action: "lambda:InvokeFunctionUrl",
    "function": lambdaFunction.name,
    functionUrlAuthType: "NONE",
    principal: "*",
});
export const lambdaFunctionName = lambdaFunction.name;