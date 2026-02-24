import { createEffect, Suspense } from 'solid-js';
import AboutData from './about.data';
import TableWithSearch from '../components/TableWithSearch';

import DemoSelects from '../constants/test';
import FormatString from '../components/fields/field-formats/String/FormatStringEdit';
import FormatText from '../components/fields/field-formats/Text/FormatTextEdit';

export default function About() {
  const name = AboutData();

  createEffect(() => {
    console.log(name());
  });

  return (
    <section class="text-gray-700 p-4">
      <h1 class="text-2xl font-bold">About</h1>

      <p class="mt-4">A page all about this website.</p>

      <DemoSelects />

      <FormatText field={{ id: crypto.randomUUID(), default: '', storeData: { placeholder: 'texto largo de placeholder', min: 1, max: 255, formatted: true }, tableIdentifier: 'users', identifier: 'description', name: 'Descripcion', description: 'Descripcion campo de ejemplo', fieldFormat: 'text', multiple: false, isRequired: true, isUnique: false, isEditable: true }} />

      <FormatString field={{ id: crypto.randomUUID(), default: 'string@string.string', storeData: { type: 'email', placeholder: 'solo letras', min: 1, max: 30, regexpError: 'regexp incorrecto' }, tableIdentifier: 'users', identifier: 'email', name: 'Email', description: 'Descripcion de ejemplo', fieldFormat: 'string', multiple: false, isRequired: true, isUnique: true, isEditable: true }} />

      <TableWithSearch></TableWithSearch>

      <p>
        <span>We love</span>
        <Suspense fallback={<span>...</span>}>
          <span>&nbsp;{name()}</span>
        </Suspense>
      </p>
    </section>
  );
}
