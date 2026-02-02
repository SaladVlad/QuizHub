terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}

provider "azurerm" {
  features {}
  skip_provider_registration = true
}

# Resource Group
resource "azurerm_resource_group" "quizhub" {
  name     = var.resource_group_name
  location = var.location

  tags = var.tags
}

# Virtual Network
resource "azurerm_virtual_network" "quizhub" {
  name                = "${var.cluster_name}-vnet"
  location            = azurerm_resource_group.quizhub.location
  resource_group_name = azurerm_resource_group.quizhub.name
  address_space       = ["10.0.0.0/8"]

  tags = var.tags
}

# AKS Subnet
resource "azurerm_subnet" "aks" {
  name                 = "${var.cluster_name}-aks-subnet"
  resource_group_name  = azurerm_resource_group.quizhub.name
  virtual_network_name = azurerm_virtual_network.quizhub.name
  address_prefixes     = ["10.240.0.0/16"]
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "quizhub" {
  name                = var.cluster_name
  location            = azurerm_resource_group.quizhub.location
  resource_group_name = azurerm_resource_group.quizhub.name
  dns_prefix          = var.cluster_name
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "default"
    node_count          = var.node_count
    vm_size             = var.vm_size
    vnet_subnet_id      = azurerm_subnet.aks.id
    type                = "VirtualMachineScaleSets"
    enable_auto_scaling = true
    min_count           = var.min_node_count
    max_count           = var.max_node_count
    max_pods            = 110
    os_disk_size_gb     = 30

    upgrade_settings {
      max_surge = "10%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    load_balancer_sku = "standard"
    service_cidr      = "10.0.0.0/16"
    dns_service_ip    = "10.0.0.10"
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.quizhub.id
  }

  azure_policy_enabled = false
  
  tags = var.tags
}

# Log Analytics Workspace for Container Insights
resource "azurerm_log_analytics_workspace" "quizhub" {
  name                = "${var.cluster_name}-logs"
  location            = azurerm_resource_group.quizhub.location
  resource_group_name = azurerm_resource_group.quizhub.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}

# Container Registry
resource "azurerm_container_registry" "quizhub" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.quizhub.name
  location            = azurerm_resource_group.quizhub.location
  sku                 = "Basic"
  admin_enabled       = true

  tags = var.tags
}

# Assign ACR Pull role to AKS
resource "azurerm_role_assignment" "aks_acr" {
  principal_id                     = azurerm_kubernetes_cluster.quizhub.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = azurerm_container_registry.quizhub.id
  skip_service_principal_aad_check = true
}

# Public IP for Ingress
resource "azurerm_public_ip" "ingress" {
  name                = "${var.cluster_name}-ingress-ip"
  location            = azurerm_resource_group.quizhub.location
  resource_group_name = azurerm_kubernetes_cluster.quizhub.node_resource_group
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = var.tags
}

# Kubernetes Provider Configuration
provider "kubernetes" {
  host                   = azurerm_kubernetes_cluster.quizhub.kube_config.0.host
  client_certificate     = base64decode(azurerm_kubernetes_cluster.quizhub.kube_config.0.client_certificate)
  client_key             = base64decode(azurerm_kubernetes_cluster.quizhub.kube_config.0.client_key)
  cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.quizhub.kube_config.0.cluster_ca_certificate)
}

# Helm Provider Configuration
provider "helm" {
  kubernetes {
    host                   = azurerm_kubernetes_cluster.quizhub.kube_config.0.host
    client_certificate     = base64decode(azurerm_kubernetes_cluster.quizhub.kube_config.0.client_certificate)
    client_key             = base64decode(azurerm_kubernetes_cluster.quizhub.kube_config.0.client_key)
    cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.quizhub.kube_config.0.cluster_ca_certificate)
  }
}

# Create Namespaces
resource "kubernetes_namespace" "quizhub" {
  metadata {
    name = "quizhub"
  }

  depends_on = [azurerm_kubernetes_cluster.quizhub]
}

resource "kubernetes_namespace" "observability" {
  metadata {
    name = "observability"
  }

  depends_on = [azurerm_kubernetes_cluster.quizhub]
}

# Install NGINX Ingress Controller
resource "helm_release" "nginx_ingress" {
  name       = "nginx-ingress"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"
  version    = "4.8.3"

  create_namespace = true
  

  set {
    name  = "controller.service.loadBalancerIP"
    value = azurerm_public_ip.ingress.ip_address
  }

  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/azure-load-balancer-resource-group"
    value = azurerm_kubernetes_cluster.quizhub.node_resource_group
  }

  set {
    name  = "controller.metrics.enabled"
    value = "true"
  }

  depends_on = [azurerm_kubernetes_cluster.quizhub]
}

# Note: Metrics Server is pre-installed by AKS, no need to install it via Helm
# If you need to configure it, use kubectl or Azure portal instead