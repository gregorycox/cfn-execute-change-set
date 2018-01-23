A command line tool for reviewing and executing AWS CloudFormation change sets.

## Features

* Read CloudFormation change set ARN from stdin or from the command line
* Print a summary of changes to stack resources, parameters and tags
* View the chain of causes that leads to resource changes (experimental)
* Review changes and execute them right away

**Note**: Resource change cause chians are experimental and might not be fully
accurate. Always review the raw change set input if you are unsure how changes
propagate to resources.

## Installation
```
npm i -g cfn-execute-change-set
```

## Usage

To review and execute a changeset, just pipe the output of the awscli
`create-change-set` command to the `cfn-execute-change-set` tool:

```
aws cloudformation create-change-set [...] | cfn-execute-change-set
```

Alternatively, you can provide a CloudFormation change set ARNs as command line
argument:

```bash
cfn-execute-change-set \
    arn:aws:cloudformation:eu-west-1:123456789123:changeSet/test-1516522726/9957ed5e-0049-4144-bc82-962941d972e4
```

### Example
```
$ aws cloudformation create-change-set [] | cfn-execute-change-set
{
    "StackId": "arn:aws:cloudformation:eu-west-1:748888633826:stack/ew1-test/e0496e10-fe10-11e7-8420-50fae9b818d2",
    "Id": "arn:aws:cloudformation:eu-west-1:748888633826:changeSet/test-1516540773/0e3d729c-9712-43aa-a7d3-2b44e4d2b797"
}
Changeset is being created. Waiting...
Changeset is being created. Waiting...
Resource Changes
[*] AuthenticatorLambda - ew1-test-AuthenticatorLambda-113XFFG3TVL7D (AWS::Lambda::Function)
    - resource tags changed
        caused by changed stack tags
[*] DataBucket - cfn-execute-changeset-test-1 (AWS::S3::Bucket)
    - resource tags changed
        caused by changed stack tags
[*] FirehoseDeliveryStream - ew1-test-FirehoseDeliveryStream-115L2LE9AKCXP (AWS::KinesisFirehose::DeliveryStream) [Replacement: Conditional]
    - resource property ExtendedS3DestinationConfiguration might change [Recreation: Always]
        caused by changed output value of AuthenticatorLambda.Arn
        caused by changed stack tags

Tag Changes
[*] Another: test1 ⟶ test

Execute change set [y/N]? y
Stack update started:
- Change Set ARN: arn:aws:cloudformation:eu-west-1:748888633826:changeSet/test-1516540773/0e3d729c-9712-43aa-a7d3-2b44e4d2b797
- Stack ARN: arn:aws:cloudformation:eu-west-1:748888633826:stack/ew1-test/e0496e10-fe10-11e7-8420-50fae9b818d2
```

## Ideas / TODO
* Improve and clean up code that determines root cause for resource changes
* More tests
