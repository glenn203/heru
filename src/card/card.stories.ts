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
