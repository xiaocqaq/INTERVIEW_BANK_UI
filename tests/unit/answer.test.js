import { describe, expect, it } from 'vitest'
import { htmlToCodeText, splitAnswerHtml } from '../../src/utils/answer'
describe('rendered Markdown boundaries', () => {
 it('keeps four sections, tables, lists, and code highlighting', () => {
   const p = splitAnswerHtml('<h2>核心答案</h2><p>核心</p><h2>深入解析</h2><table><tr><td>表</td></tr></table><h2>常见追问</h2><ul><li>追问</li></ul><h2>代码示例</h2><div class="codehilite"><pre><code><span class="k">return</span> 1</code></pre></div>')
   expect(p.core).toContain('核心'); expect(p.analysis).toContain('answer-table-wrap'); expect(p.followups).toContain('<li>追问</li>'); expect(p.code).toContain('class="k"')
 })
 it('removes script/event/javascript URL injection without losing answer text', () => {
   const p = splitAnswerHtml('<h2>核心答案</h2><p onclick="alert(1)">safe</p><script>alert(1)</script><a href="javascript:alert(1)">link</a><img src="x" onerror="alert(1)">')
   expect(p.core).toContain('safe'); expect(p.core).not.toMatch(/onclick|onerror|javascript:|<script/)
 })
 it('copies only code rather than explanations or headings', () => { expect(htmlToCodeText('<h3>示例</h3><p>说明</p><pre><code>print(&quot;ok&quot;)\n</code></pre>')).toBe('print("ok")\n') })
})
