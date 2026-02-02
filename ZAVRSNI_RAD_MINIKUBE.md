# Додатак: Локални развој са Minikube

## А.1. Увод у Minikube

Minikube је алат који омогућава покретање једночворног Kubernetes кластера на локалној машини. Развијен је као део Kubernetes екосистема са циљем да олакша развој, тестирање и учење Kubernetes технологија без потребе за приступом удаљеној инфраструктури или облаку [28].

За разлику од продукционих Kubernetes дистрибуција попут Azure Kubernetes Service-а или Google Kubernetes Engine-а, Minikube је оптимизован за локални развој и пружа следеће предности:

- **Брзо постављање** — Кластер се покреће за неколико минута без сложене конфигурације
- **Минимални ресурсни захтеви** — Довољно је 2 CPU језгра и 4GB RAM меморије
- **Интеграција са Docker-ом** — Користи Docker као извршно окружење контејнера
- **Уграђени додаци** — Једноставно омогућавање функционалности попут Ingress контролера и Metrics Server-а
- **Подршка за више платформи** — Доступан за Windows, Linux и macOS оперативне системе

## А.2. Инсталација и конфигурација

### А.2.1. Предуслови

За покретање Minikube кластера неопходно је инсталирати следеће алате:

1. **Docker Desktop** — Извршно окружење за контејнере
2. **Minikube** — Алат за управљање локалним кластером
3. **kubectl** — Командолинијски алат за интеракцију са Kubernetes API-јем

На Windows оперативном систему инсталација се врши путем Chocolatey менаџера пакета:

```powershell
choco install docker-desktop
choco install minikube
choco install kubernetes-cli
```

### А.2.2. Покретање кластера

Minikube кластер се покреће следећом командом која дефинише ресурсе доступне кластеру:

```bash
minikube start --cpus=4 --memory=6144 --disk-size=30g --driver=docker
```

Параметри команде:
- `--cpus=4` — Број CPU језгара додељених кластеру
- `--memory=6144` — Количина RAM меморије у мегабајтима (6 GB)
- `--disk-size=30g` — Величина виртуелног диска
- `--driver=docker` — Коришћење Docker-а као драјвера за виртуелизацију

Након покретања кластера, омогућавају се неопходни додаци:

```bash
minikube addons enable ingress
minikube addons enable metrics-server
```

Ingress додатак омогућава рутирање HTTP саобраћаја ка сервисима унутар кластера, док Metrics Server прикупља метрике о искоришћености ресурса потребне за хоризонтално аутоматско скалирање [43].

## А.3. Грађење Docker слика за Minikube

### А.3.1. Конфигурација Docker окружења

Једна од кључних разлика при раду са Minikube у односу на облачна окружења јесте начин грађења Docker слика. Уместо гурања слика у удаљени регистар (попут Azure Container Registry-ја), слике се граде директно унутар Minikube Docker daemon-а.

Конфигурација Docker клијента да користи Minikube daemon:

```powershell
# PowerShell
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

# Bash
eval $(minikube docker-env)
```

Након ове конфигурације, све `docker build` команде креирају слике које су одмах доступне унутар Minikube кластера.

### А.3.2. Грађење слика микросервиса

Слике QuizHub микросервиса граде се следећим командама:

```bash
docker build -t quizhub/gateway:latest Services/Gateway/Gateway.Api/
docker build -t quizhub/user-service:latest Services/UserService/UserService.Api/
docker build -t quizhub/quiz-service:latest Services/QuizService/QuizService.Api/
docker build -t quizhub/result-service:latest Services/ResultService/ResultService.Api/
docker build -t quizhub/frontend:latest frontend/
```

### А.3.3. Подешавање imagePullPolicy

Kubernetes манифести за Deployment ресурсе захтевају измену `imagePullPolicy` поља. За локални развој са Minikube користи се вредност `Never` која спречава Kubernetes да покушава преузимање слике из удаљеног регистра:

```yaml
spec:
  containers:
  - name: gateway
    # Azure ACR: quizhubacr2024pr40.azurecr.io/quizhub-gateway:latest
    image: quizhub/gateway:latest
    imagePullPolicy: Never
```

Оригинална ACR путања чува се као коментар ради лакшег пребацивања на продукциону конфигурацију.

## А.4. Постављање апликације

### А.4.1. Креирање именских простора

Kubernetes ресурси организују се у три именска простора:

```bash
kubectl create namespace quizhub       # Микросервиси
kubectl create namespace observability # Алати за посматрање
kubectl create namespace databases     # Базе података
```

### А.4.2. Редослед постављања

Компоненте се постављају у следећем редоследу ради задовољавања зависности:

1. **Базе података** — SQL Server инстанце за сваки сервис
2. **Микросервиси** — Gateway, UserService, QuizService, ResultService
3. **Frontend** — React апликација
4. **Стек за посматрање** — Elasticsearch, Kibana, Filebeat, Prometheus, Grafana, Jaeger

