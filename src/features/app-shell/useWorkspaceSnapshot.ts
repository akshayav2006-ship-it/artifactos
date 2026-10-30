import { useState } from 'react'
import { loadLocal } from '../../workspace/local'

export function useWorkspaceSnapshot() {
  return useState(() => {
    try { return { data: loadLocal(), error: '' } }
    catch { return { data: null, error: 'Local workspace storage could not be read. Open the workspace to recover your data.' } }
  })[0]
}

