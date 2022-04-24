import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as containerinstance from "@pulumi/azure-native/containerinstance";
import * as storage from "@pulumi/azure-native/storage";

let config = new pulumi.Config()
let projectName = pulumi.getProject()
let stackName = pulumi.getStack()

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup(`${projectName}${stackName}AppRG`);

//Create storage account
const storageAccount = new storage.StorageAccount(`${projectName}${stackName}AciSa`, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    accountName: `${projectName}${stackName}storageacc`,
    kind: "Storage",
    sku: {
        name: "Standard_LRS",
    },
    tags: {
        environment: stackName
    }
})
const storageAccountKeys = storage.listStorageAccountKeysOutput({
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name
})
const storageAccountKey = storageAccountKeys.keys[0].value

const fileShare = new storage.FileShare(`${projectName}${stackName}share`, {
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name,
    shareQuota: 50
})

// Create a new container group with 1 container in it, expose port 5000
const containerGroup = new containerinstance.ContainerGroup(`${projectName}${stackName}CG`, {
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
            secureValue: config.require("MYSQL_ROOT_PASSWORD")
        },
        {
            name: "MYSQL_DATABASE",
            secureValue: config.require("MYSQL_DATABASE")
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
        name: "nginx-rproxy",
        image: config.require("nginxImage"),
        ports: [{ port: 80, protocol: "Tcp" }],
        resources: {
            requests: {
                cpu: 0.5,
                memoryInGB: 0.5,
            }
        },
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
            secureValue: config.require("DB_URI")
        },
        {
            name: "secret_key",
            secureValue: config.require("SECRET_KEY")
        }
        ],
    }
    ],
    ipAddress: {
        ports: [{
            port: 80,
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