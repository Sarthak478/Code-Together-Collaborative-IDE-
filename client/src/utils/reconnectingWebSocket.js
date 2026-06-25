export class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url
    this.options = {
      initialDelay: 1000,
      maxDelay: 30000,
      factor: 2,
      ...options,
    }

    this.delay = this.options.initialDelay
    this.ws = null
    this.forcedClose = false

    // Callbacks
    this.onopen = null
    this.onmessage = null
    this.onclose = null
    this.onerror = null

    this.connect()
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = (event) => {
        this.delay = this.options.initialDelay // reset delay
        if (this.onopen) {
          this.onopen(event)
        }
      }

      this.ws.onmessage = (event) => {
        if (this.onmessage) {
          this.onmessage(event)
        }
      }

      this.ws.onerror = (event) => {
        if (this.onerror) {
          this.onerror(event)
        }
      }

      this.ws.onclose = (event) => {
        if (this.onclose) {
          this.onclose(event)
        }
        if (!this.forcedClose) {
          const nextDelay = this.delay
          this.delay = Math.min(this.delay * this.options.factor, this.options.maxDelay)
          setTimeout(() => {
            if (!this.forcedClose) {
              this.connect()
            }
          }, nextDelay)
        }
      }
    } catch (err) {
      console.error("ReconnectingWebSocket connection error:", err)
      if (!this.forcedClose) {
        const nextDelay = this.delay
        this.delay = Math.min(this.delay * this.options.factor, this.options.maxDelay)
        setTimeout(() => {
          if (!this.forcedClose) {
            this.connect()
          }
        }, nextDelay)
      }
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    } else {
      console.warn("WebSocket is not open. ReadyState:", this.ws ? this.ws.readyState : "null")
    }
  }

  close() {
    this.forcedClose = true
    if (this.ws) {
      this.ws.close()
    }
  }

  get readyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED
  }
}
