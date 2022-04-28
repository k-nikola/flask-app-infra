import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as containerinstance from "@pulumi/azure-native/containerinstance";
import * as storage from "@pulumi/azure-native/storage";
import { config, stackServices } from "./config-loader"

// Project and stack name
let projectName = pulumi.getProject()
let stackName = pulumi.getStack()

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup(`${projectName}-${stackName}-rg`);

//Create a storage account
const storageAccount = new storage.StorageAccount(`${projectName}-${stackName}-sa`, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
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
const storageAccountKeys = storage.listStorageAccountKeysOutput({
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name
})
const storageAccountKey = storageAccountKeys.keys[0].value

// File share to be used as a volume
const fileShare = new storage.FileShare(`${projectName}-${stackName}-share`, {
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name,
    shareQuota: 50
})

// Create a new container group with all the services in it. Expose port 80 where nginx is listening on.
const containerGroup = new containerinstance.ContainerGroup(`${projectName}-${stackName}-cg`, {
    resourceGroupName: resourceGroup.name,
    osType: config.require("os"),
    containers: [{
        name: "db",
        image: stackServices.db.image,
        resources: {
            requests: {
                cpu: stackServices.db.specs.cpu,
                memoryInGB: stackServices.db.specs.mem,
            }
        },
        environmentVariables: [{
            name: "MYSQL_ROOT_PASSWORD",
            secureValue: stackServices.db.vars.MYSQL_ROOT_PASSWORD
        },
        {
            name: "MYSQL_DATABASE",
            secureValue: stackServices.db.vars.MYSQL_DATABASE
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
        image: stackServices.nginx.image,
        ports: [{ port: 80, protocol: "Tcp" }],
        resources: {
            requests: {
                cpu: stackServices.nginx.specs.cpu,
                memoryInGB: stackServices.nginx.specs.mem,
            }
        },
    }, {
        name: "flaskapp",
        image: stackServices.flaskapp.image,
        resources: {
            requests: {
                cpu: stackServices.flaskapp.specs.cpu,
                memoryInGB: stackServices.flaskapp.specs.mem,
            }
        },
        environmentVariables: [{
            name: "db_uri",
            secureValue: stackServices.flaskapp.vars.DB_URI
        },
        {
            name: "secret_key",
            secureValue: stackServices.flaskapp.vars.SECRET_KEY
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

// Public IP address of the container group. Can be accessed through HTTP.
export const containerIPv4address = containerGroup.ipAddress.apply(ip => ip?.ip);
