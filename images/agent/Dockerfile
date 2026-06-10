FROM alpine:3.22

COPY agent.sh /usr/local/bin/agent.sh
RUN chmod +x /usr/local/bin/agent.sh

# Matches the runAsUser/runAsGroup the API sets in the pod securityContext.
USER 65534:65534
ENTRYPOINT ["/bin/sh", "/usr/local/bin/agent.sh"]
