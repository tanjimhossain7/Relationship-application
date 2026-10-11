export type Person = 'tanzim' | 'azrina'

export const PEOPLE: Person[] = ['tanzim', 'azrina']

export const NAMES: Record<Person, string> = {
  tanzim: 'Tanzim',
  azrina: 'Azrina',
}

export const other = (p: Person): Person => (p === 'tanzim' ? 'azrina' : 'tanzim')

export const STARTED_DATING = '2024-04-22'
