output "resource_group_name" {
  value       = azurerm_resource_group.quizhub.name
  description = "Resource group name"
}

output "aks_cluster_name" {
  value       = azurerm_kubernetes_cluster.quizhub.name
  description = "AKS cluster name"
}

output "aks_cluster_id" {
  value       = azurerm_kubernetes_cluster.quizhub.id
  description = "AKS cluster ID"
}

output "aks_kubeconfig" {
  value       = azurerm_kubernetes_cluster.quizhub.kube_config_raw
  description = "Kubeconfig for AKS cluster"
  sensitive   = true
}

output "acr_name" {
  value       = azurerm_container_registry.quizhub.name
  description = "Azure Container Registry name"
}

output "acr_login_server" {
  value       = azurerm_container_registry.quizhub.login_server
  description = "ACR login server"
}

output "acr_admin_username" {
  value       = azurerm_container_registry.quizhub.admin_username
  description = "ACR admin username"
  sensitive   = true
}

output "acr_admin_password" {
  value       = azurerm_container_registry.quizhub.admin_password
  description = "ACR admin password"
  sensitive   = true
}

output "ingress_ip" {
  value       = azurerm_public_ip.ingress.ip_address
  description = "Public IP for ingress controller"
}

output "log_analytics_workspace_id" {
  value       = azurerm_log_analytics_workspace.quizhub.id
  description = "Log Analytics Workspace ID"
}

output "configure_kubectl" {
  value       = "az aks get-credentials --resource-group ${azurerm_resource_group.quizhub.name} --name ${azurerm_kubernetes_cluster.quizhub.name}"
  description = "Command to configure kubectl"
}
