# QuizHub Observability Implementation Log

**Author:** Vladislav Petković
**Date Started:** 2025-10-08
**Purpose:** Complete step-by-step log of implementing observability for QuizHub microservices using Kubernetes and ELK stack

---

## Phase 1: Minikube Setup & Kubernetes Migration

### Step 1: Verify Prerequisites (2025-10-08)

**Commands:**
```bash
minikube version  # v1.37.0
kubectl version   # v1.34.1
docker version    # 28.5.0
```

**Result:** All tools installed and ready.

**What we learned:**
- Minikube creates a local Kubernetes cluster for development
- kubectl is the CLI tool to interact with Kubernetes API
- Docker is the container runtime

---

### Step 2: Start Minikube Cluster (2025-10-08)

**Command:**
```bash
minikube start --cpus=6 --memory=12288 --disk-size=50g --driver=docker
```

**Parameters Explained:**
- `--cpus=6`: Allocate 6 CPU cores to the cluster
- `--memory=12288`: Allocate 12GB RAM (in MB)
- `--disk-size=50g`: Create 50GB virtual disk
- `--driver=docker`: Use Docker as virtualization driver (runs K8s in Docker container)

**What happened:**
1. Minikube created a Docker container named "minikube"
2. Inside the container, it installed:
   - Kubernetes control plane (API server, scheduler, controller manager)
   - etcd (key-value store for cluster state)
   - kubelet (manages pods on the node)
   - Container runtime (containerd)
3. Configured kubectl to point to this cluster
4. Enabled default storage provisioner

**Result:**
```
✓ Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default
```

**Why these resources?**
- ELK Stack: ~4GB RAM
- Prometheus + Grafana: ~2-3GB RAM
- 3 SQL Server databases: ~6GB RAM (2GB each)
- 4 microservices + frontend: ~2-4GB RAM
- Total needed: ~14-17GB (12GB is tight but workable)

---

### Step 3: Enable Essential Addons (2025-10-08)

**Commands:**
```bash
minikube addons enable ingress
minikube addons enable metrics-server
```

**Addon 1: Ingress**
- **Purpose:** Manages external HTTP/HTTPS access to services
- **Implementation:** Installs NGINX Ingress Controller
- **Why we need it:** Single entry point for routing traffic to multiple services
- **Example routing:**
  ```
  http://quizhub.local/          → Frontend
  http://quizhub.local/api/      → Gateway
  http://kibana.local/           → Kibana
  ```

**Addon 2: Metrics Server**
- **Purpose:** Collects CPU/memory metrics from all pods
- **Why we need it:**
  - Enables Horizontal Pod Autoscaler (HPA)
  - Powers `kubectl top pods` command
  - Provides data for Grafana dashboards
- **How it works:** Scrapes kubelet every 15s, stores last 1-2 minutes in memory

**Result:**
```
✓ The 'ingress' addon is enabled
✓ The 'metrics-server' addon is enabled
```

---

### Step 4: Verify Cluster Health (2025-10-08)

**Command:**
```bash
kubectl get nodes
kubectl get pods -n kube-system
```

**Result:**
```
NAME       STATUS   ROLES           AGE   VERSION
minikube   Ready    control-plane   20m   v1.34.0
```

**System Pods Running:**
- `coredns`: DNS service for service discovery
- `etcd`: Key-value store for cluster state
- `kube-apiserver`: REST API for Kubernetes
- `kube-controller-manager`: Manages controllers (ReplicaSets, Deployments, etc.)
- `kube-scheduler`: Assigns pods to nodes
- `kube-proxy`: Network proxy on each node
- `metrics-server`: Collects resource metrics
- `storage-provisioner`: Dynamically provisions persistent volumes

**Status:** ✅ Cluster is healthy and ready

---

### Step 5: Create Namespaces (2025-10-08)

**Command:**
```bash
kubectl create namespace quizhub
kubectl create namespace observability
kubectl create namespace databases
```

**What are namespaces?**
- Virtual clusters within a Kubernetes cluster
- Provide isolation and organization
- Enable resource quotas and access control per namespace

**Our namespace strategy:**
1. **quizhub:** Application services (Gateway, UserService, QuizService, ResultService, Frontend)
2. **observability:** Monitoring stack (Elasticsearch, Kibana, Filebeat, Prometheus, Grafana)
3. **databases:** SQL Server databases (isolates stateful from stateless services)

**Benefits:**
- Clean separation of concerns
- Easier resource management
- Security isolation
- Better organization for thesis documentation

**Result:**
```
✅ namespace/quizhub created
✅ namespace/observability created
✅ namespace/databases created
```

---

### Step 6: Create Kubernetes Manifests Directory Structure (2025-10-08)

**Command:**
```bash
mkdir -p k8s/{namespaces,databases,services/{gateway,user-service,quiz-service,result-service},frontend,observability/{elasticsearch,kibana,filebeat,prometheus},ingress,scripts}
```

**Directory structure created:**
```
k8s/
├── namespaces/          # Namespace definitions (already created via kubectl)
├── databases/           # SQL Server StatefulSets, PVCs, Services
│   ├── user-db/
│   ├── quiz-db/
│   └── result-db/
├── services/            # Microservices Deployments, ConfigMaps, Secrets, Services
│   ├── gateway/
│   ├── user-service/
│   ├── quiz-service/
│   └── result-service/
├── frontend/            # React frontend Deployment, Service
├── observability/       # Monitoring stack
│   ├── elasticsearch/
│   ├── kibana/
│   ├── filebeat/
│   └── prometheus/
├── ingress/             # Ingress rules for external access
└── scripts/             # Automation scripts (setup, deploy, cleanup)
```

**What will go in each directory?**
- **Deployment.yaml:** Defines how to run the application (replicas, image, resources)
- **Service.yaml:** Exposes the application with a stable network endpoint
- **ConfigMap.yaml:** Configuration files (appsettings.json)
- **Secret.yaml:** Sensitive data (passwords, JWT keys)
- **PersistentVolumeClaim.yaml:** Storage requests (for databases)

**Result:** ✅ Directory structure created

---

### Step 7: Build Docker Images in Minikube (2025-10-08)

**Why build in Minikube?**
Instead of pushing images to Docker Hub (requires internet, registry setup), we build directly inside Minikube's Docker daemon. This is perfect for local development and thesis work.

**Process:**
1. Point Docker CLI to Minikube's Docker daemon:
```bash
eval $(minikube docker-env)
```

2. Build all service images from their respective directories

**Created build script:** `k8s/scripts/build-images.sh`
- Automated build process for all 5 services
- Sequential builds with progress indication
- Final summary showing all images

**Build time:**
- Gateway: ~25 seconds
- UserService: ~64 seconds (includes NuGet restore)
- QuizService: ~33 seconds
- ResultService: ~46 seconds
- Frontend: ~7 seconds
- **Total:** ~3 minutes

**Images created:**
```
REPOSITORY             TAG       SIZE
quizhub/gateway        latest    224MB
quizhub/user-service   latest    240MB
quizhub/quiz-service   latest    239MB
quizhub/result-service latest    241MB
quizhub/frontend       latest    62.8MB
```

**Multi-stage build explanation:**
Each .NET Dockerfile uses 2 stages:
1. **Build stage:** Uses `mcr.microsoft.com/dotnet/sdk:8.0` (heavy, ~700MB)
   - Contains compiler, MSBuild, NuGet
   - Runs `dotnet publish -c Release`

