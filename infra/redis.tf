resource "azurerm_redis_cache" "redis" {
  name                          = "${var.prefix}-redis-${random_string.suffix.result}" # Globally unique
  location                      = azurerm_resource_group.rg.location
  resource_group_name           = azurerm_resource_group.rg.name
  capacity                      = 0       # Required for Basic C0
  family                        = "C"     # C = Basic/Standard, P = Premium
  sku_name                      = "Basic" # Lowest cost, non-SLA, single node
  non_ssl_port_enabled          = false
  public_network_access_enabled = true # Allow public access (needed for AKS without Private Link/VNet)

  # Basic tier specific settings
  minimum_tls_version = "1.2"
  redis_configuration {} # Needs an empty block
}