class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

class CommandError extends Error {
    constructor(message, code = 'COMMAND_ERROR') {
        super(message);
        this.name = 'CommandError';
        this.code = code;
    }
}

class AuthenticationError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.name = 'AuthenticationError';
    }
}

class AuthorizationError extends Error {
    constructor(message = 'Permission denied') {
        super(message);
        this.name = 'AuthorizationError';
    }
}

class RateLimitError extends Error {
    constructor(retryAfter = 60) {
        super(`Rate limited. Retry after ${retryAfter}s`);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}

class NotFoundError extends Error {
    constructor(resource = 'Resource') {
        super(`${resource} not found`);
        this.name = 'NotFoundError';
    }
}

module.exports = {
    ValidationError,
    CommandError,
    AuthenticationError,
    AuthorizationError,
    RateLimitError,
    NotFoundError
};
