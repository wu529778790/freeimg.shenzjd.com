'use client'

import { WxAuth } from 'wx-auth-sdk'

/**
 * wx-auth 登录态共享单例(仅客户端):
 * WxAuth.init 只在 Navbar 里调一次(全站唯一),登录成功后通过监听器广播用户态,
 * 页面组件(如混元工作台)订阅获取登录状态;弹登录窗统一走 ensureWxLogin()。
 */

export interface WxUserState {
  openid: string
  nickname?: string | null
  headimgurl?: string | null
  isAdmin?: boolean
}

// wx-auth 登录中心后端(头像/设置面板/userinfo 都走它)
export const WX_AUTH_API_BASE = 'https://wx-auth.shenzjd.com'

let initialized = false
const listeners = new Set<(u: WxUserState | null) => void>()

function toUserState(u: Record<string, unknown>): WxUserState | null {
  const openid = String(u.openid || u.mpOpenid || '')
  if (!openid) return null
  return {
    openid,
    nickname: (u.nickname as string | null) ?? null,
    headimgurl: (u.headimgurl as string | null) ?? null,
    isAdmin: u.isAdmin === true
  }
}

function notify(u: WxUserState | null) {
  for (const fn of listeners) fn(u)
}

export function initWxAuth() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  WxAuth.init({
    silent: true,
    required: false,
    onVerified: (u: Record<string, unknown>) => notify(toUserState(u)),
    onError: (e: unknown) => console.warn('wx-auth 异常:', e)
  })
}

export function subscribeWxUser(fn: (u: WxUserState | null) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** 确保已登录:未登录弹出微信登录窗(小程序扫码/公众号验证码),返回是否登录成功 */
export async function ensureWxLogin(): Promise<boolean> {
  return WxAuth.requireAuth()
}
