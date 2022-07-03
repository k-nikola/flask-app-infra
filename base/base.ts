import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";

// Base resources needed by the app. Currently just a resource group named after the project and stack.
export class appBaseResources extends pulumi.ComponentResource {
    public readonly stackResourceGroup: resources.ResourceGroup;
    constructor(projectName: string, stackName: string, opts?: pulumi.ComponentResourceOptions) {
        super("kninfra-BaseResources", "kninfra-base")
        this.stackResourceGroup = new resources.ResourceGroup(`${projectName}-${stackName}-rg`);
    }
}