resource "azurerm_kubernetes_cluster" "aks" {
  name                = "${var.prefix}-aks"
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "${var.prefix}-aks"

  default_node_pool {
    name                = "default"
    node_count          = 1              # Start with 1 node
    vm_size             = "Standard_B2s" # Burstable, low-cost VM size
    vnet_subnet_id      = azurerm_subnet.aks_subnet.id
    enable_auto_scaling = true
    min_count           = 1
    max_count           = 2 # Allow scaling up to 2 nodes if needed
  }

  identity {
    type = "SystemAssigned"
  }

  # Enable Azure Monitor for containers (optional but recommended)
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.law.id
  }

  # Network profile (using basic Kubenet for simplicity, CNI needs more IPs)
  network_profile {
    network_plugin     = "azure"
    docker_bridge_cidr = "172.17.0.1/16"
    dns_service_ip     = "10.1.0.10"
    service_cidr       = "10.1.0.0/16"
  }

  # Grant AKS access to pull images from ACR
  role_based_access_control_enabled = true
  azure_active_directory_role_based_access_control {
    managed                = true
    admin_group_object_ids = [] # Add your AAD Group Object ID if you want AAD integration
  }

  # --- REMOVED ingress_application_gateway block ---

} # End of azurerm_kubernetes_cluster resource

# Role assignment for AKS to pull from ACR
resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  # Use Kubelet identity for pulling images when using SystemAssigned Identity
  principal_id = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
}