2. **Runtime stage:** Uses `mcr.microsoft.com/dotnet/aspnet:8.0` (light, ~200MB)
   - Only contains ASP.NET Core runtime
   - Copies compiled output from build stage
   - Final image is much smaller!

**Key takeaway:** Images are ONLY in Minikube's Docker. When creating Kubernetes manifests, we must use:
```yaml
imagePullPolicy: Never  # Don't try to pull from registry!
```

**Result:** ✅ All 5 Docker images built successfully

---

### Step 8: Deploy SQL Server Databases (2025-10-08)

**Why StatefulSets instead of Deployments?**
Databases are **stateful applications** - they need:
- Stable network identity (same hostname after restart)
- Persistent storage that survives pod deletion
- Ordered, graceful deployment and scaling

**What we created for each database (user-db, quiz-db, result-db):**

1. **Secret**: Stores SA password securely
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: user-db-secret
  namespace: databases
type: Opaque
stringData:
  SA_PASSWORD: "YourStrong@Passw0rd"
```

2. **StatefulSet**: Manages the database pod
   - Uses `mcr.microsoft.com/mssql/server:2022-latest`
   - SQL Server Express edition (free, lighter than Standard)
   - Resource limits: 1Gi-2Gi RAM, 500m-1000m CPU
   - Volume mount at `/var/opt/mssql` (where SQL Server stores data)

3. **Service (Headless)**: Provides stable network endpoint
   - `clusterIP: None` makes it a headless service
   - DNS: `user-db.databases.svc.cluster.local`
   - StatefulSet pods get stable DNS: `user-db-0.user-db.databases.svc.cluster.local`

4. **PersistentVolumeClaim (via volumeClaimTemplates)**: Requests storage
   - Each pod gets its own 5Gi volume
   - Minikube provisions using `hostPath` (stores on node's disk)
   - Data persists even if pod is deleted!

**Deployment process:**
```bash
kubectl apply -f k8s/databases/
# Created 9 resources (3 secrets, 3 statefulsets, 3 services)
```

**Pod names are predictable with StatefulSets:**
- `user-db-0` (not random like Deployments: user-db-abc123)
- `quiz-db-0`
- `result-db-0`

**Startup time:** ~60 seconds per database

**Result:** ✅ All 3 SQL Server databases running with persistent storage

**Key concepts learned:**
- **StatefulSet vs Deployment**: StatefulSets provide stable identity and ordered scaling
- **Headless Service**: `clusterIP: None` - used with StatefulSets for direct pod access
- **volumeClaimTemplates**: Automatically creates a PVC for each StatefulSet replica
- **PersistentVolume (PV)**: Physical storage on the node
- **PersistentVolumeClaim (PVC)**: Request for storage by a pod

**Storage verification:**
```bash
kubectl get pvc -n databases
# Shows 3 PVCs, each 5Gi, all "Bound" to PVs
```

---

### Step 9: Created Automation Scripts and Documentation (2025-10-08)

**Problem:** Setting up Kubernetes manually is error-prone and time-consuming.

**Solution:** Created comprehensive automation and documentation.

**Files created:**

1. **k8s/README.md** (Complete deployment guide)
   - Prerequisites checklist
   - Quick start (automated)
   - Step-by-step manual deployment
   - Troubleshooting guide
   - Architecture diagrams
   - Useful kubectl commands

2. **k8s/scripts/setup-all.sh** (Complete automation)
   - One-command deployment of entire stack
   - Color-coded progress output
   - Error handling and validation
   - Prerequisites check
   - Waits for pods to be ready
   - Final summary with access instructions

3. **k8s/scripts/cleanup.sh** (Safe cleanup)
   - Confirmation prompt before deletion
   - Removes all QuizHub resources
   - Preserves Minikube cluster
   - Instructions for complete cluster deletion

4. **k8s/scripts/status.sh** (Status monitoring)
   - Shows cluster status
   - Lists all pods across namespaces
   - Resource usage (CPU/memory)
   - Access information

5. **k8s/scripts/build-images.sh** (Already created earlier)
   - Builds all Docker images in Minikube

**Usage:**
```bash
# Complete setup in one command
cd k8s/scripts
./setup-all.sh

# Check status anytime
./status.sh

# Clean up everything
./cleanup.sh
```

**Benefits:**
- ✅ Reproducible deployment (anyone can run it)
- ✅ Saves time (automated vs 30+ manual kubectl commands)
- ✅ Error prevention (validates prerequisites, waits for readiness)
- ✅ Great for thesis demonstration
- ✅ Easier for testing and development

**Updated main README.md:**
- Added Kubernetes deployment section
- Prerequisites for both Docker Compose and Kubernetes
- Quick start for both approaches
- Link to detailed k8s/README.md

**Result:** ✅ Complete documentation and automation ready

---

## Phase 2: Enhanced Observability Implementation (2025-11-03)

### Step 10: Enrich Logs with Service Name Properties (2025-11-03)

**Problem:** Logs from all services were being collected, but there was no easy way to filter logs by service name in Kibana. Each service's logs looked identical without service identification.

**Solution:** Add Serilog configuration with custom properties to all service ConfigMaps.

**Files Modified:**
1. `k8s/services/gateway/gateway-configmap.yaml`
2. `k8s/services/user-service/user-service-configmap.yaml`
3. `k8s/services/quiz-service/quiz-service-configmap.yaml`
4. `k8s/services/result-service/result-service-configmap.yaml`

**Configuration Added:**
```json
"Serilog": {
  "Using": [ "Serilog.Sinks.Console", "Serilog.Sinks.File" ],
  "MinimumLevel": {
    "Default": "Information",
    "Override": {
      "Microsoft": "Warning",
      "Microsoft.AspNetCore": "Warning",
      "System": "Warning"
    }
  },
  "WriteTo": [
    {
      "Name": "Console",
      "Args": {
        "outputTemplate": "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}] [{Level:u3}] [{ServiceName}] [{SourceContext}] {Message:lj}{NewLine}{Exception}"
      }
    },
    {
      "Name": "File",
      "Args": {
        "path": "/app/logs/user-service-.log",
        "rollingInterval": "Day",
        "outputTemplate": "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}] [{Level:u3}] [{ServiceName}] [{SourceContext}] {Message:lj}{NewLine}{Exception}"
      }
    }
  ],
  "Enrich": [ "FromLogContext", "WithMachineName", "WithThreadId" ],
  "Properties": {
    "ServiceName": "UserService",
    "Environment": "Production",
    "Application": "QuizHub"
  }
}
```

**What this does:**
- Adds `ServiceName`, `Environment`, and `Application` properties to every log entry
- These properties are included in the JSON output
- Filebeat can extract these and create searchable fields in Elasticsearch
- Output template includes `[{ServiceName}]` for human-readable logs

**Key properties:**
- **ServiceName**: Identifies which microservice (Gateway, UserService, QuizService, ResultService)
- **Environment**: Deployment environment (Production)
- **Application**: Overall application name (QuizHub)

**Result:** ✅ All 4 services now have enriched Serilog configuration

**What we learned:**
- Serilog's `Properties` section adds global properties to all log events
- These properties appear in both the log output template AND the structured JSON
- This enables filtering in Kibana like: `json.Properties.ServiceName: "UserService"`

---

### Step 11: Configure Filebeat for Service-Specific Indices (2025-11-03)

**Problem:**
- All logs were going to a single daily index like `filebeat-quizhub-2025.11.03`
- Difficult to query logs from specific services
- No automated index lifecycle management (old logs accumulate forever)

**Solution:** Implement JavaScript processor in Filebeat to extract service name and route to per-service indices with ILM support.

**File Modified:** `k8s/observability/filebeat.yaml`

**Changes Made:**

1. **Added JavaScript Processor:**
```yaml
- script:
    lang: javascript
    source: >
      function process(event) {
        var serviceName = "unknown";

        // Try to get ServiceName from the JSON log
        if (event.Get("json.Properties.ServiceName")) {
          serviceName = event.Get("json.Properties.ServiceName").toLowerCase();
        }
        // Fallback: extract from container name
        else if (event.Get("kubernetes.container.name")) {
          var containerName = event.Get("kubernetes.container.name");
          if (containerName.includes("gateway")) serviceName = "gateway";
          else if (containerName.includes("user-service")) serviceName = "userservice";
          else if (containerName.includes("quiz-service")) serviceName = "quizservice";
          else if (containerName.includes("result-service")) serviceName = "resultservice";
        }

        event.Put("service.name", serviceName);
        event.Put("service.environment", event.Get("json.Properties.Environment") || "production");
        event.Put("application", event.Get("json.Properties.Application") || "QuizHub");
      }
