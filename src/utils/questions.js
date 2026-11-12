export const STATUS_CODE = { mastered: 1, fuzzy: 2, unknown: 3 }
export const STATUS_LABEL = { 1: 'mastered', 2: 'fuzzy', 3: 'unknown' }
export const DIFF_LABEL = { 1: '简单', 2: '中等', 3: '困难' }

export function decorateQuestion(q, groups) {
  const group = groups.find(g => g.id === q.lang)
  const categoryId = q.lang + '/' + q.category
  return { id: q.id, track: q.lang, trackName: group?.name || q.lang,
    categoryId, categoryName: group?.categories.find(c => c.id === categoryId)?.name || q.category,
    title: q.title, difficulty: DIFF_LABEL[q.difficulty] || '中等', difficultyCode: q.difficulty,
    tags: q.tags || [], favorite: !!q.favorite, lastStatus: STATUS_LABEL[q.last_status] || null,
    inWrongBook: !!q.in_wrong_book }
}
export function siblings(questions, q) {
  const list = q ? questions.filter(x => x.categoryId === q.categoryId) : []
  const i = list.findIndex(x => x.id === q?.id)
  return { index: i < 0 ? 0 : i + 1, total: list.length, prev: list[i - 1] || null, next: i < 0 ? null : list[i + 1] || null }
}
export function nextSection(groups, questions, q) {
  if (!q) return null
  const sections = groups.flatMap(g => g.categories.map(c => ({ ...c, trackName: g.name, track: g.id })))
  const index = sections.findIndex(c => c.id === q.categoryId)
  if (index < 0) return null
  for (let i = index + 1; i < sections.length; i++) {
    const first = questions.find(x => x.categoryId === sections[i].id)
    if (first) return { ...sections[i], categoryId: sections[i].id, firstId: first.id }
  }
  return null
}
export function resumeTarget(questions, lastQuestionId, track = 'all') {
  const pool = questions.filter(q => track === 'all' || q.track === track)
  const last = pool.find(q => q.id === lastQuestionId)
  if (last) return { q: last, resume: true }
  return { q: pool.find(q => q.lastStatus !== 'mastered') || pool[0] || null,
    resume: pool.some(q => !!q.lastStatus) }
}
