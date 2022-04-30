import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";

// Global resources needed by the app. Currently just a resource group named after the project and stack.
export class appGlobalResources extends pulumi.ComponentResource {
    public readonly stackResourceGroup: resources.ResourceGroup;
    constructor(projectName: string, stackName: string, opts?: pulumi.ComponentResourceOptions) {
        super("kninfra-GlobalResources", "kninfra-global")
        this.stackResourceGroup = new resources.ResourceGroup(`${projectName}-${stackName}-rg`);
    }
}