```

**How the processor works:**
1. Reads each log event from container logs
2. Tries to extract `ServiceName` from JSON log properties (added in Step 10)
3. Falls back to parsing container name if property not found
4. Creates three new fields:
   - `service.name` (lowercase): gateway, userservice, quizservice, resultservice
   - `service.environment`: production
   - `application`: QuizHub

2. **Updated Output Configuration:**
```yaml
output.elasticsearch:
  hosts: ["http://elasticsearch.observability.svc.cluster.local:9200"]
  index: "quizhub-%{[service.name]}-%{+yyyy.MM.dd}"
  ilm.enabled: true
  ilm.rollover_alias: "quizhub-%{[service.name]}"
  ilm.pattern: "{now/d}-000001"
  ilm.policy: "quizhub-policy"
```

**Index naming now:**
- `quizhub-gateway-2025.11.03-000001`
- `quizhub-userservice-2025.11.03-000001`
- `quizhub-quizservice-2025.11.03-000001`
- `quizhub-resultservice-2025.11.03-000001`

**Benefits:**
- ✅ Easy to query logs from specific service: `service.name: "userservice"`
- ✅ Better index organization
- ✅ Can apply different retention policies per service if needed
- ✅ Smaller, more focused indices (better search performance)

**Result:** ✅ Filebeat configured for service-specific indices with ILM

**What we learned:**
- Filebeat supports JavaScript processors for custom field extraction
- `event.Get()` and `event.Put()` methods manipulate event fields
- `%{[field.name]}` syntax in output config allows dynamic index names
- ILM aliases allow write operations while managing underlying indices

---

### Step 12: Create Index Lifecycle Management (ILM) Policy (2025-11-03)

**Problem:** Without ILM, Elasticsearch indices grow forever and consume all disk space. Old logs are rarely accessed but take up resources.

**Solution:** Create automated ILM policy with Hot → Warm → Delete phases.

**File Created:** `k8s/observability/elasticsearch-ilm-policy.yaml`

**What this creates:**
A Kubernetes Job that runs once to set up:
1. ILM policy named `quizhub-policy`
2. Index templates for each service
3. Bootstrap indices with write aliases

**ILM Policy Phases:**

**Phase 1: Hot (0-1 day)**
```json
"hot": {
  "min_age": "0ms",
  "actions": {
    "rollover": {
      "max_size": "5GB",
      "max_age": "1d",
      "max_docs": 10000000
    },
    "set_priority": {
      "priority": 100
    }
  }
}
```
- Active writes go here
- Rollover creates new index when ANY condition met:
  - Index size > 5GB
  - Index age > 1 day
  - Document count > 10 million
- Highest priority (100) for fast searches

**Phase 2: Warm (2-30 days)**
```json
"warm": {
  "min_age": "2d",
  "actions": {
    "set_priority": {
      "priority": 50
    },
    "forcemerge": {
      "max_num_segments": 1
    },
    "shrink": {
      "number_of_shards": 1
    }
  }
}
```
- Read-only indices
- Force merge to 1 segment (better compression & search speed)
- Shrink to 1 shard (reduces resource usage)
- Lower priority (50)

**Phase 3: Delete (>30 days)**
```json
"delete": {
  "min_age": "30d",
  "actions": {
    "delete": {}
  }
}
```
- Automatically deletes indices older than 30 days
- Prevents disk from filling up

**Index Templates:**
For each service, creates a template that:
- Matches pattern: `quizhub-{service}-*`
- Sets default settings:
  - 1 shard (appropriate for small cluster)
  - 0 replicas (single-node Minikube)
  - Links to `quizhub-policy` ILM policy
  - Rollover alias: `quizhub-{service}`

**Mappings defined:**
```json
"mappings": {
  "properties": {
    "@timestamp": {"type": "date"},
    "service.name": {"type": "keyword"},
    "service.environment": {"type": "keyword"},
    "application": {"type": "keyword"},
    "json.Level": {"type": "keyword"},
    "json.Properties.ServiceName": {"type": "keyword"},
    "json.MessageTemplate": {"type": "text"},
    "json.RenderedMessage": {"type": "text"},
    "kubernetes.namespace": {"type": "keyword"},
    "kubernetes.pod.name": {"type": "keyword"},
    "kubernetes.container.name": {"type": "keyword"}
  }
}
```

**Bootstrap Indices:**
Creates initial write indices for each service:
- `<quizhub-gateway-{now/d}-000001>`
- `<quizhub-userservice-{now/d}-000001>`
- `<quizhub-quizservice-{now/d}-000001>`
- `<quizhub-resultservice-{now/d}-000001>`

With write aliases:
- `quizhub-gateway` → `quizhub-gateway-2025.11.03-000001` (is_write_index: true)

**How to deploy:**
```bash
# Create the ILM setup job
kubectl apply -f k8s/observability/elasticsearch-ilm-policy.yaml

# Wait for completion
kubectl wait --for=condition=complete job/elasticsearch-ilm-setup -n observability --timeout=120s

# Check logs
kubectl logs -n observability job/elasticsearch-ilm-setup

# Clean up job after success
kubectl delete job elasticsearch-ilm-setup -n observability
```

**Verification commands:**
```bash
# Check ILM policy exists
curl http://localhost:9200/_ilm/policy/quizhub-policy?pretty

# List all indices
curl http://localhost:9200/_cat/indices/quizhub-*?v

# Check which phase each index is in
curl http://localhost:9200/quizhub-*/_ilm/explain?pretty
```

**Result:** ✅ Production-grade ILM policy with automatic cleanup and optimization

**What we learned:**
- **ILM Phases:** Hot (writes) → Warm (reads) → Delete (cleanup)
- **Rollover:** Creates new indices automatically based on size/age/docs
- **Index Templates:** Pre-configure settings for indices matching a pattern
- **Write Aliases:** Allow Filebeat to write to "quizhub-gateway" while actual index is "quizhub-gateway-2025.11.03-000001"
- **Kubernetes Jobs:** Run-once tasks perfect for setup operations

---

### Step 13: Deploy Jaeger for Distributed Tracing (2025-11-03)

**Problem:** No visibility into how requests flow through microservices. Can't identify which service is causing slowness in a multi-service request.

**Solution:** Deploy Jaeger all-in-one for distributed tracing infrastructure.

**File Created:** `k8s/observability/jaeger.yaml`

**What this deploys:**

1. **Jaeger Agent Service** (UDP)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: jaeger-agent
  namespace: observability
spec:
  ports:
  - name: agent-compact
    port: 6831
    protocol: UDP
    targetPort: 6831
```
- Receives traces from instrumented applications
- Uses UDP for low overhead
- Applications send to: `jaeger-agent.observability.svc.cluster.local:6831`

