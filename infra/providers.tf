terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100" # or the latest available
    }
    random = {
      source  = "hashicorp/random"
      version = "~>3.1"
    }
  }
}


provider "azurerm" {
  features {}

  # Service Principal Authentication (Option 2)
  client_id       = var.client_id
  client_secret   = var.client_secret
  tenant_id       = var.tenant_id
  subscription_id = var.subscription_id
}

# Add these variables to use with Service Principal
variable "client_id" {
  description = "Service Principal client ID"
  type        = string
  default     = ""
}

variable "client_secret" {
  description = "Service Principal client secret"
  type        = string
  sensitive   = true
}

variable "tenant_id" {
  description = "Azure tenant ID"
  type        = string
  default     = ""
}

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
  default     = ""
}