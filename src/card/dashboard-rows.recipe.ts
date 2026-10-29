/**
 * The "Dashboard rows" recipe, as plain DOM so the Storybook story and the
 * tests build the same thing. It is not a component and is not shipped.
 *
 * Three rows of three widget cards. Each row is a reorderable
 * `prism-card-list` in one `reorder-group`, so a card can be dragged to any
 * row. A row lays its cards out as equal columns sized to its item count
 * (`grid-auto-flow: column` with `1fr` columns), so one card fills the row, and
 * an empty row stays a visible drop target. Without a pointer, the card's menu
 * has the Move items plus "Move to row N" for every other row.
 */

interface Widget {
  id: string;
  title: string;
  label: string;
  value: string;
  extra?: string;
  header?: string;
}

const ROWS: Widget[][] = [
  [
    {
      id: 'detections',
      title: 'Open detections',
      label: 'Detections',
      value: '1,284',
      header:
        '<prism-badge slot="header" job="status" status="live"></prism-badge>',
    },
    {
      id: 'hosts',
      title: 'Hosts online',
      label: 'Hosts',
      value: '4,092',
      extra:
        '<prism-tag job="health" tone="success" size="sm">Healthy</prism-tag>',
    },
    {
      id: 'coverage',
      title: 'Sensor coverage',
      label: 'Coverage',
      value: '96%',
      extra:
        '<prism-progress label="Hosts with a sensor" value="96" show-value tone="success"></prism-progress>',
    },
  ],
  [
    {
      id: 'critical',
      title: 'Critical alerts',
      label: 'Critical',
      value: '23',
      extra:
        '<prism-tag job="severity" tone="danger" emphasis="high" size="sm">Critical</prism-tag>',
    },
    {
      id: 'response',
      title: 'Time to respond',
      label: 'Median, minutes',
      value: '14',
    },
    {
      id: 'disk',
      title: 'Disk used',
      label: 'Fleet average',
      value: '72%',
      extra:
        '<prism-progress label="Disk used" value="72" show-value tone="warning"></prism-progress>',
    },
  ],
  [
    {
      id: 'signins',
      title: 'Admin sign-ins',
      label: 'This week',
      value: '58',
    },
    {
      id: 'policies',
      title: 'Policy changes',
      label: 'This week',
      value: '7',
      extra:
        '<prism-tag job="policy" tone="info" size="sm">Reviewed</prism-tag>',
    },
    {
      id: 'reports',
      title: 'Reports queued',
      label: 'Waiting',
      value: '12',
      header: '<prism-badge slot="header" count="12"></prism-badge>',
    },
  ],
];

const STYLE = `
.dash { display: grid; gap: 24px; }
.dash-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.dash h2 { margin: 0 0 12px; font: 600 16px/24px Inter, sans-serif; color: var(--prism-color-text); }
.dash-bar h2 { margin: 0; font-size: 20px; line-height: 28px; }
.dash-zone { position: relative; }
.dash-list { display: block; min-block-size: 112px; }
prism-card-list.dash-list::part(grid) {
  grid-template-columns: none;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
}
.dash-empty { display: none; }
.dash-zone:not(:has(prism-card)) {
  border: 2px dashed var(--prism-color-border-strong, currentColor);
  border-radius: var(--prism-radius-3, 3px);
}
.dash-zone:not(:has(prism-card)) .dash-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  color: var(--prism-color-text-muted, currentColor);
  font: 400 14px/20px Inter, sans-serif;
  pointer-events: none;
}
.dash-sr {
  position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden;
  clip-path: inset(50%); white-space: nowrap;
}
`;

const widgetHtml = (w: Widget): string => `
  <prism-card type="widget" value="${w.id}">
    <prism-card-handle slot="header"></prism-card-handle>
    <prism-card-title slot="header" level="3">${w.title}</prism-card-title>
    ${w.header ?? ''}
    <prism-card-actions slot="header">
      <prism-menu label="More options for ${w.title}">
        <prism-menu-item>Configure</prism-menu-item>
        <prism-menu-item>Export</prism-menu-item>
      </prism-menu>
    </prism-card-actions>
    <prism-card-metric label="${w.label}">${w.value}</prism-card-metric>
    ${w.extra ?? ''}
    <prism-card-meta slot="footer">Updated 2 min ago</prism-card-meta>
  </prism-card>`;