2. **Jaeger Collector Service** (TCP)
```yaml
- name: jaeger-collector-grpc
  port: 14250
  protocol: TCP
- name: jaeger-collector-http
  port: 14268
  protocol: TCP
```
- Receives traces from agents
- Validates, processes, and stores traces

3. **Jaeger Query Service** (Web UI)
```yaml
- name: jaeger-query
  port: 16686
  protocol: TCP
```
- Web interface for viewing traces
- Accessible via ingress at `http://jaeger.quizhub.local`

4. **Jaeger All-in-One Deployment**
```yaml
containers:
- name: jaeger
  image: jaegertracing/all-in-one:1.51
  env:
  - name: COLLECTOR_OTLP_ENABLED
    value: "true"
  - name: SPAN_STORAGE_TYPE
    value: "memory"
  - name: MEMORY_MAX_TRACES
    value: "10000"
```

**Key configuration:**
- **All-in-one image:** Includes agent, collector, query, and ingester in one container
- **Memory storage:** Stores traces in RAM (max 10,000 traces)
  - Perfect for development/thesis
  - For production: use Cassandra or Elasticsearch backend
- **OTLP enabled:** Supports OpenTelemetry Protocol
- **Resource limits:** 100m-500m CPU, 256Mi-1Gi RAM

**Ports exposed:**
- 5775 (UDP): Zipkin Thrift
- 6831 (UDP): Jaeger Thrift compact
- 6832 (UDP): Jaeger Thrift binary
- 5778 (TCP): Configuration server
- 16686 (TCP): Query UI
- 14250 (TCP): gRPC collector
- 14268 (TCP): HTTP collector
- 9411 (TCP): Zipkin HTTP

5. **Ingress for Jaeger UI**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jaeger-ingress
  namespace: observability
spec:
  rules:
  - host: jaeger.quizhub.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: jaeger-query
            port:
              number: 16686
```

**How to deploy:**
```bash
# Deploy Jaeger
kubectl apply -f k8s/observability/jaeger.yaml

# Wait for ready
kubectl wait --for=condition=ready pod -l app=jaeger -n observability --timeout=120s

# Add to /etc/hosts
echo "$(minikube ip) jaeger.quizhub.local" | sudo tee -a /etc/hosts

# Access UI
open http://jaeger.quizhub.local
```

**What Jaeger provides:**
- **Service Dependency Graph:** Visual map of service-to-service calls
- **Distributed Traces:** Follow a single request across all services
- **Performance Analysis:** See latency for each service in the chain
- **Error Tracking:** Identify which service caused an error

**Example trace visualization:**
```
Request ID: abc123
Total Duration: 250ms

Gateway (10ms)
 └─> UserService.ValidateToken (40ms)
     └─> Database Query (30ms)
 └─> QuizService.GetQuiz (120ms)
     └─> Database Query (100ms)
 └─> ResultService.GetScore (80ms)
     └─> Database Query (70ms)
