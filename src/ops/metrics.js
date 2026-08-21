const metrics = {
    startedAt: new Date().toISOString(),
    requests: 0,
    successes: 0,
    failures: 0,
    transientFailures: 0,
    fallbackAttempts: 0,
    lastError: null,
    lastSuccessAt: null
};

function recordRequest() {
    metrics.requests += 1;
}

function recordSuccess(model, operation) {
    metrics.successes += 1;
    metrics.lastSuccessAt = new Date().toISOString();
    metrics.lastModel = String(model || 'unknown');
    metrics.lastOperation = String(operation || 'unknown');
}

function recordFailure(operation, model, status, transient = false) {
    metrics.failures += 1;
    if (transient) metrics.transientFailures += 1;
    metrics.lastError = { operation: String(operation || 'unknown'), model: String(model || 'unknown'), status: Number(status) || null, transient: Boolean(transient), at: new Date().toISOString() };
}

function recordFallback() {
    metrics.fallbackAttempts += 1;
}

function healthMetrics() {
    return {
        startedAt: metrics.startedAt,
        uptimeSeconds: Math.round(process.uptime()),
        requests: metrics.requests,
        successes: metrics.successes,
        failures: metrics.failures,
        transientFailures: metrics.transientFailures,
        fallbackAttempts: metrics.fallbackAttempts,
        successRate: metrics.requests ? Math.round((metrics.successes / metrics.requests) * 100) / 100 : 1,
        lastSuccessAt: metrics.lastSuccessAt || null,
        lastError: metrics.lastError || null
    };
}

module.exports = { recordRequest, recordSuccess, recordFailure, recordFallback, healthMetrics };
