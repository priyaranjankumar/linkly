resource "azurerm_virtual_network" "vnet" {
  name                = "${var.prefix}-vnet"
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = ["10.0.0.0/16"]
}

# Subnet for AKS nodes
resource "azurerm_subnet" "aks_subnet" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Subnet for other services like PostgreSQL Flexible Server (optional, but good practice)
# Note: Basic tier Postgres doesn't support VNet integration. If you upgrade later, this is useful.
resource "azurerm_subnet" "service_subnet" {
  name                 = "service-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.2.0/24"]
  # Required delegation for flexible server VNet integration if used
  # delegation {
  #   name = "fs"
  #   service_delegation {
  #     name    = "Microsoft.DBforPostgreSQL/flexibleServers"
  #     actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
  #   }
  # }
}