import type { Meta, StoryObj } from '@storybook/web-components';
import { html, svg, type TemplateResult } from 'lit';
import './define.js';
import '../button/define.js';
import '../select/define.js';
import '../option/define.js';
import '../text-field/define.js';
import '../tag/define.js';
import '../badge/define.js';
import '../avatar/define.js';
import '../progress/define.js';
import '../datalist/define.js';
import { iconRefresh } from '../internal/icons.js';

/**
 * Card recipes: whole screens' worth of cards assembled from the card parts and
 * the library's own Tag, Badge, Avatar, Progress, Datalist, Button, Select and
 * Text field. No inline stand-ins; nothing here defines an element. Every name, number and date is made up.
 *
 * Rules every recipe follows:
 * - Each card title is a real heading. Cards sit under an h2 for their group,
 *   so the cards are h3.
 * - Every icon-only control has a label that names its card.
 * - Severity and status are always written as words, never colour alone.
 * - Footers hold meta and at most two actions, and at most one primary, only on
 *   a standalone task card.
 */

const meta: Meta = {
  title: 'Card recipes',
  parameters: { layout: 'padded' },
  tags: ['!autodocs'],
};
export default meta;
type Story = StoryObj;

// ---- small helpers, local to these stories ----

let uid = 0;
/** A group of cards under its own h2, so the cards' h3 titles nest correctly. */
const group = (
  heading: string,
  inner: TemplateResult | Node,
  width = 'none',
) => {
  const id = `recipe-h-${++uid}`;
  return html`<section aria-labelledby=${id} style="max-inline-size:${width}">
    <h2
      id=${id}
      style="margin:0 0 16px;font:600 20px/28px Inter,sans-serif;color:var(--prism-color-text)"
    >
      ${heading}
    </h2>
    ${inner}
  </section>`;
};

/** Key facts: label and value pairs, aligned in two columns (Datalist). */
const facts = (rows: [string, string][], label: string) =>
  html`<prism-datalist label=${label}>
    ${rows.map(
      ([k, v]) =>
        html`<prism-datalist-item label=${k}>${v}</prism-datalist-item>`,
    )}
  </prism-datalist>`;

