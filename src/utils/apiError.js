class apiError extends Error {
    constructor(
        statusCode,
        message= "Something went wrong",
        errors= [],
        statck = ""
    ){
        supper(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false;
        this.errors = errors


        if (statck) {
            this.stack = statck
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export { apiError }