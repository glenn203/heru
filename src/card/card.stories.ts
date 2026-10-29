import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';
import { iconRefresh } from '../internal/icons.js';

// Tag and Badge do not exist yet. A throwaway stand-in so the header story can
// show where one sits. Not part of the library.
if (!customElements.get('prism-tag'))
  customElements.define(
    'prism-tag',
    class extends HTMLElement {
      connectedCallback() {
        this.style.cssText =
          'display:inline-block;font:500 12px/18px Inter,sans-serif;padding:0 6px;border:1px solid currentColor;border-radius:3px;white-space:nowrap';
      }
    },
  );

interface Args {
  type: 'default' | 'borderless';
  raised: boolean;
  standalone: boolean;
}

const meta: Meta<Args> = {
  title: 'Components/Card',
  component: 'prism-card',
  args: { type: 'default', raised: false, standalone: false },
  argTypes: {
    type: { control: 'inline-radio', options: ['default', 'borderless'] },
  },
  parameters: { layout: 'padded' },
};
export default meta;

const frame = (inner: unknown, width = 360) =>
  html`<div style="max-inline-size:${width}px">${inner}</div>`;

/** Header, content and footer. The footer takes meta and up to two actions. */
export const Default: StoryObj<Args> = {
  render: ({ type, raised, standalone }) =>
    frame(
      html`<prism-card type=${type} ?raised=${raised} ?standalone=${standalone}>
        <prism-card-title slot="header" level="3"
          >Phishing playbook</prism-card-title
        >
        <prism-card-description slot="header"
          >Triage steps for reported email.</prism-card-description
        >
        <p style="margin:0">Runs when a user reports a suspicious message.</p>
        <prism-card-meta slot="footer">Updated 2 min ago</prism-card-meta>
        <prism-card-actions slot="footer">
          <prism-button variant="ghost">View all</prism-button>
        </prism-card-actions>
      </prism-card>`,
    ),
};

/** Replaces Panel: a flat fill, no border and no shadow. */
export const Borderless: StoryObj<Args> = {
  args: { type: 'borderless' },
  render: Default.render!,
};

/** A shadow from the predefined elevation level, plus a transparent border. */
export const Raised: StoryObj<Args> = {
  args: { raised: true },
  render: Default.render!,
};

/** Header parts: icon, title, tag, description and two ghost icon buttons. */
export const HeaderParts: StoryObj<Args> = {
  render: () =>
    frame(
      html`<prism-card>
        <svg
          slot="header"
          data-prism-card-icon
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" />
        </svg>
        <prism-card-title slot="header" level="3"
          >host-eu-0042</prism-card-title
        >
        <prism-tag slot="header">Critical</prism-tag>
        <prism-card-description slot="header"
          >Windows Server 2022, last seen 4 min ago</prism-card-description
        >
        <prism-card-actions slot="header">
          <prism-icon-button label="Refresh host-eu-0042"
            >${iconRefresh()}</prism-icon-button
          >
          <prism-menu label="More options for host-eu-0042">
            <prism-menu-item>Isolate</prism-menu-item>
            <prism-menu-item>Export</prism-menu-item>
          </prism-menu>
        </prism-card-actions>
        <div>Content is free.</div>
      </prism-card>`,
      420,
    ),
};

/**
 * Content-only (marketing) card: buttons on the right, 8px apart, medium,
 * soft on the right and ghost to its left. No primary, outline or destructive.
 */
export const ContentOnly: StoryObj<Args> = {
  render: () =>
    frame(
      html`<prism-card>
        <p style="margin:0">Add a second factor to keep your account safe.</p>
        <prism-card-actions>
          <prism-button variant="ghost">Later</prism-button>
          <prism-button variant="secondary">Set up</prism-button>
        </prism-card-actions>
      </prism-card>`,
    ),
};

/** A standalone task card may hold one primary footer button. */
export const StandaloneTask: StoryObj<Args> = {
  render: () =>
    frame(
      html`<prism-card standalone>
        <prism-card-title slot="header" level="3"
          >Rotate API keys</prism-card-title
        >
        <p style="margin:0">Three keys expire this week.</p>
        <prism-card-actions slot="footer">
          <prism-button variant="ghost">Snooze</prism-button>
          <prism-button>Rotate now</prism-button>
        </prism-card-actions>
      </prism-card>`,
    ),
};

/** Cards in a row share a height; footers line up at the bottom. */
export const FootersAlign: StoryObj<Args> = {
  render: () =>
    html`<div
      style="display:flex;gap:16px;align-items:stretch;max-inline-size:760px"
    >
      ${[1, 2].map(
        (n) =>
          html`<prism-card style="flex:1">
            <prism-card-title slot="header" level="3"
              >Card ${n}</prism-card-title
            >
            <p style="margin:0">
              ${n === 2 ? 'A much longer body. '.repeat(8) : 'Short.'}
            </p>
            <prism-card-meta slot="footer">Footer ${n}</prism-card-meta>
          </prism-card>`,
      )}
    </div>`,
};

