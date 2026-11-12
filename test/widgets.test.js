// -----------------------------------------------------------------------------
// The "alerts" widget: valid for the core, most serious first, the names given
// in Gladys, every optional block can be hidden.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { create, createWorld } from './helpers/world.js';

async function widget(world, settings = {}, language = 'en') {
  const ack = await world.fake.widgetGet('alerts', { settings, language });
  assert.equal(ack.success, true, ack.error);
  const content = ack.data.content;
  assert.deepEqual(validateWidgetContent(content), []);
  return content;
}

const of = (content, type) => content.components.filter((c) => c.type === type);

test('no park added: the widget says where to add one', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const content = await widget(world);
  assert.match(content.components[0].text, /Discover tab/);
});

test('the alerts of several parks, most serious first, with the names given in Gladys', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const yose = await create(world, 'yose');
  await create(world, 'grca');
  await world.fake.deviceUpdated({ ...yose, name: 'Yosemite' });
  const content = await widget(world);
  const [caption] = of(content, 'text');
  assert.equal(caption.text, 'Grand Canyon National Park: 4 alerts · Yosemite: 2 alerts');
  const [status] = of(content, 'status');
  assert.deepEqual(
    status.items.map((item) => [item.label, item.color]),
    [
      ['Grand Canyon National Park · Closure', 'danger'],
      ['Yosemite · Closure', 'danger'],
      ['Grand Canyon National Park · Danger', 'danger'],
      ['Grand Canyon National Park · Caution', 'warning'],
      ['Grand Canyon National Park · Caution', 'warning'],
      ['Yosemite · Information', 'info'],
    ],
  );
  for (const item of status.items) {
    assert.ok(item.label.length <= 40 && item.value.length <= 40, item.label);
  }
  // Two parks: no single conditions page to link to.
  assert.equal(of(content, 'button').length, 0);
});

test('one park: link to its conditions page; information, count and link can be hidden', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const yose = await create(world, 'yose');
  await create(world, 'grca');
  const one = await widget(world, { parks: [yose.external_id] }, 'fr');
  assert.deepEqual(
    of(one, 'status')[0].items.map((item) => item.label),
    ['Fermeture', 'Information'],
  );
  assert.equal(
    of(one, 'button')[0].link.url,
    'https://www.nps.gov/yose/planyourvisit/conditions.htm',
  );
  const bare = await widget(world, {
    parks: [yose.external_id],
    show_information: false,
    show_summary: false,
    show_link: false,
  });
  assert.deepEqual(
    bare.components.map((c) => c.type),
    ['status'],
  );
  assert.equal(bare.components[0].items.length, 1);
});

test('a park without alert says so', async (t) => {
  const world = await createWorld({ config: { parks: ['yose'] } });
  t.after(() => world.app.stop());
  world.service.park('yose');
  await create(world, 'yose');
  world.service.parks.get('yose').alerts = [];
  const content = await widget(world, { show_summary: false });
  assert.equal(content.components[0].text, 'No alert in the chosen parks.');
});
