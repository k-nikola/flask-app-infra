import * as pulumi from "@pulumi/pulumi";
import * as storage from "@pulumi/azure-native/storage";
import * as resources from "@pulumi/azure-native/resources";

// Storage components required by the app.
export class appStorage extends pulumi.ComponentResource {
    public readonly Account: storage.StorageAccount
    public readonly AccountKey: pulumi.Output<string>
    public readonly fileShare: storage.FileShare
    constructor(projectName: string, stackName: string, stackResourceGroup: resources.ResourceGroup, opts?: pulumi.ComponentResourceOptions) {
        super("kninfra-Storage", `${projectName}-storage`);
        //Create a storage account
        this.Account = new storage.StorageAccount(`${projectName}-${stackName}-sa`, {
            resourceGroupName: stackResourceGroup.name,
            location: stackResourceGroup.location,
            accountName: `${projectName}${stackName}sa`,
            kind: "Storage",
            sku: {
                name: "Standard_LRS",
            },
            tags: {
                environment: stackName
            }
        })

        // Storage account keys needed for creating volumes
        this.AccountKey = storage.listStorageAccountKeysOutput({
            accountName: this.Account.name,
            resourceGroupName: stackResourceGroup.name
        }).keys[0].value

        // File share to be used as a volume
        this.fileShare = new storage.FileShare(`${projectName}-${stackName}-share`, {
            accountName: this.Account.name,
            resourceGroupName: stackResourceGroup.name,
            shareQuota: 50
        })
    }
}
