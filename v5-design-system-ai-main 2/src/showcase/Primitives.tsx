import { Section, Demo, Caption } from './kit';
import {
  Button,
  Badge,
  Avatar,
  Progress,
  Skeleton,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipSupport,
} from '../components';
import { Plus, Search, Settings } from 'lucide-react';

const BTN_VARIANTS = ['primary', 'secondary', 'tertiary', 'ghost', 'destructive', 'link'] as const;
const BADGE_VARIANTS = [
  'default',
  'secondary',
  'outline',
  'success',
  'warning',
  'info',
  'destructive',
  'muted',
] as const;

export function Primitives() {
  return (
    <Section
      id="primitives"
      title="Primitives"
      description="shadcn-style building blocks on Radix UI. Every variant maps to a design token — no inline color."
    >
      <Demo title="Button — variants">
        {BTN_VARIANTS.map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
      </Demo>

      <Demo title="Button — sizes & states">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="add">
          <Plus className="size-4" />
        </Button>
        <Button>
          <Search className="size-4" /> With icon
        </Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
      </Demo>

      <Demo title="Badge — variants">
        {BADGE_VARIANTS.map((v) => (
          <Badge key={v} variant={v}>
            {v}
          </Badge>
        ))}
      </Demo>

      <Demo title="Badge — sizes">
        <Badge size="xs">xs</Badge>
        <Badge size="sm">sm</Badge>
        <Badge size="md">md</Badge>
      </Demo>

      <Demo title="Avatar" hint="sizes xs–xl · status ring">
        <div className="flex items-end gap-3">
          <Avatar size="xs" fallback="XS" />
          <Avatar size="sm" fallback="SM" />
          <Avatar size="md" fallback="MD" status="online" />
          <Avatar size="lg" fallback="LG" status="busy" />
          <Avatar size="xl" fallback="XL" status="offline" />
        </div>
      </Demo>

      <Demo title="Progress" className="flex-col items-stretch">
        <Progress value={32} />
        <Progress value={68} />
        <Progress value={100} />
      </Demo>

      <Demo title="Skeleton" className="flex-col items-stretch">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </Demo>

      <Demo title="Tabs">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="pt-4 text-body-sm text-muted-foreground">
            Overview panel content.
          </TabsContent>
          <TabsContent value="activity" className="pt-4 text-body-sm text-muted-foreground">
            Activity panel content.
          </TabsContent>
          <TabsContent value="settings" className="pt-4 text-body-sm text-muted-foreground">
            Settings panel content.
          </TabsContent>
        </Tabs>
      </Demo>

      <Demo title="Accordion" className="flex-col items-stretch">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="a">
            <AccordionTrigger>What is the FAMS Design System?</AccordionTrigger>
            <AccordionContent>
              A token-driven React component library aligned to the FAMS design system in Figma.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>How is theming handled?</AccordionTrigger>
            <AccordionContent>
              Via CSS variables plus a Tailwind 4 preset. Tenants override a small subset.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Demo>

      <Demo title="Tooltip · Separator" hint="tooltips are dark (Color Mode = Dark) — hover the buttons">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon" aria-label="settings">
                <Settings className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open settings</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary">Rich tooltip</Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px]">
              This is a tooltip
              <TooltipSupport>
                Tooltips are used to describe or identify an element, helping users understand
                meaning, function or alt-text.
              </TooltipSupport>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="flex h-8 items-center gap-3">
          <Caption>Left</Caption>
          <Separator orientation="vertical" />
          <Caption>Right</Caption>
        </div>
      </Demo>
    </Section>
  );
}
