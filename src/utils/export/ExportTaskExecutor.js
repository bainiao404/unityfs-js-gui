export class ExportTaskExecutor {
    /**
     * @param {Object} options
     * @param {number} options.maxConcurrency
     */
    constructor(options = {}) {
        this.maxConcurrency = options.maxConcurrency || 4
        this.queue = []
        this.activeCount = 0
        this.results = []
        this.onProgress = null // callback: (completedCount, totalCount)
    }

    /**
     * Add a task to the queue
     * @param {Function} taskFn A function returning a Promise
     */
    addTask(taskFn) {
        this.queue.push(taskFn)
    }

    /**
     * Execute all tasks concurrently with limit
     * @returns {Promise<any[]>}
     */
    async execute() {
        const total = this.queue.length
        if (total === 0) return []

        let completed = 0
        const executing = new Set()
        const results = new Array(total)

        // Queue processing loop
        for (let i = 0; i < total; i++) {
            const taskFn = this.queue[i]

            // Create a promise wrapper that will track execution
            const p = (async (index) => {
                try {
                    results[index] = await taskFn(index)
                } catch (err) {
                    results[index] = { error: err }
                } finally {
                    completed++
                    if (this.onProgress) {
                        this.onProgress(completed, total)
                    }
                }
            })(i)

            executing.add(p)
            const clean = () => executing.delete(p)
            p.then(clean, clean)

            if (executing.size >= this.maxConcurrency) {
                await Promise.race(executing)
            }
        }

        // Wait for all remaining active promises to complete
        if (executing.size > 0) {
            await Promise.all(executing)
        }

        return results
    }
}
