import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as containerinstance from "@pulumi/azure-native/containerinstance";

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("pulumiRG");

const imageName = "t0b9/tf-site:1.1";
// Create a new container group with 1 container in it, expose port 80
const containerGroup = new containerinstance.ContainerGroup("myCG", {
    resourceGroupName: resourceGroup.name,
    osType: "Linux",
    containers: [{
        name: "tf-site",
        image: imageName,
        ports: [{ port: 80, protocol: "Tcp" }],
        resources: {
            requests: {
                cpu: 0.5,
                memoryInGB: 0.5,
            }
        }
    }],
    ipAddress: {
        ports: [{
            port: 80,
            protocol: "Tcp",
        }],
        type: "Public",
    },
    restartPolicy: "always",
});
export const containerIPv4address = containerGroup.ipAddress.apply(ip => ip?.ip);