```

**Current state:** Infrastructure ready, but services need OpenTelemetry instrumentation to send traces.

**Next step for tracing:** Add OpenTelemetry packages to .NET services:
```bash
dotnet add package OpenTelemetry.Exporter.Jaeger
dotnet add package OpenTelemetry.Instrumentation.AspNetCore
dotnet add package OpenTelemetry.Instrumentation.Http
dotnet add package OpenTelemetry.Instrumentation.SqlClient
```

**Result:** ✅ Jaeger deployed and accessible, ready for service instrumentation

**What we learned:**
- **Distributed Tracing:** Track requests across microservices
- **Jaeger Components:** Agent (receive) → Collector (process) → Storage → Query (UI)
- **OTLP:** OpenTelemetry Protocol, standard for telemetry data
- **Memory vs Persistent Storage:** Memory good for dev, production needs Cassandra/ES
- **UDP for Tracing:** Low overhead, fire-and-forget from applications

---

### Step 14: Organize Manifest Files by Type (2025-11-03)

**Problem:** Ingress files were scattered across different directories (`k8s/ingress.yaml` and `k8s/observability/*-ingress.yaml`), making it hard to find and manage routing rules.

**Solution:** Create dedicated `k8s/ingress/` directory and move all ingress manifests there.

**Files Moved:**
1. `k8s/ingress.yaml` → `k8s/ingress/quizhub-ingress.yaml`
2. `k8s/observability/kibana-ingress.yaml` → `k8s/ingress/kibana-ingress.yaml`
3. `k8s/observability/grafana-ingress.yaml` → `k8s/ingress/grafana-ingress.yaml`
4. `k8s/observability/prometheus-ingress.yaml` → `k8s/ingress/prometheus-ingress.yaml`

**Note:** `k8s/observability/jaeger.yaml` already includes Jaeger ingress inline, so no separate file needed.

**Final Directory Structure:**
```
k8s/
├── README.md                      # Deployment guide
├── MANIFESTS_SUMMARY.md           # Complete manifest list
├── OBSERVABILITY_SETUP.md         # Observability basics
├── ENHANCED_OBSERVABILITY.md      # Enhanced features (NEW)
│
├── scripts/                       # Automation scripts
│   ├── setup-all.sh              # Complete automated setup
│   ├── build-images.sh           # Build Docker images
│   ├── cleanup.sh                # Cleanup script
│   └── status.sh                 # Status monitoring
│
├── databases/                     # SQL Server (namespace: databases)
│   ├── user-db-statefulset.yaml
│   ├── user-db-service.yaml
│   ├── user-db-secret.yaml
│   ├── quiz-db-statefulset.yaml
│   ├── quiz-db-service.yaml
│   ├── quiz-db-secret.yaml
│   ├── result-db-statefulset.yaml
│   ├── result-db-service.yaml
│   └── result-db-secret.yaml
│
├── services/                      # Microservices (namespace: quizhub)
│   ├── gateway/
│   │   ├── gateway-deployment.yaml
│   │   ├── gateway-service.yaml
│   │   ├── gateway-configmap.yaml
│   │   └── gateway-secret.yaml
│   ├── user-service/
│   │   ├── user-service-deployment.yaml
│   │   ├── user-service-service.yaml
│   │   ├── user-service-configmap.yaml
│   │   └── user-service-secret.yaml
│   ├── quiz-service/
│   │   ├── quiz-service-deployment.yaml
│   │   ├── quiz-service-service.yaml
│   │   ├── quiz-service-configmap.yaml
│   │   └── quiz-service-secret.yaml
│   └── result-service/
│       ├── result-service-deployment.yaml
│       ├── result-service-service.yaml
│       ├── result-service-configmap.yaml
│       └── result-service-secret.yaml
│
├── frontend/
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   └── frontend-configmap.yaml
│
├── observability/                 # Monitoring (namespace: observability)
│   ├── elasticsearch.yaml        # Log storage (StatefulSet)
│   ├── elasticsearch-ilm-policy.yaml  # ILM setup job (NEW)
│   ├── kibana.yaml               # Log UI
│   ├── filebeat.yaml             # Log collector (DaemonSet)
│   ├── prometheus.yaml           # Metrics collector
│   ├── grafana.yaml              # Metrics UI
│   └── jaeger.yaml               # Distributed tracing (NEW)
│
└── ingress/                       # All ingress rules (NEW)
    ├── quizhub-ingress.yaml      # Main application
    ├── kibana-ingress.yaml       # Kibana UI
    ├── grafana-ingress.yaml      # Grafana UI
    └── prometheus-ingress.yaml   # Prometheus UI
```

**File Naming Convention:** `{resource-name}-{resource-type}.yaml`

**Benefits of this organization:**
- ✅ All ingress rules in one place
- ✅ Easy to apply all ingresses: `kubectl apply -f k8s/ingress/`
- ✅ Clear separation: observability/ contains stack components, ingress/ contains routing
- ✅ Easier to find and modify specific resource types
- ✅ Follows Kubernetes best practices

**Access URLs (after adding to /etc/hosts):**
```bash
echo "$(minikube ip) quizhub.local kibana.quizhub.local grafana.quizhub.local prometheus.quizhub.local jaeger.quizhub.local" | sudo tee -a /etc/hosts
```

- **Application:** http://quizhub.local/api
- **Kibana (Logs):** http://kibana.quizhub.local
- **Grafana (Metrics):** http://grafana.quizhub.local (admin/admin)
- **Prometheus (Metrics):** http://prometheus.quizhub.local
- **Jaeger (Traces):** http://jaeger.quizhub.local

**Result:** ✅ Manifests organized by resource type for better maintainability

**What we learned:**
- **Directory Organization:** Group by purpose (services, observability) and type (ingress)
- **Consistent Naming:** Makes finding resources predictable
- **kubectl apply -f directory/:** Applies all YAML files in a directory
- **Best Practice:** Separate ingress from application logic manifests

---

### Step 15: Create Enhanced Observability Documentation (2025-11-03)

**Problem:** Complex observability features needed comprehensive documentation for thesis work and future maintenance.

**Solution:** Created detailed documentation file explaining all enhanced features.

**File Created:** `k8s/ENHANCED_OBSERVABILITY.md`

**Contents:**
1. **Overview of Enhancements**
   - Enriched structured logging
   - Service-specific Elasticsearch indices
   - Index Lifecycle Management (ILM)
   - Distributed tracing with Jaeger

2. **Log Enrichment Details**
   - Example log entry with all fields
   - Kibana search queries
   - Field explanations

3. **ILM Policy Details**
   - Policy phases explained
   - Rollover mechanism
   - Monitoring commands

4. **Filebeat Processing Pipeline**
   - Step-by-step flow from pod logs to Elasticsearch
   - JavaScript processor logic
   - Field enrichment process

5. **Jaeger Tracing**
   - Architecture diagram
   - Access instructions
   - Example trace visualization
   - Future: OpenTelemetry instrumentation steps

6. **Deployment Instructions**
   - Apply ConfigMap changes
   - Update Filebeat
   - Setup ILM policies
   - Deploy Jaeger

7. **Verification Steps**
   - Check service logs
   - Verify Filebeat processing
   - Inspect Elasticsearch indices
   - Search in Kibana
   - Access Jaeger UI

8. **Monitoring Costs**
   - Storage usage estimates
   - Resource usage table

9. **Troubleshooting Guide**
   - No logs in Kibana
   - ILM not working
   - Jaeger shows no services

**Updated k8s/README.md:**
Added comprehensive "Manifest File Organization" section with:
- Complete directory tree
- File naming conventions
- Resources organized by type
- Access URLs for all UIs

**Result:** ✅ Complete documentation of enhanced observability features

**What we learned:**
- Good documentation is critical for complex systems
- Step-by-step deployment instructions prevent errors
- Troubleshooting guides save time during issues
- Resource estimates help with capacity planning

---

## Phase 2 Summary: Enhanced Observability Achievements

### What We Built:
✅ **Enriched Structured Logging**
- Added ServiceName, Environment, Application properties to all services
- Consistent timestamp format across all logs
- JSON output for machine parsing, human-readable template for console

✅ **Service-Specific Elasticsearch Indices**
- Separate indices per service: `quizhub-gateway-*`, `quizhub-userservice-*`, etc.
- JavaScript processor in Filebeat extracts service name
- Easy filtering: `service.name: "userservice"` in Kibana

✅ **Production-Grade ILM Policy**
- Hot Phase (0-1d): Active writes, highest priority
- Warm Phase (2-30d): Read-only, optimized, compressed
- Delete Phase (>30d): Automatic cleanup
- Prevents disk space exhaustion

✅ **Distributed Tracing Infrastructure**
- Jaeger all-in-one deployed
- Ready for OpenTelemetry instrumentation
- Web UI accessible at http://jaeger.quizhub.local

✅ **Organized Manifest Files**
- Clear directory structure by purpose
- Consistent naming convention
- All ingress rules in dedicated directory
- Comprehensive documentation

### Observability Stack Components:

| Component | Purpose | Access |
|-----------|---------|--------|
| Elasticsearch | Log storage with ILM | Port 9200 (internal) |
| Kibana | Log search & visualization | http://kibana.quizhub.local |
| Filebeat | Log collection (DaemonSet) | N/A (background) |
| Prometheus | Metrics collection | http://prometheus.quizhub.local |
| Grafana | Metrics visualization | http://grafana.quizhub.local |
| Jaeger | Distributed tracing | http://jaeger.quizhub.local |

### Key Search Queries in Kibana:

```
# All logs from UserService
service.name: "userservice"

# All errors across services
json.Level: "Error"

# Errors from specific service
service.name: "gateway" AND json.Level: "Error"

# Logs from specific pod
kubernetes.pod.name: "user-service-69c48575f9-sq4xq"

# Production environment logs
service.environment: "production"

# Last hour of logs from Quiz service
service.name: "quizservice" AND @timestamp: [now-1h TO now]
```

### Resource Usage (Observability Stack):

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| Elasticsearch | 500m | 1000m | 2Gi | 3Gi |
| Kibana | 250m | 500m | 1Gi | 1Gi |
| Filebeat | 100m | 200m | 256Mi | 512Mi |
| Prometheus | 500m | 1000m | 1Gi | 2Gi |
| Grafana | 250m | 500m | 512Mi | 1Gi |
| Jaeger | 150m | 500m | 512Mi | 1Gi |
| **Total** | **1.75 CPUs** | **3.7 CPUs** | **5.25 Gi** | **9.5 Gi** |

### Storage Estimates (with 30-day retention):

- **Low Traffic** (100 req/min): ~5GB total
- **Medium Traffic** (1000 req/min): ~20GB total
- **High Traffic** (10000 req/min): ~100GB total

### Next Phase Tasks:

### Phase 3: Service Instrumentation & Metrics
- [ ] Verify Prometheus is collecting metrics from services
- [ ] Add OpenTelemetry instrumentation to .NET services
- [ ] Implement custom application metrics (counters, gauges, histograms)
- [ ] Create Grafana dashboards for service metrics
- [ ] Configure alerting rules in Prometheus

### Phase 4: Testing & Validation
- [ ] Load testing to generate logs and traces
- [ ] Verify end-to-end observability (logs → metrics → traces correlation)
- [ ] Create Kibana dashboards for common queries
- [ ] Document all dashboards and queries for thesis
- [ ] Chaos testing (pod failures, resource exhaustion)

---

## Key Kubernetes Concepts Learned

### 1. Pods
- Smallest deployable unit in Kubernetes
- One or more containers sharing network and storage
- Ephemeral (temporary) - can be killed and recreated

### 2. Deployments
- Manages a ReplicaSet of identical pods
- Ensures desired number of replicas are running
- Handles rolling updates without downtime

### 3. Services
- Stable network endpoint for pods (pods have dynamic IPs)
- Load balances traffic across pod replicas
- Types: ClusterIP (internal), NodePort (external), LoadBalancer (cloud)

### 4. Namespaces
- Virtual clusters for isolation
- Resource quotas and RBAC policies can be applied per namespace

### 5. Ingress
- HTTP/HTTPS routing to services
- Single entry point with path-based or host-based routing

### 6. ConfigMaps & Secrets
- ConfigMap: Non-sensitive configuration data
- Secret: Sensitive data (base64 encoded, not encrypted by default)

---

## Resources & Metrics Allocation

### Planned Resource Distribution:

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| Gateway | 200m | 500m | 256Mi | 512Mi |
| UserService | 250m | 1000m | 512Mi | 1Gi |
| QuizService | 250m | 1000m | 512Mi | 1Gi |
| ResultService | 250m | 1000m | 512Mi | 1Gi |
| Frontend | 100m | 200m | 128Mi | 256Mi |
| user-db | 500m | 1000m | 1Gi | 2Gi |
| quiz-db | 500m | 1000m | 1Gi | 2Gi |
| result-db | 500m | 1000m | 1Gi | 2Gi |
| Elasticsearch | 500m | 1000m | 2Gi | 3Gi |
| Kibana | 200m | 500m | 512Mi | 1Gi |
| Filebeat | 100m | 200m | 200Mi | 400Mi |
| Prometheus | 500m | 1000m | 1Gi | 2Gi |
| Grafana | 200m | 500m | 256Mi | 512Mi |

**Total:** ~4.3 CPUs requested, ~11GB RAM requested

---

## Documentation Notes for Thesis

### Chapter 3: Current System Analysis
- Current setup: Docker Compose with 4 microservices + 3 databases
- Limitations: No centralized logging, no metrics, manual scaling, no self-healing
- Identified gaps: Cannot trace requests across services, no visibility into resource usage

### Chapter 4: Implementation
- Section 4.1: Minikube setup and configuration ✅
- Section 4.2: Namespace strategy and resource organization ✅
- Section 4.3: Kubernetes migration (in progress)
- Section 4.4: ELK stack deployment
- Section 4.5: Prometheus & Grafana setup
- Section 4.6: Application instrumentation

### Screenshots to Capture:
- [x] Minikube status output
- [x] kubectl get nodes
- [x] kubectl get namespaces
- [ ] kubectl get pods --all-namespaces (after deployment)
- [ ] Kubernetes Dashboard
- [ ] Kibana dashboard with logs
- [ ] Grafana dashboard with metrics
- [ ] Ingress routing diagram

---

## Troubleshooting Log

### Issue 1: Kubernetes version downgrade
- **Problem:** Tried to start with K8s v1.28.0 but existing cluster was v1.34.0
- **Solution:** Deleted old cluster and started fresh
- **Lesson:** Always check existing cluster version with `minikube status`

---

## Phase 3: Full Stack Deployment & Troubleshooting (2025-11-12)

### Step 16: Deploy Complete Observability Stack (2025-11-12)

**Context:** After preparing all manifests with enhanced observability features, deployed the full stack to test functionality.

**Command:**
```bash
kubectl apply -f k8s/observability/
kubectl apply -f k8s/databases/
kubectl apply -f k8s/ingress/
```

**Initial Status:**
- Services were already running (8 days old)
- Databases started successfully
- Observability stack deployed but Grafana and Kibana in crash loops

**Problems Encountered:**
1. Grafana failing to start
2. Kibana failing readiness probes
3. Jaeger UI returning 503
4. No logs appearing in Kibana

---

### Step 17: Fix Grafana Crash Loop (2025-11-12)

**Problem:** Grafana pod repeatedly crashing with error:
```
invalid tracer address: :udp://10.96.47.129:5775
```

**Root Cause Analysis:**
- Grafana's auto-discovery detected Jaeger service via Kubernetes service discovery
- Attempted to connect to Jaeger before Jaeger was ready
- No graceful fallback when tracing backend unavailable

**Solution:** Disable Grafana tracing to allow independent startup

**File Modified:** `k8s/observability/grafana.yaml`

**Changes Made:**

1. Created Grafana ConfigMap with custom `grafana.ini`:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-config
  namespace: observability
data:
  grafana.ini: |
    [tracing]
    enabled = false

    [tracing.jaeger]
    always_included_tag =
    sampler_type =
    sampler_param = 0
    address =
```

2. Mounted config in Grafana Deployment:
```yaml
volumeMounts:
- name: config
  mountPath: /etc/grafana/grafana.ini
  subPath: grafana.ini
  readOnly: true

volumes:
- name: config
  configMap:
    name: grafana-config
    defaultMode: 0640
```

**Deployment Steps:**
```bash
# Temporarily remove Jaeger agent service that Grafana was trying to connect to
kubectl delete service jaeger-agent -n observability

# Apply updated Grafana config
kubectl apply -f k8s/observability/grafana.yaml

# Wait for Grafana to start
kubectl wait --for=condition=ready pod -l app=grafana -n observability --timeout=120s

# Redeploy Jaeger with fixed configuration
kubectl apply -f k8s/observability/jaeger.yaml
```

**Result:** ✅ Grafana started successfully and is accessible at http://grafana.quizhub.local

**What we learned:**
- Service dependencies should have graceful fallbacks
- Grafana's auto-discovery can cause startup issues
- Disabling unnecessary features improves reliability
- Order of deployment matters when services have dependencies

---

### Step 18: Fix Kibana Crash Loop (2025-11-12)

**Problem:** Kibana pod repeatedly restarting, readiness probe failing:
```
Readiness probe failed: Get "http://10.244.0.19:5601/api/status": dial tcp 10.244.0.19:5601: connect: connection refused
```

**Root Cause:** Kibana's startup time exceeded health probe timeout (60 seconds), causing Kubernetes to kill the pod before it could fully start.

**Solution:** Increase health probe timeouts to allow more time for startup

**File Modified:** `k8s/observability/kibana.yaml`

**Changes Made:**
```yaml
livenessProbe:
  httpGet:
    path: /api/status
    port: 5601
  initialDelaySeconds: 120  # Increased from 60
  periodSeconds: 20
  timeoutSeconds: 10
  failureThreshold: 5       # Added (allows 5 failures before restart)

readinessProbe:
  httpGet:
    path: /api/status
    port: 5601
  initialDelaySeconds: 60   # Increased from 30
  periodSeconds: 10
  timeoutSeconds: 10
  failureThreshold: 5       # Added
```

**Key Probe Parameters:**
- **initialDelaySeconds**: Wait before first probe (gives app time to start)
- **periodSeconds**: How often to check
- **timeoutSeconds**: How long to wait for response
- **failureThreshold**: How many failures before action (restart/unready)

**Deployment:**
```bash
kubectl apply -f k8s/observability/kibana.yaml
kubectl wait --for=condition=ready pod -l app=kibana -n observability --timeout=180s
```

**Result:** ✅ Kibana started successfully and is accessible at http://kibana.quizhub.local

**What we learned:**
- Health probes should account for actual startup time
- `failureThreshold` provides more tolerance for slow startups
- Liveness probes can kill pods if too aggressive
- Elasticsearch must be fully ready before Kibana can start

---

### Step 19: Fix Jaeger Service Selectors (2025-11-12)

**Problem:** Jaeger UI accessible but returning HTTP 503 "Service Unavailable"

**Investigation:**
```bash
kubectl get svc -n observability | grep jaeger
# jaeger-agent        ClusterIP   10.96.47.129   <none>        5775/UDP,6831/UDP,6832/UDP,5778/TCP   8d
# jaeger-collector    ClusterIP   10.96.73.229   <none>        14267/TCP,14268/TCP,14250/TCP,9411/TCP   8d
# jaeger-query        ClusterIP   10.96.241.224  <none>        16686/TCP   8d

kubectl get endpoints jaeger-query -n observability
# NAME           ENDPOINTS   AGE
# jaeger-query   <none>      8d
```

**Root Cause:** Service selectors didn't match pod labels
- Services had selectors: `component: query`, `component: collector`, `component: agent`
- Pod had labels: `component: all-in-one`

**Solution:** Update all three service selectors to match all-in-one pod

**File Modified:** `k8s/observability/jaeger.yaml`

**Changes Made:**
```yaml
# Before (for all three services):
selector:
  app: jaeger
  component: query  # or collector, or agent

# After:
selector:
  app: jaeger
  component: all-in-one
```

**Deployment:**
```bash
kubectl apply -f k8s/observability/jaeger.yaml
kubectl get endpoints -n observability | grep jaeger

# Verify endpoints are now populated:
# jaeger-query        10.244.0.23:16686   8d
# jaeger-collector    10.244.0.23:14267,10.244.0.23:14268,10.244.0.23:14250,10.244.0.23:9411   8d
# jaeger-agent        10.244.0.23:5775,10.244.0.23:6831,10.244.0.23:6832,10.244.0.23:5778   8d
```

**Verification:**
```bash
curl -I http://jaeger.quizhub.local
# HTTP/1.1 200 OK
```

**Result:** ✅ Jaeger UI fully functional at http://jaeger.quizhub.local

**What we learned:**
- Kubernetes Services use label selectors to find pods
- Selector mismatch results in no endpoints (503 errors)
- `kubectl get endpoints` is critical for debugging service issues
- All-in-one deployments need consistent labeling across all services

---

### Step 20: Test Service Endpoints and Verify Metrics (2025-11-12)

**Objective:** Verify QuizHub services are running and Prometheus is collecting metrics

**Commands:**
```bash
# Check service status
kubectl get pods -n quizhub
# NAME                              READY   STATUS    RESTARTS   AGE
# gateway-57df8f7f68-b2r9z          1/1     Running   0          8d
# gateway-57df8f7f68-nlbw7          1/1     Running   0          8d
# quiz-service-86467d6997-jg6tk     1/1     Running   0          8d
# quiz-service-86467d6997-x9dq4     1/1     Running   0          8d
# result-service-59d9f84574-6xphw   1/1     Running   0          8d
# result-service-59d9f84574-x8hhr   1/1     Running   0          8d
# user-service-695686f45-j6s2g      1/1     Running   0          8d
# user-service-695686f45-mwx87      1/1     Running   0          8d

# Test metrics endpoint
kubectl exec -n quizhub deployment/gateway -- curl -s http://localhost:80/metrics | head -20
```

**Metrics Output:**
```
# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 1094.42 1731431917259

# HELP process_private_memory_bytes Process private memory size
# TYPE process_private_memory_bytes gauge
process_private_memory_bytes 142192640 1731431917259
```

**Prometheus Verification:**
```bash
# Access Prometheus targets
open http://prometheus.quizhub.local/targets

# Verified all 6 service replicas being scraped:
# - gateway (2 replicas)
# - user-service (2 replicas)
# - quiz-service (2 replicas)
# - result-service (2 replicas)
```

**Service Discovery Configuration:**
Services expose metrics via annotations:
```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "80"
    prometheus.io/path: "/metrics"
```

**Result:** ✅ All services responding with Prometheus metrics, collection working

**What we learned:**
- .NET services automatically expose `/metrics` endpoint
- Prometheus uses Kubernetes service discovery to find targets
- Annotations control which services get scraped
- Each pod replica appears as separate target

---

### Step 21: Fix Filebeat Log Collection - Elasticsearch Compatibility (2025-11-12)

**Problem:** No logs appearing in Kibana despite Filebeat running

**Investigation:**
```bash
kubectl logs -n observability daemonset/filebeat --tail=50
# Error: "no matching index template found for data stream [quizhub]"
```

**Root Cause:** Filebeat 8.x uses data streams by default, incompatible with our dynamic index routing pattern `quizhub-%{[service.name]}-%{+yyyy.MM.dd}`

**Attempted Solutions:**

**Attempt 1:** Disable ILM in output config
```yaml
output.elasticsearch:
  ilm.enabled: false
```
Result: ❌ Still tried to create data streams

**Attempt 2:** Add global ILM disable
```yaml
setup.ilm.enabled: false
```
Result: ❌ Still failing

**Attempt 3:** Allow older versions flag
```yaml
output.elasticsearch:
  allow_older_versions: true
```
Result: ❌ Still tried data stream creation

**Final Solution:** Downgrade to Filebeat 7.17.15 (last version before data streams became default)

**File Modified:** `k8s/observability/filebeat.yaml`

**Changes Made:**
```yaml
containers:
- name: filebeat
  image: docker.elastic.co/beats/filebeat:7.17.15  # Changed from 8.11.0

# Configuration changes:
output.elasticsearch:
  hosts: ["http://elasticsearch.observability.svc.cluster.local:9200"]
  index: "quizhub-%{[service.name]}-%{+yyyy.MM.dd}"
  allow_older_versions: true

setup.ilm.enabled: false
setup.template.json.enabled: false

setup.template.name: "quizhub"
setup.template.pattern: "quizhub-*"
setup.template.enabled: true
setup.template.overwrite: true
```

**Deployment:**
```bash
kubectl apply -f k8s/observability/filebeat.yaml
kubectl rollout restart daemonset/filebeat -n observability
kubectl rollout status daemonset/filebeat -n observability --timeout=60s
```

**Verification:**
```bash
# Wait for log collection
sleep 15

# Check indices
kubectl exec -n observability elasticsearch-0 -- curl -s 'http://localhost:9200/_cat/indices/quizhub-*?v'
# health status index                          pri rep docs.count
# green  open   quizhub-unknown-2025.11.12     1   0        798
```

**Result:** ✅ Filebeat collecting logs (798 documents), but all going to "unknown" index

**What we learned:**
- Filebeat 8.x breaking change: data streams by default
- Data streams incompatible with dynamic index routing
- Version compatibility critical in observability stacks
- Filebeat 7.x still supported and stable

---

### Step 22: Fix Service Name Extraction from Logs (2025-11-12)

**Problem:** All logs going to `quizhub-unknown-2025.11.12` instead of per-service indices

**Investigation:**
```bash
# Check actual log document structure
kubectl exec -n observability elasticsearch-0 -- curl -s 'http://localhost:9200/quizhub-unknown-2025.11.12/_search?size=1&pretty'
```

**Sample Log Document:**
```json
{
  "@timestamp": "2025-11-12T17:34:08.342Z",
  "message": "[2025-11-12 17:34:08.199 +00:00] [ERR] [UserService] [Microsoft.EntityFrameworkCore.Database.Command] Failed executing DbCommand",
  "service": {
    "name": "unknown"
  },
  "error": {
    "message": "parsing input as JSON: invalid character '-' after array element"
  }
}
```

**Root Cause:**
- Services log in plain text format: `[timestamp] [level] [ServiceName] [message]`
- NOT structured JSON with `Properties.ServiceName`
- Filebeat's `decode_json_fields` processor failing
- JavaScript processor looking for `json.Properties.ServiceName` field that doesn't exist

**Solution:** Update JavaScript processor to parse service name from plain text log format using regex

**File Modified:** `k8s/observability/filebeat.yaml`

**Old Processor Logic:**
```yaml
- decode_json_fields:
    fields: ["message"]
    target: "json"
- script:
    source: >
      function process(event) {
        // Tried to extract from json.Properties.ServiceName
        if (event.Get("json.Properties.ServiceName")) {
          serviceName = event.Get("json.Properties.ServiceName").toLowerCase();
        }
      }
```

**New Processor Logic:**
```yaml
- script:
    lang: javascript
    source: >
      function process(event) {
        var serviceName = "unknown";
        var message = event.Get("message");

        // Extract from log format: [timestamp] [level] [ServiceName] [...]
        if (message) {
          // Format 1: [timestamp] [level] [ServiceName] [context] message
          var match = message.match(/\[(?:INF|ERR|WRN|DBG|FTL|TRC)\]\s+\[([^\]]+)\]/);
          if (match && match[1]) {
            serviceName = match[1].toLowerCase();
          }
          // Format 2: [SERVICE NAME] message (for simpler logs)
          else {
            match = message.match(/^\[([^\]]+)\]/);
            if (match && match[1]) {
              var name = match[1].toLowerCase();
              if (name.includes("user service")) serviceName = "userservice";
              else if (name.includes("gateway")) serviceName = "gateway";
              else if (name.includes("quiz service")) serviceName = "quizservice";
              else if (name.includes("result service")) serviceName = "resultservice";
            }
          }
        }

        // Fallback: extract from container name
        if (serviceName === "unknown" && event.Get("kubernetes.container.name")) {
          var containerName = event.Get("kubernetes.container.name");
          if (containerName.includes("gateway")) serviceName = "gateway";
          else if (containerName.includes("user-service")) serviceName = "userservice";
          else if (containerName.includes("quiz-service")) serviceName = "quizservice";
          else if (containerName.includes("result-service")) serviceName = "resultservice";
        }

        event.Put("service.name", serviceName);
        event.Put("service.environment", "production");
        event.Put("application", "QuizHub");
      }
```

**How the Regex Works:**

**Pattern 1:** `\[(?:INF|ERR|WRN|DBG|FTL|TRC)\]\s+\[([^\]]+)\]`
- Matches: `[2025-11-12 17:34:08.199 +00:00] [ERR] [UserService] [Context]`
- Captures: `UserService`
- Non-capturing group `(?:...)` for log levels
- `\s+` matches whitespace
- `([^\]]+)` captures service name (everything until `]`)

**Pattern 2:** `^\[([^\]]+)\]`
- Matches: `[USER SERVICE] message`
- Captures: `USER SERVICE`
- Then maps to normalized name: "userservice"

**Three-Tier Fallback Strategy:**
1. Try regex Pattern 1 (most services)
2. Try regex Pattern 2 (simpler format)
3. Parse container name from Kubernetes metadata

**Deployment:**
```bash
kubectl apply -f k8s/observability/filebeat.yaml
kubectl rollout restart daemonset/filebeat -n observability
kubectl rollout status daemonset/filebeat -n observability --timeout=60s

# Wait for new logs
sleep 15

# Check indices
kubectl exec -n observability elasticsearch-0 -- curl -s 'http://localhost:9200/_cat/indices/quizhub-*?v&s=index'
```

**Expected Result:** Service-specific indices created:
```
health status index                          pri rep docs.count
green  open   quizhub-gateway-2025.11.12     1   0        XXX
green  open   quizhub-userservice-2025.11.12 1   0        XXX
green  open   quizhub-quizservice-2025.11.12 1   0        XXX
green  open   quizhub-resultservice-2025.11.12 1 0        XXX
```

**What we learned:**
- Log format analysis is critical before processing
- Regex extraction more reliable than JSON parsing for plain text logs
- Multiple fallback strategies improve reliability
- Container name metadata provides valuable backup for service identification

---

## Phase 3 Summary: Deployment & Troubleshooting Achievements

### Problems Solved:
✅ **Grafana Crash Loop**
- Cause: Jaeger dependency without graceful fallback
- Solution: Disabled tracing in Grafana config
- Lesson: Service dependencies need fault tolerance

✅ **Kibana Crash Loop**
- Cause: Health probes too aggressive for startup time
- Solution: Increased timeouts and failure thresholds
- Lesson: Health probe tuning is environment-specific

✅ **Jaeger Service Discovery**
- Cause: Service selector mismatch with pod labels
- Solution: Updated selectors to `component: all-in-one`
- Lesson: Label consistency critical for service routing

✅ **Filebeat Version Compatibility**
- Cause: Filebeat 8.x data streams incompatible with dynamic indices
- Solution: Downgraded to Filebeat 7.17.15
- Lesson: Major version upgrades need compatibility testing

✅ **Log Service Name Extraction**
- Cause: Expected JSON logs, got plain text format
- Solution: Regex-based extraction from log message
- Lesson: Validate log format before configuring processors

### Working Stack Components:
- ✅ Elasticsearch (log storage)
- ✅ Kibana (log UI)
- ✅ Filebeat 7.17.15 (log collection)
- ✅ Prometheus (metrics collection from 6 service replicas)
- ✅ Grafana (metrics UI)
- ✅ Jaeger (tracing UI)
- ✅ 3 SQL Server databases
- ✅ 4 microservices (Gateway, UserService, QuizService, ResultService)

### Troubleshooting Techniques Used:
1. **Pod logs:** `kubectl logs -n <namespace> <pod-name>`
2. **Events:** `kubectl get events -n <namespace>`
3. **Endpoints:** `kubectl get endpoints -n <namespace>` (service discovery debugging)
4. **Port forwarding:** `kubectl port-forward -n <namespace> <pod> <port>`
5. **Exec into pod:** `kubectl exec -n <namespace> <pod> -- <command>`
6. **Rollout status:** `kubectl rollout status deployment/<name>`
7. **Direct Elasticsearch queries:** Via `kubectl exec` into Elasticsearch pod

### Key Configuration Files Modified:
1. `k8s/observability/grafana.yaml` - Disabled tracing
2. `k8s/observability/kibana.yaml` - Increased health probe timeouts
3. `k8s/observability/jaeger.yaml` - Fixed service selectors
4. `k8s/observability/filebeat.yaml` - Downgraded version, fixed log parsing

### Next Steps:
- [ ] Verify logs routing to service-specific indices after regex fix
- [ ] Create Kibana index patterns for each service
- [ ] Build Grafana dashboards for service metrics
- [ ] Test end-to-end observability with load generation
- [ ] Document all access URLs and credentials for thesis

---

*This log will be updated as implementation progresses.*
