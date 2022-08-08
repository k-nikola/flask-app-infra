import * as pulumi from '@pulumi/pulumi'

// Service configuration structure
export interface serviceConfig {
  image: string
  specs: {
    cpu: number
    mem: number
  }
  vars: {
    [varName: string]: string
  }
  opts?: any
}

export interface stackServicesConfig {
  [serviceName: string]: serviceConfig
}

// Object of configLoader class can be used to load the configuration of the stack, and to load hierarchical service configuration.
export class configLoader {
  public readonly config: pulumi.Config
  public readonly stackServices: stackServicesConfig

  constructor() {
    this.config = new pulumi.Config()
    this.stackServices =
      this.config.requireObject<stackServicesConfig>('stackServices')
  }
}

// Initialize and export the config
const load = new configLoader()
export const stackServices = load.stackServices
export const config = load.config
