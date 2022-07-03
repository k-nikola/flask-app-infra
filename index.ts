import * as pulumi from "@pulumi/pulumi";
import { appStorage } from "./app/app-storage";
import { appGroup } from "./app/app-group";
import { appBaseResources } from "./base/base";

// Project and stack name.
export let projectName = pulumi.getProject()
export let stackName = pulumi.getStack()

// Create base resources - Resource Group.
const stackBaseResources = new appBaseResources(projectName, stackName)
const stackResourceGroup = stackBaseResources.stackResourceGroup

// Create storage for the app group.
const stackStorage = new appStorage(projectName, stackName, stackResourceGroup)

// Create app group, and mount stack storage.
const stackAppGroup = new appGroup(projectName, stackName, stackResourceGroup, stackStorage)

// Export the public IP address of the group.
export const publicIp = stackAppGroup.publicIp
