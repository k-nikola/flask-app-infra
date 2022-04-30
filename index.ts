import * as pulumi from "@pulumi/pulumi";
import { appStorage } from "./app/app-storage";
import { appGroup } from "./app/app-group";
import { appGlobalResources } from "./global/global";

// Project and stack name.
export let projectName = pulumi.getProject()
export let stackName = pulumi.getStack()

// Create global resources - Resource Group.
const globalResources = new appGlobalResources(projectName, stackName)
const stackResourceGroup = globalResources.stackResourceGroup

// Create storage for the app group.
const stackStorage = new appStorage(projectName, stackName, stackResourceGroup)

// Create app group, and mount stack storage.
const stackAppGroup = new appGroup(projectName, stackName, stackResourceGroup, stackStorage)

// Export the public IP address of the group.
export const publicIp = stackAppGroup.publicIp
