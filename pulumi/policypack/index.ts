import * as aws from "@pulumi/aws";
import {policyManager} from "@pulumi/compliance-policy-manager";
import * as awsPolicies from "@pulumi/aws-compliance-policies";
import {PolicyPack, validateResourceOfType} from "@pulumi/policy";


const policyPack =  new PolicyPack("aws-typescript", {
    policies: [
        // Control Lambda.1
        {
            name: "lambda-no-public-access",
            description: "AWS Lambda function policies should prohibit public access.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(aws.lambda.Permission, (lambdaPermission, args, reportViolation) => {
                if(lambdaPermission.principal === "*") {
                    reportViolation(
                        "AWS Lambda function policies should prohibit public access. " +
                        "Please modify the 'principal' of the Lambda function.");
                }
            }),
        },
        // Control Lambda.2
        {
            name: "lambda-python-runtime",
            description: "AWS Lambda function should use one of the specified Python runtimes.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(aws.lambda.Function, (lambdaFunction, args, reportViolation) => {
                const allowedRuntimes = ["python3.11", "python3.10", "python3.9", "python3.8"];
                if (lambdaFunction.runtime && !allowedRuntimes.includes(lambdaFunction.runtime)) {
                    reportViolation(
                        "AWS Lambda function should use one of the specified Python runtimes: " +
                        allowedRuntimes.join(", ") + ". " +
                        "Please update the 'runtime' of the Lambda function.");
                }
            }),
        },
        // Control Lambda.3
        {
            name: "lambda-in-vpc",
            description: "AWS Lambda function should be deployed within a VPC.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(aws.lambda.Function, (lambdaFunction, args, reportViolation) => {
                if (!lambdaFunction.vpcConfig) {
                    reportViolation(
                        "AWS Lambda function should be deployed within a VPC. " +
                        "Please set 'vpcConfig' for the Lambda function.");
                }
            }),
        },
        // Control Lambda.5
        {
            name: "lambda-multi-az",
            description: "VPC Lambda functions should operate in multiple Availability Zones.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(aws.lambda.Function, (lambdaFunction, args, reportViolation) => {
                if (!lambdaFunction.vpcConfig || lambdaFunction.vpcConfig.subnetIds.length < 2) {
                    reportViolation(
                        "VPC Lambda functions should operate in multiple Availability Zones. " +
                        "Please set 'vpcConfig' with multiple 'subnetIds' for the Lambda function.");
                }
            }),
        },
        // Add a new policy for the CloudWatch log group retention period
        {
            name: "cw-loggroup-retention-period-check",
            description: "Checks whether the retention period of all CloudWatch log groups is at least the specified number of days.",
            enforcementLevel: "mandatory",
            validateResource: validateResourceOfType(aws.cloudwatch.LogGroup, (logGroup, args, reportViolation) => {
                if (logGroup.retentionInDays === undefined || logGroup.retentionInDays < 365) {
                    reportViolation(
                        `The retention period of the CloudWatch log group ${logGroup.name} is less than 365 days. ` +
                        "Please increase the 'retentionInDays' of the log group."
                    );
                }
            }),
        },
        ...policyManager.selectPolicies([
                awsPolicies.aws.lambda.Function.configureTracingConfig,
                awsPolicies.aws.lambda.Function.enableTracingConfig,
                awsPolicies.aws.lambda.Function.missingDescription,
                awsPolicies.aws.lambda.Permission.configureSourceArn
            ]
        , "mandatory"),
    ],
});


policyManager.displaySelectionStats({
    displayGeneralStats: true,
    displayModuleInformation: true,
    displaySelectedPolicyNames: true,
});
