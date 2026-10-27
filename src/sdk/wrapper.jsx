import KFSDK from '@kissflow/lowcode-client-sdk'
import React, { useEffect, useState } from 'react'
import { KissflowSDKContext } from './context.jsx'

let kf

export function SDKWrapper(props) {
  const [kfInstance, setKfInstance] = useState(null)
  const [sdkFailed, setSdkFailed] = useState(false)
  // True once init succeeds OR fails — dashboards must not wait forever on preview.
  const [sdkSettled, setSdkSettled] = useState(false)

  useEffect(() => {
    if (import.meta.env.VITE_GCP_CEO_HOST === '1') {
      setSdkSettled(true)
      if (window.kf?.user) {
        kf = window.kf
        setKfInstance(window.kf)
        return
      }
      // Kissflow sends the signed-in user only after initialize. Do not block paint or show the preview banner.
      KFSDK.initialize()
        .then((sdk) => {
          window.kf = kf = sdk
          setKfInstance(sdk)
        })
        .catch(() => {})
      return
    }
    if (window.kf) {
      kf = window.kf
      setKfInstance(window.kf)
      setSdkSettled(true)
      return
    }

    KFSDK.initialize()
      .then((sdk) => {
        window.kf = kf = sdk
        setKfInstance(sdk)
        setSdkFailed(false)
        setSdkSettled(true)
      })
      .catch((err) => {
        setSdkFailed(true)
        setSdkSettled(true)
        console.warn('SDK not available (preview mode):', err?.message || err)
      })
  }, [])

  return (
    <KissflowSDKContext.Provider value={{ kf: kfInstance, sdkReady: sdkSettled }}>
      <>
        {sdkFailed && (
          <div style={{ padding: '8px 16px', background: '#fef3c7', color: '#92400e', fontSize: 12, textAlign: 'center' }}>
            Preview mode - connect in a Kissflow app for full integration.
          </div>
        )}
        {props.children}
      </>
    </KissflowSDKContext.Provider>
  )
}

export { kf }
