import * as React from 'react';
import { Section, Demo } from './kit';
import {
  Input,
  FloatingLabelInput,
  Textarea,
  Checkbox,
  Switch,
  RadioGroup,
  RadioGroupItem,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
  FileUpload,
} from '../components';
import { Mail, Search } from 'lucide-react';

export function Forms() {
  const [checked, setChecked] = React.useState(true);
  const [on, setOn] = React.useState(true);
  const [radio, setRadio] = React.useState('weekly');
  const [fruit, setFruit] = React.useState('');

  return (
    <Section
      id="forms"
      title="Forms & Inputs"
      description="Text fields with labels, hints and error states; the production floating-label variant; selection controls."
    >
      <Demo title="Input" className="flex-col items-stretch gap-5 md:flex-row md:flex-wrap">
        <div className="w-64">
          <Input label="Full name" placeholder="Jane Doe" hint="As it appears on your ID" />
        </div>
        <div className="w-64">
          <Input label="Search" placeholder="Search assets…" leadingIcon={<Search className="size-4" />} />
        </div>
        <div className="w-64">
          <Input label="Email" placeholder="you@fams.ae" error="Enter a valid email address" />
        </div>
      </Demo>

      <Demo title="Floating-label input" hint="production pattern">
        <div className="w-72">
          <FloatingLabelInput label="Email address" leadingIcon={<Mail className="size-4" />} />
        </div>
        <div className="w-72">
          <FloatingLabelInput label="Department" showChevron helperText="Pick from the directory" />
        </div>
      </Demo>

      <Demo title="Textarea">
        <div className="w-full max-w-lg">
          <Textarea label="Notes" placeholder="Add a note…" hint="Markdown supported" rows={3} />
        </div>
      </Demo>

      <Demo title="Select">
        <div className="w-64">
          <Select value={fruit} onValueChange={setFruit}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a site…" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Emirates</SelectLabel>
                <SelectItem value="dxb">Dubai Yard</SelectItem>
                <SelectItem value="auh">Abu Dhabi Depot</SelectItem>
                <SelectItem value="shj">Sharjah Hub</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </Demo>

      <Demo title="Checkbox · Switch">
        <label className="flex items-center gap-2 text-body-sm">
          <Checkbox checked={checked} onCheckedChange={(v) => setChecked(Boolean(v))} />
          Email notifications
        </label>
        <label className="flex items-center gap-2 text-body-sm">
          <Switch checked={on} onCheckedChange={setOn} />
          Live telemetry
        </label>
      </Demo>

      <Demo title="Radio group">
        <RadioGroup value={radio} onValueChange={setRadio} className="flex flex-col gap-2">
          {['daily', 'weekly', 'monthly'].map((v) => (
            <div key={v} className="flex items-center gap-2">
              <RadioGroupItem value={v} id={`freq-${v}`} />
              <Label htmlFor={`freq-${v}`} className="capitalize">
                {v}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </Demo>

      <Demo title="File upload" hint="dropzone + file rows with type icons">
        <FileUpload
          files={[
            { name: 'inspection-report.pdf', ext: 'PDF', size: '2.4 MB' },
            { name: 'fleet-export.xlsx', ext: 'XLSX', size: '880 KB', progress: 64 },
          ]}
        />
      </Demo>
    </Section>
  );
}
