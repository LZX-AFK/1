/// <reference types="@dcloudio/types" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*.scss' {
  const content: Record<string, string>
  export default content
}

declare module '*.json' {
  const value: Record<string, unknown>
  export default value
}
