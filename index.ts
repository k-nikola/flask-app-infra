import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as containerinstance from "@pulumi/azure-native/containerinstance";
import * as storage from "@pulumi/azure-native/storage";

let config = new pulumi.Config()
let projectName = pulumi.getProject()
let stackName = pulumi.getStack()

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup(`${projectName}-${stackName}RG`);

//Create storage account
const storageAccount = new storage.StorageAccount(`${projectName}-${stackName}AciSa`, {
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

const fileShare = new storage.FileShare(`${projectName}-${stackName}share`, {
    accountName: storageAccount.name,
    resourceGroupName: resourceGroup.name,
    shareQuota: 50
})


interface serviceConfig {
    [serviceName: string]: {
        image: string;
        specs: {
            cpu: number;
            mem: number;
        };
        vars: {
            [varName: string]: string
        };
    };
}

const stackConfiguration = config.requireObject<serviceConfig>("services")

// Create a new container group with 1 container in it, expose port 80
const containerGroup = new containerinstance.ContainerGroup(`${projectName}${stackName}CG`, {
    resourceGroupName: resourceGroup.name,
    osType: config.require("os"),
    containers: [{
        name: "db",
        image: stackConfiguration.db.image,
        resources: {
            requests: {
                cpu: stackConfiguration.db.specs.cpu,
                memoryInGB: stackConfiguration.db.specs.mem,
            }
        },
        environmentVariables: [{
            name: "MYSQL_ROOT_PASSWORD",
            secureValue: stackConfiguration.db.vars.MYSQL_ROOT_PASSWORD
        },
        {
            name: "MYSQL_DATABASE",
            secureValue: stackConfiguration.db.vars.MYSQL_DATABASE
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
        image: stackConfiguration.nginx.image,
        ports: [{ port: 80, protocol: "Tcp" }],
        resources: {
            requests: {
                cpu: stackConfiguration.nginx.specs.cpu,
                memoryInGB: stackConfiguration.nginx.specs.mem,
            }
        },
    }, {
        name: "flaskapp",
        image: stackConfiguration.flaskapp.image,
        resources: {
            requests: {
                cpu: stackConfiguration.flaskapp.specs.cpu,
                memoryInGB: stackConfiguration.flaskapp.specs.mem,
            }
        },
        environmentVariables: [{
            name: "db_uri",
            secureValue: stackConfiguration.flaskapp.vars.DB_URI
        },
        {
            name: "secret_key",
            secureValue: stackConfiguration.flaskapp.vars.SECRET_KEY
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