import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as containerinstance from "@pulumi/azure-native/containerinstance";
import * as storage from "@pulumi/azure-native/storage";

let config = new pulumi.Config()

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("nikolaAppRG");

//Create storage account
const storageAccount = new storage.StorageAccount("nikolaAci-sa", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    accountName: "nikolastorageacc",
    kind: "Storage",
    sku: {
        name: "Standard_LRS",
    },
    tags: {
        environment: pulumi.StackReference.name
    }
})
const storageAccountKeys = storage.listStorageAccountKeysOutput({
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name
})
const storageAccountKey = storageAccountKeys.keys[0].value

const fileShare = new storage.FileShare("nikolashare", {
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name,
    shareQuota: 50
})

// Create a new container group with 1 container in it, expose port 5000
const containerGroup = new containerinstance.ContainerGroup("myCG", {
    resourceGroupName: resourceGroup.name,
    osType: config.require("os"),
    containers: [{
        name: "db",
        image: config.require("dbImage"),
        resources: {
            requests: {
                cpu: 0.5,
                memoryInGB: 0.5,
            }
        },
        environmentVariables: [{
            name: "MYSQL_ROOT_PASSWORD",
            secureValue: process.env.MYSQL_ROOT_PASSWORD
        },
        {
            name: "MYSQL_DATABASE",
            secureValue: "flask_nikola"
        },
        ],
        volumeMounts: [
            {
                name: "mysql-volume",
                readOnly: false,
                mountPath: "/var/lib/mysql",
            }
        ],
    }, {
        name: "flask-app",
        image: config.require("appImage"),
        ports: [{ port: 5000, protocol: "Tcp" }],
        resources: {
            requests: {
                cpu: 0.5,
                memoryInGB: 0.5,
            }
        },
        environmentVariables: [{
            name: "db_uri",
            secureValue: process.env.DB_URI
        },
        {
            name: "secret_key",
            secureValue: process.env.SECRET_KEY
        }
        ],
    }
    ],
    ipAddress: {
        ports: [{
            port: 5000,
            protocol: "Tcp"
        }],
        type: "Public",
    },
    volumes: [
        {
            azureFile: {
                shareName: fileShare.name,
                storageAccountName: storageAccount.name,
                storageAccountKey: storageAccountKey
            },
            name: "mysql-volume"
        },
    ],
    restartPolicy: "always",
});
export const containerIPv4address = containerGroup.ipAddress.apply(ip => ip?.ip);