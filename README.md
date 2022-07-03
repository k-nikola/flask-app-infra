# Infrastructure repository for my flask application

## Flask app repo - https://github.com/k-nikola/flask-app-nikola

### Prerequisities:

`❯ node -v
v16.13.2` \
`❯ npm -v
8.1.2` \
`❯ pulumi version
v3.35.3`
### Description:

This repository is a monolithic infrastructure as code solution via Pulumi for the mentioned flask app. Each Pulumi stack includes all of the infrastructure components needed to host the app in the cloud. \
Cloud provider of choice is Azure, and the resource of choice is container-group. \
Container group will host an instance of the app, and an instance of mysql database. This container group is located in an Azure Resource group, that also includes a File share. This file share will be used as a volume for mysql database container.\
All of the state management is handled by Pulumi Service Backend.

### Setting up

On the first time run, a Pulumi project needs to be created \
`❯ pulumi new azure-typescript`\
To set up state management via Pulumi Service Backend, login is required \
`❯ pulumi login` \
To be able to deploy to Azure, logging in via az cli is required \
`❯ az login`

### Up we go

Spinning up the app from here on is quite simple. \
Using a command like pulumi up, while specifying a certain stack as an attribute will spin up that stack on Azure.
Example output: \
![pulumiupoutput](https://user-images.githubusercontent.com/81910142/177002794-f68592f0-56ac-4a69-bd26-50b961a8d39c.JPG)


Following the public IP from the outputs of the pulumi up command should route to the flask app running in the container group in Azure:

![site on az](https://user-images.githubusercontent.com/81910142/177002791-a00a6d31-0963-403f-9656-05b82213a449.JPG)


### Down we go

Tearing down the stack with pulumi down is pretty straight-forward as well. \
Example output: \
![pulumidownoutput](https://user-images.githubusercontent.com/81910142/177002826-89180e7b-0dcc-4c1f-8b13-f98723370ee0.JPG)
