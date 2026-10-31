import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './define.js';

const meta: Meta = {
  title: 'Components/Menu',
  component: 'prism-menu',
};
export default meta;

/** Overflow menu for a card. Name it after the item it belongs to. */
export const Overflow: StoryObj = {
  render: () =>
    html`<div
      style="display:flex;justify-content:flex-end;max-inline-size:360px"
    >
      <prism-menu label="More options for Onboarding guide">
        <prism-menu-item>Edit</prism-menu-item>
        <prism-menu-item>Duplicate</prism-menu-item>
        <prism-menu-item disabled>Archive (needs approval)</prism-menu-item>
      </prism-menu>
    </div>`,
};

/** Move menu: items at the ends of the list are disabled. */
export const MoveMenu: StoryObj = {
  render: () =>
    html`<prism-menu label="Move 'Onboarding guide'">
      <prism-menu-item disabled>Move to top</prism-menu-item>
      <prism-menu-item disabled>Move up</prism-menu-item>
      <prism-menu-item>Move down</prism-menu-item>
      <prism-menu-item>Move to bottom</prism-menu-item>
    </prism-menu>`,
};

/**
 * Checkbox items: `checkable` (and `checked`) turn a row into a menuitemcheckbox.
 * Activating one flips it and the menu stays open, so the tick is seen drawing
 * itself in on a spring (and out again). Plain items keep room for the tick so
 * all the labels line up.
 */
export const CheckableItems: StoryObj = {
  render: () =>
    html`<prism-menu label="View options">
      <prism-menu-item checkable checked>Show grid</prism-menu-item>
      <prism-menu-item checkable>Show rulers</prism-menu-item>
      <prism-menu-item checkable disabled>Show guides</prism-menu-item>
      <prism-menu-item>Reset view</prism-menu-item>
    </prism-menu>`,
};
