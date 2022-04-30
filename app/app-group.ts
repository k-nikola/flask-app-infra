import * as pulumi from "@pulumi/pulumi";
import * as containerinstance from "@pulumi/azure-native/containerinstance";
import * as resources from "@pulumi/azure-native/resources";
import { config, stackServices } from "../global/config-loader";
import { appStorage } from "./app-storage"

// ComponentResource that creates a Container group with all the dependencies.
export class appGroup extends pulumi.ComponentResource {
    public readonly containerGroup: containerinstance.ContainerGroup;
    constructor(projectName: string, stackName: string, stackResourceGroup: resources.ResourceGroup, stackStorage: appStorage, opts?: pulumi.ComponentResourceOptions) {
        super("kninfra-Group", `${projectName}-cg`);
        // This application container group with flask web app, db, and nginx reverse proxy. It has public IP and exposed port 80
        this.containerGroup = new containerinstance.ContainerGroup(`${projectName}-${stackName}-cg`, {
            resourceGroupName: stackResourceGroup.name,
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
                        shareName: stackStorage.fileShare.name,
                        storageAccountName: stackStorage.Account.name,
                        storageAccountKey: stackStorage.AccountKey
                    },
                    name: "mysql-volume"
                },
            ],
            restartPolicy: "always",
        });
    }

    // Public IP address of the container group. Can be accessed through HTTP.
    get publicIp() {
        return this.containerGroup.ipAddress.apply(ip => ip?.ip);
    }
}
