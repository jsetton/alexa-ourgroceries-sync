# alexa-ourgroceries-sync

Unofficial OurGroceries Alexa Shopping List Synchronization Skill

## Disclaimer

**The is an unofficial skill meaning it should only be used for personal usage. I do not have any affiliations with OurGroceries or Amazon.**

## Introduction

This skill provides Alexa shopping list synchronization with a specific OurGroceries list. This is an addon to the official skill which doesn't support list synchronization as of yet.

It is leveraging the Alexa Skills Kit Command Line Interface (ASK CLI) to streamline the deployment process.

## Prerequisites

You need an [AWS account](https://aws.amazon.com) and an [Amazon developer account](https://developer.amazon.com) to create an Alexa Skill.

In order to use the ASK CLI features to automatically deploy and manage your Lambda skill, ensure that you have AWS credentials set up with the appropriate permissions on the computer to which you are installing ASK CLI, as described in [Set Up Credentials for an Amazon Web Services (AWS) Account](https://developer.amazon.com/docs/smapi/set-up-credentials-for-an-amazon-web-services-account.html).

Once you have installed [ASK CLI](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html), you need to initialize it:

```bash
$ ask init
```

For AWS resources deployment, you will need to install [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html) and configure it:

```bash
$ aws configure
```

## Deployment

1. Deploy the skill and all AWS resources in one step:

```
$ ask deploy
Profile for the deployment: [default]
-------------------- Create Skill Project --------------------
Skill Id: <skillId>
Skill metadata deploy finished.
[Info]: No lambda functions need to be deployed.
[Info]: No in-skill product to be deployed.
[Warn]: Skill with multiple api domains can not be enabled. Skipping the enablement.
```

2. Get the skill client id and secret, using the skill id from previous step:

```
$ ask api get-skill-credentials -s <skillId>
{
  "skillMessagingCredentials": {
    "clientId": <clientId>,
    "clientSecret": <clientSecret>
  }
}
```

3. Go to the [lambda function dashboard](https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/alexa-ourgroceries-sync) and add the below environment variables. **Make sure to click save at the top of the page to apply the settings.**

| Variable | Description |
|----------|-------------|
| `OUR_GROCERIES_SHOPPING_LIST` | Your OurGroceries shopping list name to synchronize. (Case sensitive) |
| `OUR_GROCERIES_USERNAME` | Your OurGroceries account username. |
| `OUR_GROCERIES_PASSWORD` | Your OurGroceries account password. |
| `SKILL_APP_ID` | The skill id from step 1. |
| `SKILL_CLIENT_ID` | The skill client id from step 2. |
| `SKILL_CLIENT_SECRET` | The skill client secret from step 2. |
| `ALEXA_SHOPPING_LIST` | The Alexa shopping list name if you don't want to use the standard list. (Optional) |

4. In your [Alexa Skill Console](https://alexa.amazon.com/spa/index.html#skills/your-skills), find the OurGroceries List Sync skill under the "Dev Skills" tab and enable it. Make sure that the Lists Read/Write Access permissions are enabled.

5. That should be it! Now, just say to your favorite Echo device: "*Alexa, add milk and eggs to my shopping list*". Both items should be added right away to your OurGroceries' shopping list. Changes made to that list, on the OurGroceries side, are synchronized back to the Alexa's list, every 30 minutes. It is important to note that when first enabling the skill, the Alexa shopping list will be updated to mirror the OurGroceries one, potentially removing any items that aren't on the latter list.
