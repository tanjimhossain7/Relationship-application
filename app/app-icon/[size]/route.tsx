import { iconResponse } from '@/lib/icon'

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params
  const n = Math.min(1024, Math.max(32, Number(size) || 512))
  return iconResponse(n)
}