```bash
# Базе података
kubectl apply -f k8s/databases/

# Микросервиси
kubectl apply -f k8s/services/gateway/
kubectl apply -f k8s/services/user-service/
kubectl apply -f k8s/services/quiz-service/
kubectl apply -f k8s/services/result-service/
kubectl apply -f k8s/frontend/

# Стек за посматрање
kubectl apply -f k8s/observability/
```

## А.5. Приступ сервисима

### А.5.1. Port Forwarding

Најједноставнији начин приступа сервисима унутар Minikube кластера јесте преусмеравање портова (енгл. *port forwarding*):

```bash
# QuizHub API Gateway
kubectl port-forward -n quizhub svc/gateway 8080:80

# Grafana (метрике)
kubectl port-forward -n observability svc/grafana 3000:3000

# Kibana (логови)
kubectl port-forward -n observability svc/kibana 5601:5601

# Jaeger (трагови)
kubectl port-forward -n observability svc/jaeger-query 16686:16686

# Prometheus
kubectl port-forward -n observability svc/prometheus 9090:9090
```

Након покретања ових команди, сервиси су доступни на следећим адресама:

| Сервис | URL | Акредитиви |
|--------|-----|------------|
| QuizHub API | http://localhost:8080 | — |
| Grafana | http://localhost:3000 | admin/admin |
| Kibana | http://localhost:5601 | — |
| Jaeger | http://localhost:16686 | — |
| Prometheus | http://localhost:9090 | — |

### А.5.2. Minikube Tunnel

Алтернативни приступ користи `minikube tunnel` команду која омогућава приступ LoadBalancer типу сервиса:

```bash
minikube tunnel
```

Ова команда захтева администраторске привилегије и креира мрежни тунел између хост машине и Minikube кластера.

### А.5.3. Конфигурација hosts фајла

За приступ путем Ingress ресурса, неопходно је додати следећи унос у hosts фајл (`C:\Windows\System32\drivers\etc\hosts` на Windows-у):

```
127.0.0.1 quizhub.local grafana.quizhub.local kibana.quizhub.local jaeger.quizhub.local
```

## А.6. Корисне команде

### А.6.1. Праћење стања кластера

```bash
# Преглед свих подова
kubectl get pods --all-namespaces

# Детаљан преглед пода
kubectl describe pod <pod-name> -n <namespace>

# Преглед логова
kubectl logs -f deployment/gateway -n quizhub

# Праћење ресурса
kubectl top pods -n quizhub
```

### А.6.2. Управљање кластером

```bash
# Заустављање кластера
minikube stop

# Покретање кластера
minikube start

# Брисање кластера
minikube delete

# Преглед статуса
minikube status
```

### А.6.3. Дијагностика проблема

```bash
# Преглед догађаја у именском простору
kubectl get events -n quizhub --sort-by='.lastTimestamp'

# Провера сервиса
kubectl get svc --all-namespaces

# Тестирање мрежне повезаности
kubectl run curl-test --image=curlimages/curl --rm -i --restart=Never -- \
  curl -s http://gateway.quizhub.svc.cluster.local/health
```

## А.7. Разлике између локалног и продукционог окружења

Табела А.1 сумира кључне разлике између Minikube локалног развојног окружења и Azure Kubernetes Service продукционог окружења.

**Табела А.1: Поређење Minikube и AKS окружења**

| Аспект | Minikube | Azure Kubernetes Service |
|--------|----------|--------------------------|
| Број чворова | 1 | 2+ |
| Скалабилност | Ограничена | Хоризонтална |
| Регистар слика | Локални Docker daemon | Azure Container Registry |
| imagePullPolicy | Never | Always |
| Приступ сервисима | Port forwarding / tunnel | Load Balancer / Ingress |
| Трошкови | Бесплатно | По потрошњи ресурса |
| Перзистентност | Привремена | Трајна (Azure Disks) |
| Мрежна безбедност | Минимална | Network Policies, NSG |

## А.8. Закључак

Minikube представља незаменљив алат у развојном циклусу Kubernetes апликација. Омогућава развојним тимовима да тестирају Kubernetes манифесте, конфигурације и целокупну архитектуру система локално, пре постављања на продукциону инфраструктуру.

Примена Minikube-а у развоју QuizHub платформе омогућила је:

1. **Брже итерације** — Промене се тестирају локално без чекања на CI/CD процесе
2. **Уштеду трошкова** — Развој и тестирање без потрошње облачних ресурса
3. **Офлајн развој** — Могућност рада без интернет конекције
4. **Репродуцибилност** — Идентично окружење за све чланове тима

Комбинација локалног развоја са Minikube и продукционог постављања на AKS представља оптималан приступ за развој микросервисних апликација базираних на Kubernetes платформи.

---

*[Крај Додатка А]*