type Card = HTMLElement & { titleText: string };
type CardList = HTMLElement & {
  cardItems: Card[];
  moveCardTo(card: Card, target: CardList, index?: number): Promise<void>;
};

export function createDashboardRows(): HTMLElement {
  const root = document.createElement('section');
  root.className = 'dash';
  root.setAttribute('aria-label', 'Dashboard');
  root.innerHTML = `
    <style>${STYLE}</style>
    <div class="dash-bar">
      <h2>Dashboard</h2>
      <prism-button variant="secondary" data-dash-reset>Reset layout</prism-button>
    </div>
    ${ROWS.map(
      (cards, i) => `
      <section aria-labelledby="dash-row-${String(i + 1)}">
        <h2 id="dash-row-${String(i + 1)}">Row ${String(i + 1)}</h2>
        <div class="dash-zone">
          <prism-card-list class="dash-list" label="Row ${String(i + 1)}" reorderable reorder-group="dashboard" data-dash-row="${String(i + 1)}">
            ${cards.map(widgetHtml).join('')}
          </prism-card-list>
          <p class="dash-empty">Row ${String(i + 1)} is empty. Drag a card here, or choose Move to row ${String(i + 1)} on a card.</p>
        </div>
      </section>`,
    ).join('')}
    <div class="dash-sr" role="status" aria-live="polite" data-dash-status></div>`;

  const lists = [...root.querySelectorAll<CardList>('prism-card-list')];
  const status = root.querySelector<HTMLElement>('[data-dash-status]')!;
  const home = lists.map((l) => [
    ...l.querySelectorAll<Card>(':scope > prism-card'),
  ]);

  const say = (text: string): void => {
    status.textContent = '';
    requestAnimationFrame(() => {
      status.textContent = text;
    });
  };

  /** "Move to row N" for every row but the card's own, after the Move items. */
  const refreshRowItems = (): void => {
    lists.forEach((list, at) => {
      for (const card of list.querySelectorAll<Card>(':scope > prism-card')) {
        const menu = card.querySelector(
          ':scope > prism-card-actions > prism-menu',
        );
        if (!menu) continue;
        for (const old of menu.querySelectorAll('[data-dash-row-item]'))
          old.remove();
        const title =
          card.querySelector('prism-card-title')?.textContent?.trim() ?? '';
        lists.forEach((_, n) => {
          if (n === at) return;
          const item = document.createElement('prism-menu-item');
          item.setAttribute('data-dash-row-item', String(n + 1));
          item.setAttribute(
            'aria-label',
            `Move to row ${String(n + 1)}, ${title}`,
          );
          item.textContent = `Move to row ${String(n + 1)}`;
          menu.append(item);
        });
      }
    });
  };
  const later = (): void => {
    requestAnimationFrame(() => requestAnimationFrame(refreshRowItems));
  };

  root.addEventListener('prism-menu-select', (event) => {
    const { item } = (event as CustomEvent<{ item: HTMLElement }>).detail;
    const row = Number(item.dataset['dashRowItem']);
    if (!row) return;
    const card = item.closest<Card>('prism-card');
    const from = card?.parentElement as CardList | null;
    const to = lists[row - 1];
    if (card && from && to)
      void from.moveCardTo(card, to).then(refreshRowItems);
  });
  // A drag, or a Move item, changes which row a card is in.
  root.addEventListener('prism-card-reorder', later);

  root.querySelector('[data-dash-reset]')!.addEventListener('click', () => {
    home.forEach((cards, i) => {
      for (const card of cards) lists[i]!.append(card);
    });
    later();
    say('Layout reset. Three rows of three cards.');
  });

  later();
  return root;
}
