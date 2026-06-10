#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="sandhost"
NAMESPACE="sandhost"
CONTEXT="kind-${CLUSTER_NAME}"

if ! command -v kind >/dev/null 2>&1; then
	echo "error: kind is not installed. See https://kind.sigs.k8s.io/docs/user/quick-start/#installation" >&2
	exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
	echo "error: kubectl is not installed. See https://kubernetes.io/docs/tasks/tools/" >&2
	exit 1
fi

if ! kind get clusters 2>/dev/null | grep -qx "${CLUSTER_NAME}"; then
	kind create cluster --name "${CLUSTER_NAME}"
else
	echo "kind cluster '${CLUSTER_NAME}' already exists"
fi

kubectl --context "${CONTEXT}" create namespace "${NAMESPACE}" \
	--dry-run=client -o yaml | kubectl --context "${CONTEXT}" apply -f -

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
docker build -t sandhost-agent:dev "${REPO_ROOT}/images/agent"
kind load docker-image sandhost-agent:dev --name "${CLUSTER_NAME}"

echo "Cluster ready: context '${CONTEXT}', namespace '${NAMESPACE}', agent image 'sandhost-agent:dev' loaded"
