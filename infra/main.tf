# Create a random suffix for resources that need global uniqueness
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Create the Resource Group
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}