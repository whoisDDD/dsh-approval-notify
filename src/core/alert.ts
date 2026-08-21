export interface AlertParts {
  title: string
  body: string
}

export function alertPartsOf(message: string): AlertParts {
  const [title, body] = message.split('：', 2)
  return {
    title: title === undefined || title.length === 0 ? 'DSH 提示' : title,
    body: body === undefined || body.length === 0 ? message : body,
  }
}

export function deliverAlert(
  message: string,
  notify: (title: string, body: string) => boolean,
  toast: (title: string, body: string) => void,
): void {
  const parts = alertPartsOf(message)
  if (!notify(parts.title, parts.body)) toast(parts.title, parts.body)
}