/** At 280px or less the icon buttons fold into one overflow menu. */
export const Narrow: StoryObj<Args> = {
  render: () =>
    frame(
      html`<prism-card>
        <prism-card-title slot="header" level="3">Playbook</prism-card-title>
        <prism-card-actions slot="header">
          <prism-icon-button label="Refresh Playbook"
            >${iconRefresh()}</prism-icon-button
          >
          <prism-icon-button label="Export Playbook">E</prism-icon-button>
        </prism-card-actions>
        <p style="margin:0">Body</p>
        <prism-card-meta slot="footer">Updated 2 min ago</prism-card-meta>
        <prism-card-actions slot="footer">
          <prism-button variant="ghost">View all</prism-button>
        </prism-card-actions>
      </prism-card>`,
      260,
    ),
};

const ROW = (v: string, title: string, desc: string) =>
  html`<prism-card type="selectable" kind="choice" value=${v}>
    <prism-card-select slot="header"></prism-card-select>
    <prism-card-title slot="header" level="3">${title}</prism-card-title>
    <prism-card-description slot="header">${desc}</prism-card-description>
    <div>Choose it anywhere on the card.</div>
  </prism-card>`;

/**
 * Clickable (link): the title is the one real link and its click area covers
 * the card. Nested controls sit above it. Hover is the tint only.
 */
export const ClickableLink: StoryObj<Args> = {
  render: () =>
    frame(
      html`<prism-card type="clickable">
        <prism-card-title slot="header" level="3" href="#playbook"
          >Phishing playbook</prism-card-title
        >
        <prism-card-description slot="header"
          >Triage steps for reported email.</prism-card-description
        >
        <prism-card-actions slot="header">
          <prism-menu label="More options for Phishing playbook">
            <prism-menu-item>Duplicate</prism-menu-item>
            <prism-menu-item>Archive</prism-menu-item>
          </prism-menu>
        </prism-card-actions>
        <div>Updated 2 min ago by the SOC team.</div>
      </prism-card>`,
    ),
};

/** Clickable (action): the title is a button, for example to open a Drawer. */
export const ClickableAction: StoryObj<Args> = {
  render: () =>
    frame(
      html`<prism-card type="clickable" raised>
        <prism-card-title slot="header" level="3" action
          >host-eu-0042</prism-card-title
        >
        <div>Opens the details Drawer.</div>
      </prism-card>`,
    ),
};

/** Disabled: no tint, not a link, and the reason is written in the text. */
export const ClickableDisabled: StoryObj<Args> = {
  render: () =>
    frame(
      html`<prism-card type="clickable" disabled>
        <prism-card-title slot="header" level="3" href="#x"
          >Quarantine report</prism-card-title
        >
        <prism-card-description slot="header"
          >Needs the Analyst role.</prism-card-description
        >
      </prism-card>`,
    ),
};

/** Choice cards in a single-select group: a radio group. Arrows move and select. */
export const ChoiceCards: StoryObj<Args> = {
  render: () =>
    html`<prism-card-group
      selection="single"
      label="Plan"
      style="display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,280px))"
    >
      ${ROW('free', 'Free plan', 'For trying it out.')}
      ${ROW('team', 'Team plan', 'Shared dashboards.')}
      ${ROW('ent', 'Enterprise plan', 'Single sign-on and audit.')}
    </prism-card-group>`,
};

/**
 * Collection cards in a multi-select group: only the checkbox toggles, the
 * title stays a link, and actions keep working. A polite message says how many
 * are selected. Selection is by id and survives paging.
 */
export const CollectionCards: StoryObj<Args> = {
  render: () =>
    html`<prism-card-group
      selection="multi"
      label="Hosts"
      style="display:grid;gap:16px;max-inline-size:360px"
    >
      ${['a', 'b', 'c'].map(
        (v) =>
          html`<prism-card
            type="selectable"
            kind="collection"
            value=${v}
            ?selected=${v === 'b'}
          >
            <prism-card-select slot="header"></prism-card-select>
            <prism-card-title slot="header" level="3" href="#host-${v}"
              >Host ${v.toUpperCase()}</prism-card-title
            >
            <prism-card-description slot="header"
              >Windows Server 2022</prism-card-description
            >
            <prism-card-actions slot="header">
              <prism-menu label="More options for Host ${v.toUpperCase()}">
                <prism-menu-item>Isolate</prism-menu-item>
              </prism-menu>
            </prism-card-actions>
            <div>Last seen 4 min ago</div>
          </prism-card>`,
      )}
    </prism-card-group>`,
};

// ---- M3: widget, collapsible, card list (names provisional) ----

const widget = (
  title: string,
  value: string,
  extra: { range?: string; state?: string; message?: string } = {},
) =>
  html`<prism-card
    type="widget"
    range=${extra.range ?? ''}
    state=${extra.state ?? ''}
    state-message=${extra.message ?? ''}
  >
    <prism-card-title slot="header" level="3">${title}</prism-card-title>
    <prism-card-description slot="header">All tenants</prism-card-description>
    <prism-card-actions slot="header">
      <prism-icon-button label="Refresh ${title}"
        >${iconRefresh()}</prism-icon-button
      >
      <prism-menu label="More options for ${title}">
        <prism-menu-item>Configure</prism-menu-item>
        <prism-menu-item>Export</prism-menu-item>
        <prism-menu-item>Remove</prism-menu-item>
      </prism-menu>
    </prism-card-actions>
    <prism-card-metric label="Detections">${value}</prism-card-metric>
    <prism-card-meta slot="footer">Updated 2 min ago</prism-card-meta>
    <prism-card-actions slot="footer">
      <prism-button variant="ghost">View all</prism-button>
    </prism-card-actions>
  </prism-card>`;

