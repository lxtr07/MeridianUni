/**
 * Prepared interview questions. The Interviewer asks them and records the applicant's answers
 * (or a short summary of each answer). There is no scoring: the Interviewer reads the answers,
 * then decides whether to endorse the applicant for approval.
 *
 * Every interview has the same core questions (why the scholarship, financial situation, goals,
 * academics, integrity) plus questions that depend on the type of scholarship applied for.
 */
export interface InterviewQuestion {
  key: string;
  text: string;
}

export interface InterviewSection {
  key: string;
  label: string;
  questions: InterviewQuestion[];
}

export const CORE_SECTIONS: InterviewSection[] = [
  {
    key: 'need',
    label: 'Why you need this scholarship',
    questions: [
      { key: 'why', text: 'Why are you applying for this scholarship, and why do you need it?' },
      { key: 'goals', text: 'What do you plan to do after you graduate, and how will this scholarship help you get there?' },
      { key: 'use', text: 'If you are awarded the grant, how will you use it?' },
    ],
  },
  {
    key: 'finance',
    label: 'Financial capability',
    questions: [
      { key: 'family', text: "Please describe your family's current financial situation. Who supports your studies?" },
      { key: 'paying', text: 'How do you currently pay for tuition and school expenses? Do you work or earn on the side?' },
      { key: 'other_aid', text: 'Are you receiving another scholarship, grant or allowance? Is your household a 4Ps beneficiary?' },
    ],
  },
  {
    key: 'academic',
    label: 'Academic standing',
    questions: [
      { key: 'studies', text: 'How are you doing in your studies? Tell us about a difficult semester and how you handled it.' },
      { key: 'grades', text: 'Do you have any failing, dropped or incomplete (INC) grades? What happened?' },
    ],
  },
  {
    key: 'integrity',
    label: 'Character and integrity',
    questions: [
      { key: 'decision', text: 'Describe a time you faced a hard decision. What did you do and why?' },
      { key: 'discipline', text: 'Do you have any pending or past disciplinary case with the Office of Student Affairs?' },
      { key: 'truthful', text: 'Are all the details and documents in your application true and complete?' },
    ],
  },
];

/** Questions specific to the type of scholarship being applied for. */
const fitSection = (category: string | undefined, title: string): InterviewSection | null => {
  const s = (label: string, questions: InterviewQuestion[]): InterviewSection => ({ key: 'fit', label, questions });
  switch (category) {
    case 'Industry':
      return s(`About this industry grant: ${title}`, [
        { key: 'industry_why', text: `Why did you choose the field this grant supports? What do you know about the industry today (trends, companies, challenges)?` },
        { key: 'industry_work', text: 'Walk us through a project, internship, portfolio or GitHub work that shows your skills in this field.' },
        { key: 'industry_career', text: 'Where do you see yourself in this industry in five years?' },
        { key: 'industry_service', text: "Do you understand and agree to the sponsor's one-year return-service agreement after graduation?" },
      ]);
    case 'Academic':
      return s('About this academic grant', [
        { key: 'academic_proud', text: 'What are you most proud of academically? Did you make the Dean\'s List last semester?' },
        { key: 'academic_plan', text: 'How will you keep your grades at the level this scholarship requires?' },
      ]);
    case 'Financial':
      return s('About this need-based grant', [
        { key: 'need_match', text: 'Does your family\'s situation match the income you declared? Has anything changed recently (job loss, illness, new dependents)?' },
        { key: 'need_gap', text: 'What would you not be able to do without this grant?' },
      ]);
    case 'Athletic':
      return s('About this athletics grant', [
        { key: 'sport', text: 'Which sport do you play, and what is your team status? Who is your head coach?' },
        { key: 'balance', text: 'How do you balance training and competitions with your studies?' },
      ]);
    case 'Leadership':
      return s('About this leadership grant', [
        { key: 'org', text: 'Which student organization do you lead, and what position and term do you hold?' },
        { key: 'project', text: 'Describe a project you led and what it achieved.' },
      ]);
    case 'Research':
      return s('About this research grant', [
        { key: 'research', text: 'What is your research title and who is your adviser?' },
        { key: 'research_stage', text: 'What stage is your research in, and what are the next steps?' },
      ]);
    case 'Community':
      return s('About this community service scholarship', [
        { key: 'service', text: 'Which organization or project do you serve with?' },
        { key: 'hours', text: 'How many service hours did you complete in the last 12 months, and what did you learn?' },
      ]);
    case 'Alumni':
      return s('About this alumni legacy scholarship', [
        { key: 'alumni', text: 'Who is your Meridian alumnus parent or guardian, and when did they graduate?' },
      ]);
    case 'Performing Arts':
      return s('About this performing arts grant', [
        { key: 'ensemble', text: 'Which university ensemble are you in, and what is your role?' },
        { key: 'performance', text: 'Tell us about a recent performance.' },
      ]);
    default:
      return null;
  }
};

export function sectionsFor(category?: string, title = 'this scholarship'): InterviewSection[] {
  const fit = fitSection(category, title);
  return fit ? [...CORE_SECTIONS, fit] : CORE_SECTIONS;
}

/** Flat list of every question asked for this scholarship. */
export const allQuestions = (sections: InterviewSection[]): InterviewQuestion[] => sections.flatMap((s) => s.questions);
