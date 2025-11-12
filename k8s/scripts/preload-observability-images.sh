#!/bin/bash
set -euo pipefail

images=(
  "docker.elastic.co/elasticsearch/elasticsearch:8.11.0"
  "docker.elastic.co/kibana/kibana:8.11.0"
  "docker.elastic.co/beats/filebeat:8.11.0"
  "grafana/grafana:10.2.2"
  "prom/prometheus:v2.48.0"
  "jaegertracing/all-in-one:1.51"
  "curlimages/curl:latest"
  "mcr.microsoft.com/mssql/server:2022-latest"
)

echo "Preloading observability images into Minikube. This will download images once on the host and import them into the Minikube node."

for img in "${images[@]}"; do
  echo "\n---\nLoading: $img"
  start=$(date +%s)
  minikube image load "$img"
  rc=$?
  end=$(date +%s)
  took=$((end-start))
  if [ $rc -ne 0 ]; then
    echo "Failed to load $img (exit $rc)"
  else
    echo "Loaded $img in ${took}s"
  fi
done

echo "\nAll requested images processed."
