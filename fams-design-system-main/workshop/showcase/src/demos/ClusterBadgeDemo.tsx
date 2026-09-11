import { ClusterBadge, clusterBadgeTier, formatClusterCount, type ClusterBadgeSegment } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const MIX: ClusterBadgeSegment[] = [
  { tone: 'success', count: 62 },
  { tone: 'warning', count: 25 },
  { tone: 'error', count: 13 },
]

const TIERS = [
  { count: 84, note: '≤ 99 → 32px' },
  { count: 512, note: '≤ 999 → 40px' },
  { count: 4823, note: '≤ 9,999 → 48px (comma)' },
  { count: 26514, note: '≤ 99,999 → 56px' },
]

/**
 * ClusterBadgeDemo — the segmented map-cluster badge (live-monitoring Figma
 * component set 551:8483…8510).
 */
export default function ClusterBadgeDemo() {
  return (
    <DocPage
      title="ClusterBadge"
      badge="stable"
      summary="Segmented map-cluster badge — dark count coin inside a donut ring whose arcs are proportional to the cluster's vehicle-status mix. Four size tiers by count magnitude (32/40/48/56px for ≤99 / ≤999 / ≤9,999 / ≤99,999). Pure visual: the map layer that places it owns the click target."
    >
      <DocSection id="preview" title="Size tiers">
        <Prose>
          The tier derives from <Code>count</Code> automatically (<Code>clusterBadgeTier</Code>); counts
          past 999 comma-format (<Code>formatClusterCount</Code>). Each badge here carries the same
          status mix so the ring reads consistently across tiers.
        </Prose>
        <Gallery
          minColRem={10}
          items={TIERS.map(({ count, note }) => ({
            label: `${formatClusterCount(count)} — ${note} (tier ${clusterBadgeTier(count)}px)`,
            node: (
              <ClusterBadge
                count={count}
                segments={MIX.map((s) => ({ ...s, count: Math.round((s.count / 100) * count) }))}
              />
            ),
          }))}
        />
      </DocSection>

      <DocSection id="segments" title="Status mix ring">
        <Prose>
          Ring arcs run clockwise from 12 o’clock in segment order — pass the cluster’s
          moving/idling/stopped counts as <Code>success</Code>/<Code>warning</Code>/<Code>error</Code>{' '}
          tones (non-reporting = <Code>muted</Code>). No segments (or all zero) renders a plain muted
          ring.
        </Prose>
        <Gallery
          minColRem={10}
          items={[
            { label: 'All moving', node: <ClusterBadge count={48} segments={[{ tone: 'success', count: 48 }]} /> },
            {
              label: 'Even three-way mix',
              node: (
                <ClusterBadge
                  count={90}
                  segments={[
                    { tone: 'success', count: 30 },
                    { tone: 'warning', count: 30 },
                    { tone: 'error', count: 30 },
                  ]}
                />
              ),
            },
            {
              label: 'Mostly non-reporting',
              node: (
                <ClusterBadge
                  count={40}
                  segments={[
                    { tone: 'muted', count: 32 },
                    { tone: 'error', count: 8 },
                  ]}
                />
              ),
            },
            { label: 'No segments', node: <ClusterBadge count={12} /> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'count', type: 'number', required: true, description: 'Total members — drives the size tier and the label.' },
            {
              prop: 'segments',
              type: 'ClusterBadgeSegment[]',
              description: 'Status mix as { tone, count } — rendered as proportional ring arcs. Omit for a plain muted ring.',
            },
            {
              prop: 'size',
              type: '32 | 40 | 48 | 56',
              default: 'clusterBadgeTier(count)',
              description: 'Explicit tier override.',
            },
            { prop: '…props', type: 'HTMLAttributes<HTMLSpanElement>', description: 'className and span attributes pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Keep the segment counts equal to the cluster’s real member statuses — the ring is a data readout, not decoration.',
            'Wrap it in the map layer’s own <button> for the expand-on-click behavior (MapPanel’s renderCluster does this).',
            'Let the tier derive from count — override size only in fixed galleries like this page.',
          ]}
          donts={[
            'Don’t make the badge itself interactive — it is a pure visual by design (avoids nested-interactive traps).',
            'Don’t invent new tones — the four VehicleStatusTone values are the whole vocabulary.',
            'Don’t use it off-map as a generic count chip — that is CountChip’s job.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Exposes role="img" with an aria-label ("Cluster of 10,000") — the ring SVG is aria-hidden.',
            'The count is real text (white on grey-900) in both themes, not canvas-drawn.',
            'Status shares are reinforced by the count label and the map’s text-alternative table — never colour alone.',
            'The click target (and its focus ring) belongs to the wrapping map-layer button, sized ≥40px by the marker layer.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
