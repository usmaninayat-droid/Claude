import { createRoot } from 'react-dom/client';
import { ZonesView } from './components/zones';
import type { ZoneNode } from './components/zones';
import { Toaster, toast } from './components/primitives';
import './styles.css';

/** Standalone Zones demo (served at `/zones.html`). */

const COLORS = ['#7A5AF8', '#12B76A', '#F79009', '#0072D6', '#F04438', '#06AED4', '#854D0E'];

// Irregular polygons following Dubai's real coast + creek — no floating squares.
const ZONES: ZoneNode[] = [
  {
    id: 'z1', name: 'Coastal North', color: COLORS[0], tags: ['Region', 'Coastal', 'Priority'], location: 'Dubai, UAE', description: 'Deira + Bur Dubai, either side of the Creek', visible: true,
    points: [[25.302, 55.295], [25.305, 55.335], [25.288, 55.348], [25.258, 55.340], [25.236, 55.312], [25.232, 55.282], [25.252, 55.268], [25.282, 55.272]],
    children: [
      { id: 'z1a', name: 'Deira', color: COLORS[1], tags: ['District', 'Dense'], location: 'Deira', description: 'High-density district north of the Creek',
        points: [[25.290, 55.300], [25.300, 55.322], [25.290, 55.342], [25.272, 55.336], [25.262, 55.320], [25.269, 55.303]] },
      { id: 'z1b', name: 'Bur Dubai', color: COLORS[2], tags: ['District'], location: 'Bur Dubai', description: 'Historic core south of the Creek',
        points: [[25.270, 55.286], [25.263, 55.301], [25.250, 55.306], [25.239, 55.297], [25.238, 55.283], [25.250, 55.276], [25.262, 55.278]],
        children: [
          { id: 'z1b1', name: 'Al Fahidi', color: COLORS[3], tags: ['Sector'], location: 'Al Fahidi', description: 'Heritage sector',
            points: [[25.262, 55.294], [25.259, 55.302], [25.251, 55.303], [25.249, 55.296], [25.254, 55.291]] },
          { id: 'z1b2', name: 'Mankhool', color: COLORS[5], tags: ['Sector'], location: 'Mankhool', description: 'Mixed-use sector',
            points: [[25.250, 55.283], [25.248, 55.291], [25.241, 55.292], [25.240, 55.284], [25.245, 55.280]] },
        ] },
    ],
  },
  {
    id: 'z2', name: 'Central', color: COLORS[4], tags: ['Region', 'Commercial'], location: 'Dubai, UAE', description: 'Downtown + Business Bay corridor',
    points: [[25.212, 55.258], [25.216, 55.284], [25.200, 55.294], [25.172, 55.286], [25.166, 55.262], [25.184, 55.250]],
    children: [
      { id: 'z2a', name: 'Downtown', color: COLORS[3], tags: ['District', 'Priority'], location: 'Downtown Dubai', description: 'Central business district',
        points: [[25.206, 55.268], [25.210, 55.282], [25.199, 55.290], [25.187, 55.285], [25.185, 55.271], [25.194, 55.263]] },
      { id: 'z2b', name: 'Business Bay', color: COLORS[5], tags: ['District', 'Commercial'], location: 'Business Bay', description: 'Canal-side commercial towers',
        points: [[25.191, 55.256], [25.193, 55.270], [25.181, 55.277], [25.170, 55.268], [25.175, 55.255]] },
    ],
  },
  {
    id: 'z3', name: 'South & Marina', color: COLORS[6], tags: ['Region', 'Industrial'], location: 'Dubai, UAE', description: 'Marina waterfront + Jebel Ali port',
    points: [[25.100, 55.128], [25.105, 55.158], [25.030, 55.135], [24.985, 55.090], [25.010, 55.048], [25.055, 55.070]],
    children: [
      { id: 'z3a', name: 'Dubai Marina', color: COLORS[0], tags: ['District', 'Waterfront'], location: 'Dubai Marina', description: 'Dense waterfront residential',
        points: [[25.096, 55.132], [25.099, 55.150], [25.082, 55.156], [25.070, 55.144], [25.078, 55.130]] },
      { id: 'z3b', name: 'Jebel Ali', color: COLORS[2], tags: ['District', 'Industrial'], location: 'Jebel Ali', description: 'Industrial + port',
        points: [[25.024, 55.062], [25.040, 55.100], [25.018, 55.128], [24.988, 55.116], [24.982, 55.078], [25.002, 55.052]] },
    ],
  },
];

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(
  <>
    <div style={{ height: '100vh' }} className="flex flex-col">
      <div className="flex items-center gap-1 border-b border-border px-4">
        <span className="px-4 py-3 text-body font-semibold text-foreground">Zones</span>
        {['Hybrid View', 'List View', 'Map View'].map((t, i) => (
          <button key={t} type="button" className={`relative px-3 py-3 text-body-sm font-semibold ${i === 0 ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{t}{i === 0 && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}</button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <ZonesView
          zones={ZONES}
          center={[25.18, 55.28]}
          zoom={11}
          onCreateZone={() => toast.success('Create New Zone', { description: 'Draw the zone polygon on the map, then fill its details.' })}
        />
      </div>
    </div>
    <Toaster position="bottom-right" richColors />
  </>,
);