/**
 * Widgets follow the page's time range (`data-prism-time-range` on the Toolbar
 * or page). The second widget overrides it: its range shows in the header with
 * the word "Overridden". Change the page range with the select.
 */
export const WidgetTimeRange: StoryObj<Args> = {
  render: () =>
    html`<section
      id="widget-page"
      data-prism-time-range="Last 24 hours"
      style="display:grid;gap:16px;grid-template-columns:repeat(2,minmax(0,340px))"
    >
      <label style="grid-column:1/-1;font:14px Inter,sans-serif"
        >Page time range
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
        </select>
      </label>
      ${widget('Detections over time', '1,284')}
      ${widget('Detections, 30 days', '9,402', { range: 'Last 30 days' })}
    </section>`,
};

/** States stay inside the widget; the header and footer stay put. */
export const WidgetStates: StoryObj<Args> = {
  render: () =>
    html`<div
      style="display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,300px))"
    >
      ${widget('Loading', '0', { state: 'loading' })}
      ${widget('Error', '0', {
        state: 'error',
        message: 'The detections service timed out.',
      })}
      ${widget('Empty', '0', { state: 'empty' })}
    </div>`,
};

/** The title row is the toggle. Closed by default; actions sit beside it. */
export const Collapsible: StoryObj<Args> = {
  render: () =>
    frame(
      html`<div style="display:grid;gap:16px">
        <prism-card type="collapsible" storage-key="story-adv">
          <prism-card-title slot="header" level="3"
            >Advanced settings</prism-card-title
          >
          <prism-card-actions slot="header">
            <prism-icon-button label="Reset Advanced settings"
              >${iconRefresh()}</prism-icon-button
            >
          </prism-card-actions>
          <p style="margin:0">Optional detail group.</p>
          <prism-card-meta slot="footer">Edited yesterday</prism-card-meta>
        </prism-card>
        <prism-card type="collapsible" open>
          <prism-card-title slot="header" level="3"
            >Open by default</prism-card-title
          >
          <p style="margin:0">Open because people need it on first view.</p>
        </prism-card>
      </div>`,
      420,
    ),
};

const HOST_PAGES = 5;
const hostCards = (page: number, size: number): string =>
  Array.from({ length: Math.min(size, 6) }, (_, i) => {
    const id = `host-${(page - 1) * 6 + i + 1}`;
    return `<prism-card type="selectable" kind="collection" value="${id}">
      <prism-card-select slot="header"></prism-card-select>
      <prism-card-title slot="header" level="3" href="#${id}">Host ${id.slice(5)}</prism-card-title>
      <prism-card-description slot="header">Windows Server 2022</prism-card-description>
      <div>Last seen ${i + 1} min ago</div>
      <prism-card-meta slot="footer">Page ${page}</prism-card-meta>
    </prism-card>`;
  }).join('');

/**
 * A paged list of collection cards. "Next" swaps in the next page's cards (as a
 * server would); selected ids stay selected and "N selected" keeps counting.
 */
export const CardList: StoryObj<Args> = {
  render: () => {
    const list = document.createElement('prism-card-list');
    list.setAttribute('label', 'Hosts');
    list.setAttribute('total', String(HOST_PAGES * 6));
    list.setAttribute('page-size', '12');
    list.innerHTML = hostCards(1, 12);
    list.addEventListener('prism-card-list-page', (e) => {
      const { page, pageSize } = (
        e as CustomEvent<{ page: number; pageSize: number }>
      ).detail;
      for (const c of [...list.children])
        if (c.localName === 'prism-card') c.remove();
      list.insertAdjacentHTML('afterbegin', hostCards(page, pageSize));
    });
    return list;
  },
};

/** Loading, refreshing, empty, no matches, error. */
export const CardListStates: StoryObj<Args> = {
  render: () =>
    html`<div style="display:grid;gap:32px">
      <prism-card-list
        label="Loading hosts"
        state="loading"
        skeleton-count="4"
      ></prism-card-list>
      <prism-card-list label="No matches" state="no-matches"></prism-card-list>
      <prism-card-list
        label="Error"
        state="error"
        state-message="The hosts service is down."
      ></prism-card-list>
    </div>`,
};

/** One column in an Aside, Drawer or Modal. */
export const CardListOneColumn: StoryObj<Args> = {
  render: () => {
    const list = document.createElement('prism-card-list');
    list.setAttribute('label', 'Hosts');
    list.setAttribute('columns', '1');
    list.innerHTML = hostCards(1, 3);
    list.style.maxInlineSize = '420px';
    return list;
  },
};
