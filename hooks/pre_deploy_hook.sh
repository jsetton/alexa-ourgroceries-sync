#!/bin/bash
# Shell script for ask-cli pre-deploy hook for Node.js
# Script Usage: pre_deploy_hook.sh <SKILL_NAME> <DO_DEBUG> <TARGET>

# SKILL_NAME is the preformatted name passed from the CLI, after removing special characters.
# DO_DEBUG is boolean value for debug logging
# TARGET is the deploy TARGET provided to the CLI. (eg: all, skill, lambda etc.)

# Run this script under skill root folder

# The script does the following:
#  - Run "npm install" in each sourceDir in skill.json

SKILL_NAME=$1
DO_DEBUG=${2:-false}
TARGET=${3:-"all"}

if [ $DO_DEBUG == false ]
then
    exec > /dev/null 2>&1
fi

deploy_aws_resources() {
    node ./tools/deployAWSResources.js >/dev/null 2>&1
    return $?
}

install_dependencies() {
    npm install --prefix "$1" >/dev/null 2>&1
    return $?
}

echo "###########################"
echo "##### pre-deploy hook #####"
echo "###########################"

if [[ $TARGET == "all" || $TARGET == "lambda" ]]; then
    ls -d lambda/* | while read -r SOURCE_DIR; do
        if install_dependencies $SOURCE_DIR; then
            echo "Codebase ($SOURCE_DIR) built successfully."
        else
            echo "There was a problem installing dependencies for ($SOURCE_DIR)."
            exit 1
        fi
    done
    if deploy_aws_resources; then
        echo "AWS resources deployed successfully."
    else
        echo "There was a problem deploying the AWS resources."
        exit 1
    fi
    echo "###########################"
fi

exit 0
