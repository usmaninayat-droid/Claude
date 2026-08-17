import type { ModuleConfig } from '@ds/components/app-shell';
import { ClipboardCheck } from '@ds/icons';

/**
 * Forms BLOCK — a reusable standalone form surface (the exception to "a module =
 * view + detail + create"). A `forms` module is config: a `ModuleConfig` with
 * `type:'forms'` + a `FormsModuleData` payload (a `FormSchema` the DS renders via
 * SchemaForm). For multi-step, group fields into steps (SteppedSchemaForm).
 *
 * ADAPT: set the `schema.fields` (key · label · type text|select|date · required ·
 * options · span 1|2), the submit action, and the success copy. See forms.block.md.
 */
export const formsBlock: ModuleConfig = {
  id: 'forms',
  type: 'forms',
  label: 'New Request',
  icon: ClipboardCheck,
  data: {
    title: 'New Request',
    description: 'Submit a new request — it lands in the queue for triage.',
    schema: {
      title: 'New Request',
      submitLabel: 'Submit request',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true, span: 2 },
        { key: 'type', label: 'Type', type: 'select', span: 1, options: [
          { label: 'Incident', value: 'incident' },
          { label: 'Request', value: 'request' },
          { label: 'Maintenance', value: 'maintenance' },
        ] },
        { key: 'priority', label: 'Priority', type: 'select', span: 1, options: [
          { label: 'High', value: 'high' },
          { label: 'Medium', value: 'medium' },
          { label: 'Low', value: 'low' },
        ] },
        { key: 'due', label: 'Due date', type: 'date', span: 1 },
        { key: 'location', label: 'Location', type: 'text', span: 1 },
        { key: 'details', label: 'Details', type: 'text', span: 2 },
      ],
    },
    successTitle: 'Request submitted',
    successHint: 'Your request has been received and routed for triage.',
  },
};
