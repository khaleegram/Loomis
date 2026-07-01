/**
 * One-off: reset JSS3 B hackathon demo student to ₦150 owed on Railway prod.
 *
 *   pnpm --filter @loomis/api db:hackathon:reset-jss3b:prod
 *   pnpm --filter @loomis/api db:hackathon:reset-jss3b:railway
 */
import { academicRepository } from '../src/modules/academic/repository/academic.repository.js';
import { financeRepository } from '../src/modules/finance/repository/index.js';
import {
  HACKATHON_DEMO_FEE_MINOR,
  hackathonDemoService,
} from '../src/modules/finance/services/hackathon-demo.service.js';
import { userRepository } from '../src/modules/identity/repository/user.repository.js';
import { parentDashboardRepository } from '../src/modules/read-models/repository/index.js';
import { GREENFIELD_SCHOOL_SLUG, schoolDevEmail } from './seed-email.js';

const PARENT_JSS3B_EMAIL = schoolDevEmail('parent.jss3b', GREENFIELD_SCHOOL_SLUG);
const MARKER_EMAIL = schoolDevEmail('principal', GREENFIELD_SCHOOL_SLUG);

function pickParentFeesTermId(terms: { id: string; status: string }[]): string | null {
  return (
    terms.find((term) => term.status === 'open')?.id ??
    terms.find((term) => term.status === 'census_locked')?.id ??
    terms[0]?.id ??
    null
  );
}

async function main() {
  const principal = await userRepository.findByEmail(MARKER_EMAIL);
  if (!principal?.tenantId) {
    console.error(`Greenfield principal not found (${MARKER_EMAIL})`);
    process.exit(1);
  }
  const tenantId = principal.tenantId;

  const parent = await userRepository.findByEmail(PARENT_JSS3B_EMAIL);
  if (!parent) {
    console.error(`Parent demo account not found (${PARENT_JSS3B_EMAIL})`);
    process.exit(1);
  }

  const cards = await parentDashboardRepository.listForParent(parent.id);
  const card = cards.find((row) => row.tenantId === tenantId);
  if (!card) {
    console.error('No parent dashboard card for Greenfield — run rich seed first');
    process.exit(1);
  }

  const years = await academicRepository.listYears(tenantId);
  const year = years.find((y) => y.status === 'active') ?? years[0];
  if (!year) {
    console.error('No academic year');
    process.exit(1);
  }

  const terms = await academicRepository.listTermsByYear(tenantId, year.id);
  const termId = pickParentFeesTermId(terms);
  if (!termId) {
    console.error('No term');
    process.exit(1);
  }

  const termLabel = terms.find((t) => t.id === termId)?.name ?? termId;
  const existingInvoice = await financeRepository.findInvoiceByTermStudent(
    tenantId,
    termId,
    card.studentId,
  );
  if (!existingInvoice) {
    console.error(
      'No invoice for linked demo child — log in as principal and issue fees, or run db:seed:rich:prod',
    );
    process.exit(1);
  }

  const result = await hackathonDemoService.resetStudentFeesInternal(
    tenantId,
    card.studentId,
    termId,
  );

  console.log('Hackathon demo fees reset');
  console.log(`  Parent:     ${PARENT_JSS3B_EMAIL}`);
  console.log(`  Student:    ${card.studentFirstName} (${card.studentId})`);
  console.log(`  Term:       ${termLabel}`);
  console.log(`  Invoice:    ${result.invoiceId}`);
  console.log(`  Balance:    ₦${(result.balanceMinor / 100).toLocaleString()} (${HACKATHON_DEMO_FEE_MINOR} kobo)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