const dot = (shape: 'circle' | 'square' | 'tri') =>
  html`<svg
    slot="header"
    data-prism-card-icon
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    ${
      shape === 'circle'
        ? svg`<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" />`
        : shape === 'square'
          ? svg`<rect
              x="2.5"
              y="2.5"
              width="11"
              height="11"
              fill="none"
              stroke="currentColor"
            />`
          : svg`<path d="M8 2 14 14H2Z" fill="none" stroke="currentColor" />`
    }
  </svg>`;

/** Reorderable lists move their cards in the DOM, so build them as HTML strings. */
const listOf = (attrs: Record<string, string | true>, cards: string) => {
  const list = document.createElement('prism-card-list');
  for (const [k, v] of Object.entries(attrs))
    list.setAttribute(k, v === true ? '' : v);
  list.innerHTML = cards;
  return list;
};

// ---------------------------------------------------------------------------
// 1. Host summary
// ---------------------------------------------------------------------------

/**
 * One host at a glance. A clickable card: the title is the one link, the
 * overflow menu keeps working above it. The status is a word, with a Tag.
 */
export const HostSummary: Story = {
  render: () =>
    group(
      'Hosts',
      html`<prism-card type="clickable" raised>
        ${dot('square')}
        <prism-card-title slot="header" level="3" href="#host-lyra-0142"
          >lyra-0142</prism-card-title
        >
        <prism-tag slot="header" job="health" tone="success">Online</prism-tag>
        <prism-card-description slot="header"
          >Windows Server 2022, Frankfurt</prism-card-description
        >
        <prism-card-actions slot="header">
          <prism-menu label="More options for lyra-0142">
            <prism-menu-item>Run a scan</prism-menu-item>
            <prism-menu-item>Isolate</prism-menu-item>
            <prism-menu-item>Export details</prism-menu-item>
          </prism-menu>
        </prism-card-actions>
        ${facts(
          [
            ['Sensor', '7.14.2'],
            ['IP address', '192.0.2.42'],
            ['Open detections', '2'],
            ['Policy', 'Servers, standard'],
          ],
          'lyra-0142 details',
        )}
        <prism-progress
          label="Disk used"
          value="72"
          show-value
          tone="warning"
          style="margin-block-start:12px"
        ></prism-progress>
        <prism-card-meta slot="footer">Last seen 4 min ago</prism-card-meta>
      </prism-card>`,
      '420px',
    ),
};

// ---------------------------------------------------------------------------
// 2. Device fleet grid
// ---------------------------------------------------------------------------

const HEALTH_TONE: Record<string, string> = {
  Online: 'success',
  Offline: 'danger',
  'Needs update': 'warning',
};
const FLEET: [string, string, string, string][] = [
  ['orion-laptop-07', 'macOS 15', 'Online', 'Seen 2 min ago'],
  ['orion-laptop-12', 'Windows 11', 'Online', 'Seen 9 min ago'],
  ['vega-db-03', 'Linux 6.8', 'Offline', 'Seen 3 days ago'],
  ['vega-web-11', 'Linux 6.8', 'Online', 'Seen 1 min ago'],
  ['atlas-kiosk-21', 'Windows 10', 'Needs update', 'Seen 1 hour ago'],
  ['atlas-phone-05', 'Android 15', 'Online', 'Seen 14 min ago'],
];

/**
 * Many devices in the card list: one to four columns from the list's own width,
 * never narrower than 280px, 16px apart. Each card is a link.
 */
export const DeviceFleetGrid: Story = {
  render: () =>
    group(
      'Devices',
      listOf(
        { label: 'Devices' },
        FLEET.map(
          ([name, os, status, seen]) => `<prism-card type="clickable">
            <prism-card-title slot="header" level="3" href="#${name}">${name}</prism-card-title>
            <prism-tag slot="header" job="health" tone="${HEALTH_TONE[status]}">${status}</prism-tag>
            <prism-card-description slot="header">${os}</prism-card-description>
            <prism-card-meta slot="footer">${seen}</prism-card-meta>
          </prism-card>`,
        ).join(''),
      ),
    ),
};

// ---------------------------------------------------------------------------
// 3. Detection alerts with severity
// ---------------------------------------------------------------------------

const SEVERITY_TONE: Record<string, string> = {
  Critical: 'danger',
  High: 'danger',
  Medium: 'warning',
  Low: 'info',
};
const DETECTIONS: [string, string, string, string][] = [
  [
    'Critical',
    'Credential dumping attempt',
    'orion-laptop-07',
    'Blocked a process reading protected memory.',
  ],
  [
    'High',
    'Suspicious PowerShell download',
    'atlas-kiosk-21',
    'A script fetched a file from an unrecognized host.',
  ],
  [
    'Medium',
    'Unusual login location',
    'Maya Ortiz',
    'A sign-in came from a country not seen in 90 days.',
  ],
  [
    'Low',
    'Unsigned installer launched',
    'vega-web-11',
    'An installer with no publisher ran once.',
  ],
];

/**
 * Alert cards. Severity is a Tag with the word in it (never colour alone) and
 * is the first thing after the title. The footer has meta and two actions, no
 * primary.
 */
export const DetectionAlerts: Story = {
  render: () =>
    group(
      'Open detections',
      html`<div style="display:grid;gap:16px">
        ${DETECTIONS.map(
          ([sev, title, who, text]) =>
            html`<prism-card>
              <prism-card-title slot="header" level="3"
                >${title}</prism-card-title
              >
              <prism-tag
                slot="header"
                job="severity"
                tone=${SEVERITY_TONE[sev] ?? 'neutral'}
                emphasis=${sev === 'Critical' ? 'high' : 'low'}
                >${sev}</prism-tag
              >
              <prism-card-description slot="header"
                >${who}</prism-card-description
              >
              <p style="margin:0">${text}</p>
              <prism-card-meta slot="footer"
                >Detected 12 min ago</prism-card-meta
              >
              <prism-card-actions slot="footer">
                <prism-button variant="ghost">Dismiss</prism-button>
                <prism-button variant="secondary">Investigate</prism-button>
              </prism-card-actions>
            </prism-card>`,
        )}
      </div>`,
      '520px',
    ),
};

// ---------------------------------------------------------------------------
// 4. KPI widget dashboard
// ---------------------------------------------------------------------------

const kpi = (
  title: string,
  label: string,
  value: string,
  extra: {
    range?: string;
    state?: string;
    message?: string;
    live?: boolean;
  } = {},
) =>
  html`<prism-card
    type="widget"
    range=${extra.range ?? ''}
    state=${extra.state ?? ''}
    state-message=${extra.message ?? ''}
  >
    <prism-card-title slot="header" level="3">${title}</prism-card-title>
    ${
      extra.live
        ? html`<prism-badge
            slot="header"
            job="status"
            status="live"
          ></prism-badge>`
        : ''
    }
    <prism-card-actions slot="header">
      <prism-icon-button label="Refresh ${title}"
        >${iconRefresh()}</prism-icon-button
      >
      <prism-menu label="More options for ${title}">
        <prism-menu-item>Configure</prism-menu-item>
        <prism-menu-item>Export</prism-menu-item>
      </prism-menu>
    </prism-card-actions>
    <prism-card-metric label=${label}>${value}</prism-card-metric>
    <prism-card-meta slot="footer">Updated 2 min ago</prism-card-meta>
    <prism-card-actions slot="footer">
      <prism-button variant="ghost" size="sm">View all</prism-button>
    </prism-card-actions>
  </prism-card>`;

/**
 * A dashboard of widgets. The select sets the page's time range, every widget
 * follows it, and "Phishing reports" overrides it with its own range. The last
 * widget shows the loading state.
 */
export const KpiDashboard: Story = {
  render: () =>
    html`<section
      data-prism-time-range="Last 24 hours"
      aria-labelledby="kpi-h"
      style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));max-inline-size:960px"
    >
      <h2
        id="kpi-h"
        style="grid-column:1/-1;margin:0;font:600 20px/28px Inter,sans-serif"
      >
        Security overview
      </h2>
      <label style="grid-column:1/-1;font:14px Inter,sans-serif"
        >Time range
        <select
          @change=${(e: Event) =>
            (e.target as HTMLElement)
              .closest('section')
              ?.setAttribute(
                'data-prism-time-range',
                (e.target as HTMLSelectElement).value,
              )}
        >
          <option>Last 24 hours</option>
          <option>Last 7 days</option>
          <option>Last 30 days</option>
        </select>
      </label>
      ${kpi('Detections', 'Detections', '1,284', { live: true })}
      ${kpi('Hosts at risk', 'Hosts', '37')}
      ${kpi('Phishing reports', 'Reports', '212', { range: 'Last 30 days' })}
      ${kpi('Mean time to respond', 'Minutes', '18', { state: 'loading' })}
    </section>`,
};

// ---------------------------------------------------------------------------
// 5. Pricing / plan choice
// ---------------------------------------------------------------------------

const PLANS: [string, string, string, string[]][] = [
  [
    'free',
    'Starter',
    '$0 per month',
    ['1 workspace', '3 members', 'Community help'],
  ],
  [
    'team',
    'Team',
    '$12 per member per month',
    ['Unlimited workspaces', 'Shared dashboards', 'Email help'],
  ],
  [
    'ent',
    'Enterprise',
    'Talk to sales',
    ['Single sign-on', 'Audit log export', 'Named contact'],
  ],
];

/**
 * Choice cards in a radio group: pick one plan. Click anywhere on a card, or
 * use the arrow keys. The price is text in the description, and the "Most
 * popular" note is a Tag.
 */
export const PricingPlans: Story = {
  render: () =>
    group(
      'Choose a plan',
      html`<prism-card-group
        selection="single"
        label="Plan"
        style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))"
      >
        ${PLANS.map(
          ([v, name, price, items]) =>
            html`<prism-card
              type="selectable"
              kind="choice"
              value=${v}
              ?selected=${v === 'team'}
            >
              <prism-card-select slot="header"></prism-card-select>
              <prism-card-title slot="header" level="3"
                >${name}</prism-card-title
              >
              ${
                v === 'team'
                  ? html`<prism-tag slot="header" tone="accent"
                      >Most popular</prism-tag
                    >`
                  : ''
              }
              <prism-card-description slot="header"
                >${price}</prism-card-description
              >
              <ul style="margin:0;padding-inline-start:20px">
                ${items.map((i) => html`<li>${i}</li>`)}
              </ul>
            </prism-card>`,
        )}
      </prism-card-group>`,
      '900px',
    ),
};

// ---------------------------------------------------------------------------
// 6. Integration catalog
// ---------------------------------------------------------------------------

const APPS: [string, string, string, string, 'circle' | 'square' | 'tri'][] = [
  [
    'Calendar sync',
    'Productivity',
    'Connected',
    'Show events beside alerts.',
    'circle',
  ],
  [
    'Chat notifications',
    'Messaging',
    'Connected',
    'Post new detections to a channel.',
    'square',
  ],
  [
    'Ticket tracker',
    'Workflow',
    'Available',
    'Open a ticket from any alert.',
    'tri',
  ],
  [
    'Cloud storage',
    'Storage',
    'Available',
    'Save exported reports to a bucket.',
    'circle',
  ],
  [
    'Identity provider',
    'Access',
    'Beta',
    'Sync groups for single sign-on.',
    'square',
  ],
  [
    'Status page',
    'Communication',
    'Available',
    'Share incident updates publicly.',
    'tri',
  ],
];

const APP_TONE: Record<string, string> = {
  Connected: 'success',
  Available: 'neutral',
  Beta: 'info',
};
const shapeSvg = (s: 'circle' | 'square' | 'tri') =>
  `<svg slot="header" data-prism-card-icon width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">${
    s === 'circle'
      ? '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor"/>'
      : s === 'square'
        ? '<rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="currentColor"/>'
        : '<path d="M8 2 14 14H2Z" fill="none" stroke="currentColor"/>'
  }</svg>`;

/** A catalog in the card list. The state is a Tag in words, the category is footer meta. */
export const IntegrationCatalog: Story = {
  render: () =>
    group(
      'Integrations',
      listOf(
        { label: 'Integrations' },
        APPS.map(
          ([name, cat, status, text, shape]) => `<prism-card type="clickable">
            ${shapeSvg(shape)}
            <prism-card-title slot="header" level="3" href="#${name.toLowerCase().replace(/ /g, '-')}">${name}</prism-card-title>
            <prism-tag slot="header" job="${status === 'Beta' ? 'keyword' : 'presence'}" tone="${APP_TONE[status]}">${status}</prism-tag>
            <p style="margin:0">${text}</p>
            <prism-card-meta slot="footer">${cat}</prism-card-meta>
          </prism-card>`,
        ).join(''),
      ),
    ),
};

// ---------------------------------------------------------------------------
// 7. User / profile
// ---------------------------------------------------------------------------

/** A person. The avatar is decorative (the name is the title), actions are text buttons. */
export const UserProfile: Story = {
  render: () =>
    group(
      'Team',
      html`<prism-card>
        <prism-avatar
          slot="header"
          name="Maya Ortiz"
          size="sm"
          decorative
        ></prism-avatar>
        <prism-card-title slot="header" level="3">Maya Ortiz</prism-card-title>
        <prism-tag slot="header" job="keyword">Admin</prism-tag>
        <prism-card-description slot="header"
          >Security analyst, Lisbon</prism-card-description
        >
        ${facts(
          [
            ['Email', 'maya.ortiz@example.com'],
            ['Team', 'Threat response'],
            ['Joined', 'March 2024'],
          ],
          'Maya Ortiz details',
        )}
        <prism-card-meta slot="footer">Active today</prism-card-meta>
        <prism-card-actions slot="footer">
          <prism-button variant="ghost">Message</prism-button>
          <prism-button variant="secondary">View profile</prism-button>
        </prism-card-actions>
      </prism-card>`,
      '420px',
    ),
};

// ---------------------------------------------------------------------------
// 8. Onboarding and marketing (content-only)
// ---------------------------------------------------------------------------

const promo = (heading: string, text: string, later: string, go: string) =>
  html`<prism-card>
    <h3 style="margin:0 0 4px;font:600 16px/24px Inter,sans-serif">
      ${heading}
    </h3>
    <p style="margin:0">${text}</p>
    <prism-card-actions>
      <prism-button variant="ghost">${later}</prism-button>
      <prism-button variant="secondary">${go}</prism-button>
    </prism-card-actions>
  </prism-card>`;

/**
 * Content-only cards: no header, no footer. The heading is the first thing in
 * the content. Buttons sit at the end, 8px apart: ghost, then soft.
 */
export const OnboardingAndMarketing: Story = {
  render: () =>
    group(
      'Get started',
      html`<div
        style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))"
      >
        ${promo(
          'Add a second factor',
          'Two-step sign-in keeps your account safe if a password leaks.',
          'Later',
          'Set up',
        )}
        ${promo(
          'Invite your team',
          'Share dashboards and alerts. It takes a minute.',
          'Skip',
          'Invite',
        )}
        ${promo(
          'What is new in Nova 3.2',
          'Faster search, a calmer dashboard and better keyboard support.',
          'Dismiss',
          'Read more',
        )}
        <prism-card>
          <h3 style="margin:0 0 12px;font:600 16px/24px Inter,sans-serif">
            Finish setting up
          </h3>
          <prism-progress
            label="Setup progress"
            value="3"
            max="5"
            value-text="3 of 5 steps"
            show-value
          ></prism-progress>
          <prism-card-actions>
            <prism-button variant="secondary">Continue</prism-button>
          </prism-card-actions>
        </prism-card>
      </div>`,
      '960px',
    ),
};

// ---------------------------------------------------------------------------
// 9. Collapsible settings groups
// ---------------------------------------------------------------------------

/**
 * Settings in collapsible cards. The title row is the toggle. A group people
 * need on first view is open. Each form control has a visible label.
 */
export const SettingsGroups: Story = {
  render: () =>
    group(
      'Settings',
      html`<div style="display:grid;gap:16px">
        <prism-card type="collapsible" open>
          <prism-card-title slot="header" level="3">Profile</prism-card-title>
          <div style="display:grid;gap:16px">
            <prism-text-field
              label="Display name"
              value="Maya Ortiz"
            ></prism-text-field>
            <prism-select label="Language" value="en">
              <prism-option value="en">English</prism-option>
              <prism-option value="pt">Portuguese</prism-option>
              <prism-option value="de">German</prism-option>
            </prism-select>
          </div>
          <prism-card-actions slot="footer">
            <prism-button variant="ghost">Reset</prism-button>
            <prism-button variant="secondary">Save</prism-button>
          </prism-card-actions>
        </prism-card>
        <prism-card type="collapsible">
          <prism-card-title slot="header" level="3"
            >Notifications</prism-card-title
          >
          <fieldset style="margin:0;padding:0;border:0;display:grid;gap:8px">
            <legend style="padding:0;margin-block-end:8px">
              Email me about
            </legend>
            <label
              ><input type="checkbox" checked /> New critical detections</label
            >
            <label><input type="checkbox" /> Weekly summary</label>
            <label><input type="checkbox" /> Product news</label>
          </fieldset>
        </prism-card>
        <prism-card type="collapsible">
          <prism-card-title slot="header" level="3"
            >Data retention</prism-card-title
          >
          <prism-select label="Keep detections for" value="90">
            <prism-option value="30">30 days</prism-option>
            <prism-option value="90">90 days</prism-option>
            <prism-option value="365">1 year</prism-option>
          </prism-select>
          <prism-card-meta slot="footer">Changed 2 weeks ago</prism-card-meta>
        </prism-card>
      </div>`,
      '520px',
    ),
};

// ---------------------------------------------------------------------------
// 10. Kanban columns (reorder-group)
// ---------------------------------------------------------------------------

const TASKS: Record<string, [string, string, string, string][]> = {
  'To do': [
    ['Review firewall rules', 'Priya N.', 'High', 'Due Nov 4'],
    ['Patch kiosk fleet', 'Tom R.', 'Medium', 'Due Nov 6'],
    ['Update runbook', 'Maya O.', 'Low', 'Due Nov 12'],
  ],
  'In progress': [
    ['Investigate login spike', 'Maya O.', 'High', 'Due Nov 1'],
    ['Rotate service keys', 'Tom R.', 'Medium', 'Due Nov 3'],
  ],
  Done: [['Enable two-step sign-in', 'Priya N.', 'Medium', 'Done Oct 27']],
};

/**
 * Columns are three card lists in one `reorder-group`, so a card can be dragged
 * between them. Without a mouse: open the "Reorder {title}" button and use Move
 * to top, up, down or bottom. (To move between columns by keyboard, an app would
 * add its own menu items; this recipe only reorders within a column.) Each move
 * is announced with the column names.
 */
export const KanbanBoard: Story = {
  render: () => {
    const board = document.createElement('section');
    board.setAttribute('aria-label', 'Response tasks');
    board.style.cssText =
      'display:grid;gap:24px;grid-template-columns:repeat(3,minmax(0,300px));align-items:start';
    let n = 0;
    for (const [column, cards] of Object.entries(TASKS)) {
      const id = `kanban-h-${++n}`;
      const section = document.createElement('section');
      section.setAttribute('aria-labelledby', id);
      const h = document.createElement('h2');
      h.id = id;
      h.textContent = column;
      h.style.cssText = 'margin:0 0 12px;font:600 16px/24px Inter,sans-serif';
      section.append(
        h,
        listOf(
          {
            label: column,
            reorderable: true,
            'reorder-group': 'response-tasks',
            columns: '1',
          },
          cards
            .map(
              ([title, who, pri, due]) => `<prism-card value="${title}">
                <prism-card-handle slot="header"></prism-card-handle>
                <prism-card-title slot="header" level="3">${title}</prism-card-title>
                <prism-tag slot="header" job="keyword" tone="${pri === 'High' ? 'danger' : pri === 'Medium' ? 'warning' : 'neutral'}">${pri}</prism-tag>
                <prism-card-description slot="header">${who}</prism-card-description>
                <prism-card-meta slot="footer">${due}</prism-card-meta>
              </prism-card>`,
            )
            .join(''),
        ),
      );
      board.append(section);
    }
    return board;
  },
};

// ---------------------------------------------------------------------------
// 11. Selectable report list with a count
// ---------------------------------------------------------------------------

const REPORTS: [string, string, string][] = [
  ['Weekly detections', 'Every Monday', 'Oct 27'],
  ['Host coverage', 'Every month', 'Oct 1'],
  ['Phishing trends', 'Every Friday', 'Oct 24'],
  ['Admin sign-ins', 'Every day', 'Oct 28'],
  ['Policy changes', 'On demand', 'Oct 15'],
];

/**
 * A list of collection cards. Only the checkbox selects; the title stays a link.
 * "N selected" and "Clear selection" appear above the list on their own, and a
 * polite message says the count as it changes.
 */
export const SelectableReportList: Story = {
  render: () =>
    group(
      'Reports',
      listOf(
        { label: 'Reports', columns: '1' },
        REPORTS.map(
          (
            [name, when, last],
            i,
          ) => `<prism-card type="selectable" kind="collection" value="r${i}" ${i === 1 ? 'selected' : ''}>
            <prism-card-select slot="header"></prism-card-select>
            <prism-card-title slot="header" level="3" href="#report-${i}">${name}</prism-card-title>
            <prism-card-description slot="header">${when}</prism-card-description>
            <prism-card-meta slot="footer">Last run ${last}</prism-card-meta>
          </prism-card>`,
        ).join(''),
      ),
      '520px',
    ),
};

// ---------------------------------------------------------------------------
// 12. Empty states
// ---------------------------------------------------------------------------

/**
 * Two empty states. First use: the list's `empty` slot holds a short title, one
 * sentence and one button. A quiet one: a plain card that says what is missing
 * and what changes it.
 */
export const EmptyState: Story = {
  render: () => {
    const list = listOf(
      { label: 'Saved searches', state: 'empty', columns: '1' },
      `<prism-card slot="empty">
        <h3 style="margin:0 0 4px;font:600 16px/24px Inter,sans-serif">No saved searches yet</h3>
        <p style="margin:0">Save a search to run it again with one click.</p>
        <prism-card-actions><prism-button variant="secondary">New search</prism-button></prism-card-actions>
      </prism-card>`,
    );
    return html`<div style="display:grid;gap:32px;max-inline-size:520px">
      ${group('Saved searches', list)}
      ${group(
        'Detections',
        html`<prism-card type="borderless">
          <prism-card-title slot="header" level="3"
            >No detections in this period</prism-card-title
          >
          <p style="margin:0">
            Nothing matched in the last 24 hours. Try a longer time range.
          </p>
          <prism-card-actions slot="footer">
            <prism-button variant="ghost">Last 7 days</prism-button>
          </prism-card-actions>
        </prism-card>`,
      )}
    </div>`;
  },
};

// ---------------------------------------------------------------------------
// 13. Activity feed
// ---------------------------------------------------------------------------

const ACTIVITY: [string, string, string][] = [
  ['2026-10-29T09:41', '9:41 AM', 'Maya Ortiz isolated orion-laptop-07.'],
  [
    '2026-10-29T09:12',
    '9:12 AM',
    'Policy "Servers, standard" was updated by Tom Reyes.',
  ],
  [
    '2026-10-29T08:55',
    '8:55 AM',
    'A critical detection was opened on vega-db-03.',
  ],
  [
    '2026-10-28T17:30',
    'Yesterday, 5:30 PM',
    'Weekly detections report was sent to 4 people.',
  ],
  [
    '2026-10-28T14:02',
    'Yesterday, 2:02 PM',
    'Priya Nair signed in from Lisbon.',
  ],
];

/** A feed is an ordered list inside one card, newest first, each entry with its time. */
export const ActivityFeed: Story = {
  render: () =>
    group(
      'Today',
      html`<prism-card>
        <prism-card-title slot="header" level="3"
          >Recent activity</prism-card-title
        >
        <prism-card-actions slot="header">
          <prism-icon-button label="Refresh Recent activity"
            >${iconRefresh()}</prism-icon-button
          >
        </prism-card-actions>
        <ol style="margin:0;padding:0;list-style:none;display:grid;gap:12px">
          ${ACTIVITY.map(
            ([iso, text, what]) =>
              html`<li>
                <time
                  datetime=${iso}
                  style="display:block;color:var(--prism-color-text-muted)"
                  >${text}</time
                >${what}
              </li>`,
          )}
        </ol>
        <prism-card-meta slot="footer"
          >Showing the last 5 events</prism-card-meta
        >
        <prism-card-actions slot="footer">
          <prism-button variant="ghost"
            >Unread <prism-badge count="12"></prism-badge
          ></prism-button>
        </prism-card-actions>
      </prism-card>`,
      '460px',
    ),
};

// ---------------------------------------------------------------------------
// 14. Standalone task
// ---------------------------------------------------------------------------

/** The one place a primary button belongs: a standalone task card with one next step. */
export const IncidentTask: Story = {
  render: () =>
    group(
      'Needs you',
      html`<prism-card standalone raised>
        <prism-card-title slot="header" level="3"
          >Respond to the credential dumping alert</prism-card-title
        >
        <prism-tag slot="header" job="severity" tone="danger" emphasis="high"
          >Critical</prism-tag
        >
        <prism-card-description slot="header"
          >orion-laptop-07</prism-card-description
        >
        <p style="margin:0">
          The process was blocked. Confirm the host is clean before it rejoins
          the network.
        </p>
        <prism-card-meta slot="footer">Opened 12 min ago</prism-card-meta>
        <prism-card-actions slot="footer">
          <prism-button variant="ghost">Snooze</prism-button>
          <prism-button>Start response</prism-button>
        </prism-card-actions>
      </prism-card>`,
      '460px',
    ),
};
