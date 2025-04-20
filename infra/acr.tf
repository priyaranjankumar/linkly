resource "azurerm_container_registry" "acr" {
  name                = "${var.prefix}acr${random_string.suffix.result}" # Globally unique name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic" # Lowest cost tier
  admin_enabled       = true    # Enable admin user for easier authentication initially
}