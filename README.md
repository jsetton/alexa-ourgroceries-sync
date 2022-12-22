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

You will have to install the latest [ASK CLI](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html), and then configure it:

```
$ npm install -g ask-cli
$ ask configure
```

## Deployment

1. Configure the deployment parameters in [`ask-resources.json`](ask-resources.json):

    | Parameter | Description |
    |-----------|-------------|
    | `OurGroceriesUsername` | Your OurGroceries account username. |
    | `OurGroceriesPassword` | Your OurGroceries account password. |
    | `OurGroceriesShoppingList` | Your OurGroceries shopping list name to synchronize. (Case sensitive) |
    | `AlexaShoppingList` | The Alexa shopping list name if you don't want to use the standard list. (Optional) |

2. Deploy the skill and all AWS resources in one step:
    ```
    $ ask deploy
    Deploy configuration loaded from ask-resources.json
    Deploy project for profile [default]

    ==================== Deploy Skill Metadata ====================
    Skill package deployed successfully.
    Skill ID: <skillId>

    ==================== Build Skill Code ====================
    Skill code built successfully.
    Code for region default built to <skillPath>/.ask/lambda/build.zip successfully with build flow NodeJsNpmBuildFlow.

    ==================== Deploy Skill Infrastructure ====================
    ✔ Deploy Alexa skill infrastructure for region "default"
    The api endpoints of skill.json have been updated from the skill infrastructure deploy results.
    Skill infrastructures deployed successfully through @ask-cli/cfn-deployer.

    ==================== Enable Skill ====================
    [Warn]: CliWarn: Skill api domain "householdList" cannot be enabled. Skip the enable process.
    ```

3. In your Alexa app, go to More > Skills & Games, find the OurGroceries List Sync skill under Your Skills > Dev tab and enable it. Make sure that the Lists Read/Write Access permissions are granted.

4. That should be it! Now, just say to your favorite Echo device: "*Alexa, add milk and eggs to my shopping list*". Both items should be added right away to your OurGroceries' shopping list. Changes made to that list, on the OurGroceries side, are synchronized back to the Alexa's list, every 30 minutes. It is important to note that when first enabling the skill, the Alexa shopping list will be updated to mirror the OurGroceries one, potentially removing any items that aren't on the latter list.
