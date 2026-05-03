import type { Poll } from '../types/poll.js';

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

/** Returns a date offset from the current moment by the given milliseconds. */
function relativeDate(offsetMs: number): Date {
  return new Date(Date.now() + offsetMs);
}

/** Seed polls covering active, past, ending-soon, and category variants. */
export const MOCK_POLLS: ReadonlyArray<Poll> = [
  {
    id: 'poll-1',
    title: "Let's Plan the Next Team Event Together",
    description: 'Wir planen unser nächstes Team-Event und sammeln Ideen.',
    category: 'Team activities',
    options: [
      { id: 'opt-1-a', label: 'Bowling', votes: 5 },
      { id: 'opt-1-b', label: 'Escape Room', votes: 8 },
      { id: 'opt-1-c', label: 'Restaurant', votes: 3 },
    ],
    createdAt: relativeDate(-2 * DAY_IN_MS),
    deadline: relativeDate(20 * HOUR_IN_MS),
  },
  {
    id: 'poll-2',
    title: 'Fit & wellness survey!',
    description: 'Welche Wellness-Angebote sollen wir im Office einführen?',
    category: 'Healthy Lifestyle',
    options: [
      { id: 'opt-2-a', label: 'Yoga-Kurs', votes: 12 },
      { id: 'opt-2-b', label: 'Massage-Sessions', votes: 9 },
      { id: 'opt-2-c', label: 'Standing Desks', votes: 14 },
      { id: 'opt-2-d', label: 'Gesunde Snacks', votes: 7 },
    ],
    createdAt: relativeDate(-3 * DAY_IN_MS),
    deadline: relativeDate(2 * DAY_IN_MS - 4 * HOUR_IN_MS),
  },
  {
    id: 'poll-3',
    title: 'Gaming habits and favorite games!',
    description: 'Welche Spiele möchtest du beim nächsten Gaming-Abend zocken?',
    category: 'Gaming',
    options: [
      { id: 'opt-3-a', label: 'Mario Kart', votes: 11 },
      { id: 'opt-3-b', label: 'Among Us', votes: 6 },
      { id: 'opt-3-c', label: 'Jackbox Party Pack', votes: 9 },
    ],
    createdAt: relativeDate(-1 * DAY_IN_MS),
    deadline: relativeDate(2 * DAY_IN_MS + 8 * HOUR_IN_MS),
  },
  {
    id: 'poll-4',
    title: 'Healthier future: Fit & wellness survey!',
    description: 'Eine offene Umfrage ohne festes Enddatum.',
    category: 'Healthy Lifestyle',
    options: [
      { id: 'opt-4-a', label: 'Mehr Pausen', votes: 10 },
      { id: 'opt-4-b', label: 'Walking Meetings', votes: 6 },
      { id: 'opt-4-c', label: 'Mental Health Days', votes: 18 },
    ],
    createdAt: relativeDate(-7 * DAY_IN_MS),
    deadline: null,
  },
  {
    id: 'poll-5',
    title: 'Which framework should we pick for the next project?',
    description: 'We are kicking off a new frontend—vote for your preferred stack.',
    category: 'Team activities',
    options: [
      { id: 'opt-5-a', label: 'React', votes: 7 },
      { id: 'opt-5-b', label: 'Vue', votes: 4 },
      { id: 'opt-5-c', label: 'Svelte', votes: 3 },
      { id: 'opt-5-d', label: 'Angular', votes: 2 },
    ],
    createdAt: relativeDate(-5 * DAY_IN_MS),
    deadline: relativeDate(7 * DAY_IN_MS),
  },
  {
    id: 'poll-7',
    title: 'Which workshop topics should we cover next quarter?',
    description: 'Help prioritise internal training sessions.',
    category: 'Education',
    options: [
      { id: 'opt-7-a', label: 'Accessibility', votes: 9 },
      { id: 'opt-7-b', label: 'Performance', votes: 6 },
      { id: 'opt-7-c', label: 'Design systems', votes: 11 },
    ],
    createdAt: relativeDate(-4 * DAY_IN_MS),
    deadline: relativeDate(10 * DAY_IN_MS),
  },
  {
    id: 'poll-8',
    title: 'Indoor air quality: should we add CO₂ sensors to meeting rooms?',
    description: 'Quick pulse check from facilities and science enthusiasts.',
    category: 'Science',
    options: [
      { id: 'opt-8-a', label: 'Yes, everywhere', votes: 14 },
      { id: 'opt-8-b', label: 'Only large rooms', votes: 8 },
      { id: 'opt-8-c', label: 'Not a priority', votes: 3 },
    ],
    createdAt: relativeDate(-6 * DAY_IN_MS),
    deadline: relativeDate(14 * DAY_IN_MS),
  },
  {
    id: 'poll-9',
    title: 'Where should this month’s remote social hangout live?',
    description: 'Pick a vibe—camera optional.',
    category: 'Social',
    options: [
      { id: 'opt-9-a', label: 'Discord game night', votes: 12 },
      { id: 'opt-9-b', label: 'Coffee roulette calls', votes: 7 },
      { id: 'opt-9-c', label: 'Async photo challenge', votes: 5 },
    ],
    createdAt: relativeDate(-2 * DAY_IN_MS),
    deadline: relativeDate(21 * DAY_IN_MS),
  },
  {
    id: 'poll-6',
    title: 'Pizza für das letzte Sprint-Review',
    description: 'Welche Pizza-Sorten haben wir für das letzte Review bestellt?',
    category: 'Team activities',
    options: [
      { id: 'opt-6-a', label: 'Margherita', votes: 4 },
      { id: 'opt-6-b', label: 'Salami', votes: 9 },
      { id: 'opt-6-c', label: 'Vegetarisch', votes: 6 },
    ],
    createdAt: relativeDate(-30 * DAY_IN_MS),
    deadline: relativeDate(-7 * DAY_IN_MS),
  },
];
