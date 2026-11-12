/** Same-origin API client; credentials stay in the browser, never in source. */
export function createApiClient({ getToken, onUnauthorized }) {
  return async function request(path, { method = 'GET', body, signal } = {}) {
    const headers = { 'Content-Type': 'application/json' }
    const token = getToken()
    if (token) headers.Authorization = 'Bearer ' + token
    let response
    try {
      response = await fetch('/api' + path, { method, headers, signal,
        body: body === undefined ? undefined : JSON.stringify(body) })
    } catch (cause) {
      if (cause.name === 'AbortError') throw cause
      throw Object.assign(new Error('网络异常，请稍后重试'), { status: 0, cause })
    }
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      if (response.status === 401 && token && token === getToken()) onUnauthorized()
      const message = data?.detail || data?.error || '请求失败 ' + response.status
      throw Object.assign(new Error(typeof message === 'string' ? message : JSON.stringify(message)), { status: response.status })
    }
    return data
  }
}
