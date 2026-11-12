import { describe, expect, it } from 'vitest'
import { decorateQuestion, nextSection, resumeTarget, siblings } from '../../src/utils/questions'
const groups = [{ id: 'java', name: 'Java 题库', categories: [{ id: 'java/basics', name: 'Java 基础' }, { id: 'java/jvm', name: 'JVM' }] }, { id: 'python', name: 'Python 题库', categories: [{ id: 'python/basics', name: 'Python 基础' }] }]
const questions = [{ id: 1, track: 'java', categoryId: 'java/basics', lastStatus: 'mastered' }, { id: 584, track: 'java', categoryId: 'java/basics' }, { id: 60, track: 'java', categoryId: 'java/jvm' }, { id: 1000, track: 'python', categoryId: 'python/basics' }]
describe('learning navigation', () => {
  it('uses section order rather than sequential numeric IDs', () => { expect(siblings(questions, questions[1])).toMatchObject({ index: 2, total: 2, prev: questions[0], next: null }) })
  it('moves to the next section, across tracks, and stops at final section', () => {
    expect(nextSection(groups, questions, questions[1]).firstId).toBe(60)
    expect(nextSection(groups, questions, questions[2]).firstId).toBe(1000)
    expect(nextSection(groups, questions, questions[3])).toBeNull()
  })
  it('skips empty sections', () => { expect(nextSection(groups, questions.filter(q => q.id !== 60), questions[1]).firstId).toBe(1000) })
  it('resumes an existing last question inside the selected track', () => { expect(resumeTarget(questions, 584, 'java')).toEqual({ q: questions[1], resume: true }) })
  it('falls back safely when last question was removed or belongs to a different track', () => {
    expect(resumeTarget(questions, 9999, 'java').q.id).toBe(584)
    expect(resumeTarget(questions, 584, 'python').q.id).toBe(1000)
    expect(resumeTarget([], 584).q).toBeNull()
  })
  it('maps API statuses without hard-coded category names', () => { expect(decorateQuestion({ id: 1, lang: 'java', category: 'basics', title: 'test', difficulty: 2, last_status: 2 }, groups)).toMatchObject({ categoryName: 'Java 基础', lastStatus: 'fuzzy', difficulty: '中等' }) })
})
