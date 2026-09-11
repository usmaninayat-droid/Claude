import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LeafletMap, type LeafletMapHandle, type MapRoute, type MapZone, type MapMarker,
  type AssetMarkerState,
} from '@ds/components/map'
import {
  VehicleMarker, ClusterBadge, TankerArt, useVehicleClusters, toneForState,
  TONE_TILE_BG, TONE_BADGE_BG, TONE_TEXT, badgeGlyph,
  type VehicleStatusTone,
} from './vehicleMapParity'
import {
  Checkbox, cn, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from '@fams/design-system'
import {
  Search, PanelLeft,
  Tag, MapPin, Play, User, Phone, Gauge, Copy, ExternalLink, X, LocateFixed,
  Users, Map, Droplet, Workflow, TriangleAlert,
  Bell, Plus, Minus, Truck, Radio, AlertCircle,
  ChevronDown, ChevronUp, Check, Sun, Eye, EyeOff,
} from 'lucide-react'
import type { SVGProps } from 'react'
import { RouteCard, type RouteStatus, type RouteData } from '../../components/RouteCard'
import { routes as defaultRoutes } from './routes'
import type { BreakdownReport } from './ReportBreakdownSheet'
import { CustomScrollbar } from '../../components/CustomScrollbar'
import { ZONES, flattenZones, ZONE_TYPE_TINT } from '../zones/zonesData'
import { AB_CLUSTERS, DISCHARGE_POINT } from '../mbr/mbrData'
import { planCards, complaints as seedComplaints, inspectors, vehicles as vehicleFleet } from './gisTabsData'
import type { ComplaintRow, ComplaintStatus } from './gisTabsData'
import {
  PlanCard, ComplaintCard,
  PoiChip, type PoiCategory, POI_CATEGORY_META,
} from './gisTabCards'
import { InspectorsTable, VehiclesTable } from './gisTabTables'
import {
  MapToolDrawer, MAP_TOOL_DRAWER_WIDTH, SelectAllCell, HeaderCell, CheckRow,
  statusDotColor, collectTags, matchesTags,
} from './MapToolDrawer'
import { IncidentDrawerCard, nextComplaintStage } from './gisIncidentRows'
import {
  WEATHER_FORECAST,
  type WeatherForecastDay, type WeatherForecastRow,
  type WeatherDailyRow, type WeatherForecastPanelData,
} from './weatherForecastData'

/* ── GIS map chrome, extracted VERBATIM from the design system ──────────────
 * Source: fams-design-system/packages/v5-templates/src/map/chrome/LiveMapTools.tsx
 * (top-right tool stack — geometry, order, icon set) and
 * fams-design-system/packages/ui-kit/src/domain/map/MapControls.tsx
 * (`MapIconButton` tile anatomy, `MapZoomControl`'s bottom-end pill +
 * fullscreen glyphs, `TILE_BASE`/`MAP_SHADOW`/`GROUP_GAP` constants). The
 * cockpit is a separate vendored React-18 app with no `@fams/ui-kit`
 * dependency, so the SVG paths and layout constants are copied in verbatim
 * rather than imported — this replaces the wrong icons/anatomy a prior pass
 * (commit 77ee423) invented (Radar/Building2/Shapes/CloudRain/ShieldAlert
 * from lucide-react, square-cornered pill, diagonal-arrows Expand icon).
 * Every icon below is the exact glyph the DS control uses for that tool.
 */

/** Figma `Shadow/Map` — 6px 10px 12px rgba(0,0,0,0.05). ui-kit `MapControls.tsx` MAP_SHADOW. */
const MAP_SHADOW = 'shadow-[6px_10px_12px_0_rgba(0,0,0,0.05)]'
/** 40×40 painted tile, 12px inter-tile gap (52px pitch) — ui-kit `TILE_BASE` / `GROUP_GAP`. */
const TOOL_TILE_GAP = 'gap-3'

type GlyphProps = SVGProps<SVGSVGElement>

/** `layers-three-02` — ui-kit/src/icons/glyphs.tsx `SvgLayersThree_02`. */
function LayersThree02Icon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12.1387 1.06575L12.2764 1.08431L12.4482 1.12923C12.6119 1.18236 12.745 1.25467 12.8047 1.2845L22.4473 6.10579C22.786 6.27522 23 6.62161 23 7.00032C22.9998 7.37885 22.7858 7.72451 22.4473 7.89388L19.2354 9.49935L22.4473 11.1058C22.786 11.2752 23 11.6216 23 12.0003C22.9998 12.3788 22.7858 12.7245 22.4473 12.8939L19.2354 14.4993L22.4473 16.1058C22.786 16.2752 23 16.6216 23 17.0003C22.9998 17.3788 22.7858 17.7245 22.4473 17.8939L12.8047 22.7152C12.7252 22.7549 12.515 22.8706 12.2764 22.9154C12.0937 22.9496 11.9063 22.9496 11.7236 22.9154C11.485 22.8706 11.2748 22.7549 11.1953 22.7152L1.55273 17.8939C1.2142 17.7245 1.00016 17.3788 1 17.0003C1 16.6216 1.21405 16.2752 1.55273 16.1058L4.76465 14.4993L1.55273 12.8939C1.2142 12.7245 1.00016 12.3788 1 12.0003C1 11.6216 1.21405 11.2752 1.55273 11.1058L4.76465 9.49935L1.55273 7.89388C1.2142 7.72451 1.00016 7.37885 1 7.00032C1 6.62161 1.21405 6.27522 1.55273 6.10579L11.1953 1.2845C11.2748 1.24475 11.4851 1.12906 11.7236 1.08431L11.8613 1.06575C11.9536 1.05718 12.0464 1.05718 12.1387 1.06575ZM12.8047 17.7152C12.7253 17.7549 12.515 17.8706 12.2764 17.9154C12.0937 17.9496 11.9063 17.9496 11.7236 17.9154C11.485 17.8706 11.2747 17.7549 11.1953 17.7152L7 15.6175L4.23535 16.9993L12 20.8812L19.7637 16.9993L17 15.6175L12.8047 17.7152ZM12.8047 12.7152C12.7253 12.7549 12.515 12.8706 12.2764 12.9154C12.0937 12.9496 11.9063 12.9496 11.7236 12.9154C11.485 12.8706 11.2747 12.7549 11.1953 12.7152L7 10.6175L4.23535 11.9993L12 15.8812L19.7637 11.9993L17 10.6175L12.8047 12.7152ZM4.23535 6.99935L12 10.8812L19.7637 6.99935L12 3.11751L4.23535 6.99935Z" fill="currentColor"/>
    </svg>
  )
}

/** `traffic-lights` — ui-kit/src/icons/glyphs.tsx `SvgTrafficLights`. */
function TrafficLightsIcon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M11.9863 13.0957C13.3643 13.0958 14.4766 14.2079 14.4766 15.5859C14.4761 16.9635 13.364 18.0751 11.9863 18.0752C10.6085 18.0752 9.49655 16.9636 9.49609 15.5859C9.49609 14.2079 10.6083 13.0957 11.9863 13.0957ZM11.54 17.7793C11.6113 17.7936 11.6833 17.807 11.7568 17.8145L11.9863 17.8252C11.8334 17.8252 11.6842 17.8083 11.54 17.7793ZM11.9766 15.0254C11.6646 15.0254 11.4062 15.2838 11.4062 15.5957C11.4066 15.9074 11.6648 16.166 11.9766 16.166C12.2881 16.1658 12.5456 15.9072 12.5459 15.5957C12.5459 15.2839 12.2883 15.0256 11.9766 15.0254ZM14.1807 16.0342C14.1952 15.9624 14.2073 15.8896 14.2148 15.8154L14.2266 15.5859L14.2256 15.585C14.2256 15.7389 14.21 15.8891 14.1807 16.0342ZM9.74609 15.5859L9.75781 15.8154C9.76485 15.8848 9.77491 15.9532 9.78809 16.0205C9.76051 15.8797 9.74609 15.735 9.74609 15.5859ZM12.7959 15.5957L12.792 15.6787C12.7819 15.7768 12.752 15.869 12.71 15.9541C12.7638 15.8452 12.7959 15.7245 12.7959 15.5957ZM11.1562 15.5947C11.1562 15.6229 11.1573 15.6512 11.1602 15.6787L11.1562 15.5947Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M11.9863 6.5752C13.3642 6.57532 14.4765 7.6875 14.4766 9.06543C14.4763 10.4432 13.3641 11.5555 11.9863 11.5557C10.6084 11.5557 9.49636 10.4433 9.49609 9.06543C9.49616 7.68742 10.6083 6.5752 11.9863 6.5752ZM11.5381 11.2598C11.6098 11.2743 11.6827 11.2865 11.7568 11.2939L11.9863 11.3057C11.8328 11.3057 11.6828 11.289 11.5381 11.2598ZM11.9766 8.50586C11.6648 8.50586 11.4065 8.76343 11.4062 9.0752C11.4065 9.38691 11.6648 9.64551 11.9766 9.64551C12.2881 9.64525 12.5456 9.38675 12.5459 9.0752C12.5457 8.76359 12.2882 8.50612 11.9766 8.50586ZM14.1865 8.64062C14.1853 8.63404 14.183 8.62766 14.1816 8.62109C14.1957 8.69161 14.2075 8.76317 14.2148 8.83594L14.1865 8.64062ZM11.9766 8.25488L12.0596 8.25977C12.1088 8.26483 12.1568 8.27361 12.2031 8.28711C12.1311 8.26612 12.055 8.25493 11.9766 8.25488ZM11.7568 6.83594C11.606 6.85118 11.4597 6.8813 11.3193 6.9248C11.2491 6.94656 11.1803 6.97173 11.1133 7C11.3144 6.91516 11.5305 6.85879 11.7568 6.83594ZM14.2266 9.06543L14.2168 8.84961C14.2164 8.84503 14.2153 8.84051 14.2148 8.83594C14.2224 8.91125 14.2266 8.98806 14.2266 9.06543Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M13.085 1.68457C15.3497 1.68457 17.1827 3.506 17.2041 5.76562H20.5654C20.9088 5.76573 21.1918 5.9662 21.334 6.20996H21.3359C21.4675 6.41492 21.4648 6.61969 21.4648 6.69531C21.4648 6.88287 21.416 7.0637 21.3867 7.1709L21.3838 7.18164C21.2964 7.45443 21.1466 7.77265 20.9502 8.10352C20.5533 8.77174 19.8746 9.57612 18.9102 10.1318L18.9092 10.1328C18.0832 10.6062 17.5628 10.8519 17.2295 10.9873L17.2256 10.9883V12.6953H20.4854C20.8292 12.6954 21.1129 12.8964 21.2549 13.1406C21.3864 13.3457 21.3848 13.5506 21.3848 13.626C21.3846 13.8137 21.3358 13.9945 21.3066 14.1016L21.3037 14.1113C21.2164 14.3841 21.0666 14.7023 20.8701 15.0332C20.4732 15.7015 19.7948 16.5067 18.8301 17.0625C18.0566 17.5058 17.5497 17.7483 17.2148 17.8887V18.1953C17.2146 20.4732 15.3726 22.3154 13.0947 22.3154H10.8154C8.53752 22.3154 6.69558 20.4732 6.69531 18.1953V17.8496C6.3619 17.7045 5.87845 17.4675 5.17188 17.0625C4.20673 16.5168 3.52816 15.7033 3.13184 15.0371C2.92108 14.6997 2.78332 14.3801 2.69727 14.1113L2.69824 14.1104C2.65256 13.9723 2.61536 13.8069 2.61523 13.626C2.61523 13.5352 2.62833 13.3466 2.7373 13.1543C2.87533 12.9059 3.15299 12.6953 3.51562 12.6953H6.68555V10.9492C6.35067 10.8076 5.84889 10.5673 5.09082 10.1328C4.12454 9.58618 3.44568 8.77011 3.0498 8.10352C2.84052 7.76763 2.70288 7.44931 2.61719 7.18164L2.61816 7.18066C2.57241 7.04243 2.53522 6.8765 2.53516 6.69531C2.53515 6.62612 2.53537 6.4324 2.65723 6.22461C2.79525 5.97616 3.07291 5.76562 3.43555 5.76562H6.68652C6.7079 3.50616 8.54016 1.68482 10.8047 1.68457H13.085ZM10.4307 22.0449C10.4921 22.051 10.5539 22.0574 10.6162 22.0605L10.8154 22.0654C10.6856 22.0654 10.5572 22.0574 10.4307 22.0449ZM10.7949 3.65527C9.60314 3.6554 8.63483 4.62363 8.63477 5.81543V18.2051C8.63503 19.3967 9.60326 20.3651 10.7949 20.3652H13.0752C14.2669 20.3652 15.2351 19.3968 15.2354 18.2051V5.81543C15.2353 4.62357 14.2671 3.65529 13.0752 3.65527H10.7949ZM18.7051 16.8447C18.3149 17.0684 17.9942 17.2387 17.7314 17.3711C17.8561 17.3083 17.9948 17.239 18.1465 17.1572L18.7051 16.8447ZM4.65527 16.4131C4.80259 16.5304 4.95967 16.6417 5.12598 16.7451C5.18126 16.7795 5.23754 16.8133 5.29492 16.8457C5.06502 16.7157 4.85145 16.5693 4.65527 16.4131ZM4.30566 14.166H6.9248L4.30469 14.165L4.30566 14.166ZM4.7627 14.416C5.05885 14.8312 5.47824 15.2701 6.00879 15.5781L6.59082 15.9004C6.61912 15.9156 6.64775 15.929 6.6748 15.9434V14.416H4.7627ZM17.2949 15.9346C17.4853 15.8336 17.7068 15.7133 17.9619 15.5684L18.1953 15.4229C18.6167 15.1351 18.9569 14.7608 19.209 14.4053H17.2949V15.9346ZM21.0654 14.0352L21.1006 13.8965C21.1027 13.8872 21.1035 13.8776 21.1055 13.8682C21.0926 13.9293 21.0787 13.9863 21.0654 14.0352ZM3.34277 12.9678C3.31389 12.9758 3.28638 12.9864 3.25977 12.998C3.30956 12.9763 3.36339 12.9605 3.4209 12.9521L3.34277 12.9678ZM20.6641 12.9717C20.6886 12.979 20.7123 12.988 20.7354 12.998C20.6858 12.9765 20.6329 12.9605 20.5771 12.9521L20.6641 12.9717ZM18.7852 9.91504C18.3988 10.1365 18.0806 10.3056 17.8193 10.4375C17.942 10.3756 18.0779 10.3067 18.2266 10.2266L18.7852 9.91504ZM5.21484 9.91504C4.98496 9.78508 4.77136 9.63958 4.5752 9.4834C4.72247 9.60074 4.87958 9.71204 5.0459 9.81543C5.10115 9.84977 5.15749 9.88262 5.21484 9.91504ZM4.69238 7.48535C4.98854 7.90071 5.40773 8.34029 5.93848 8.64844L6.52051 8.9707C6.54921 8.98609 6.57804 9.0001 6.60547 9.01465V7.48535H4.69238ZM17.3652 9.01367C17.5555 8.91275 17.7774 8.79224 18.0322 8.64746C18.5617 8.34811 18.9813 7.90416 19.2783 7.48535H17.3652V9.01367ZM20.7354 7.97461C20.6425 8.13091 20.5322 8.29452 20.4072 8.46094C20.4682 8.37974 20.5268 8.30014 20.5801 8.2207L20.7354 7.97461Z" fill="currentColor"/>
    </svg>
  )
}

/** `marker-pin-06` — ui-kit/src/icons/glyphs.tsx `SvgMarkerPin_06` (Live Monitoring's POI glyph). */
function MarkerPin06Icon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M1 17.5C1 16.095 1.93556 14.9731 3.11621 14.1768C4.31895 13.3656 5.95664 12.7573 7.80664 12.3936C8.34855 12.287 8.8749 12.6397 8.98145 13.1816C9.08786 13.7233 8.73496 14.2487 8.19336 14.3555C6.51175 14.6861 5.14858 15.2184 4.23438 15.835C3.29837 16.4664 3 17.0598 3 17.5C3 18.104 3.59197 18.9844 5.33887 19.7705C6.99205 20.5144 9.34649 21 12 21C14.6535 21 17.008 20.5144 18.6611 19.7705C20.408 18.9844 21 18.104 21 17.5C21 17.0598 20.7016 16.4664 19.7656 15.835C18.8514 15.2184 17.4883 14.6861 15.8066 14.3555C15.265 14.2487 14.9121 13.7233 15.0186 13.1816C15.1251 12.6397 15.6514 12.287 16.1934 12.3936C18.0434 12.7573 19.681 13.3656 20.8838 14.1768C22.0644 14.9731 23 16.095 23 17.5C23 19.3812 21.3537 20.7512 19.4814 21.5938C17.5153 22.4785 14.8693 23 12 23C9.13066 23 6.48466 22.4785 4.51855 21.5938C2.64634 20.7512 1 19.3812 1 17.5ZM14 6C14 4.89543 13.1046 4 12 4C10.8954 4 10 4.89543 10 6C10 7.10457 10.8954 8 12 8C13.1046 8 14 7.10457 14 6ZM16 6C16 7.86384 14.7252 9.42998 13 9.87402V17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17V9.87402C9.27477 9.42998 8 7.86384 8 6C8 3.79086 9.79086 2 12 2C14.2091 2 16 3.79086 16 6Z" fill="currentColor"/>
    </svg>
  )
}

/** `zone` — ui-kit/src/icons/glyphs.tsx `SvgZone`. */
function ZonesIcon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M5.14823 1.08379C6.62412 1.0619 7.82965 2.24824 7.94217 3.74395L9.70096 4.19317L9.93729 4.25274L9.52908 6.03008L9.28104 5.96661L7.54178 5.52422C7.22741 6.04937 6.76052 6.45589 6.20877 6.6834L6.73123 17.2264C7.44454 17.4337 8.04643 17.9322 8.40311 18.6043L15.4412 17.2176C15.613 15.9206 16.6023 14.8925 17.8611 14.741L18.7381 10.2879C17.9567 9.81 17.4502 8.96331 17.3758 8.02618L15.4187 7.52911L15.1814 7.46954L15.2361 7.23028L15.5369 5.94122L15.5945 5.69219L17.7801 6.25079C18.3198 5.3557 19.294 4.82991 20.324 4.90313C21.8663 5.01332 23.009 6.40684 22.906 7.9959C22.8076 9.38078 21.7798 10.4946 20.4597 10.6629L19.5828 15.118C20.0747 15.4153 20.4672 15.8634 20.7078 16.4012C21.3481 17.8405 20.7559 19.5633 19.3699 20.243C18.0349 20.8975 16.4677 20.3343 15.7722 19.0184L8.73416 20.4061C8.59019 21.5082 7.85402 22.4427 6.81815 22.785C5.34487 23.2712 3.78502 22.4083 3.3328 20.8807C2.90174 19.4234 3.616 17.8659 4.96756 17.3113L4.4451 6.76934C3.25845 6.42851 2.43025 5.30789 2.41385 4.01934C2.39256 2.42923 3.60569 1.10691 5.14823 1.08379ZM6.0574 18.9412C5.51305 18.899 5.01791 19.3325 4.97537 19.9363C4.93306 20.5389 5.36577 21.0451 5.91385 21.0877C6.46041 21.1265 6.95342 20.6938 6.99588 20.0916C7.03807 19.4893 6.60526 18.984 6.0574 18.9412ZM18.2605 16.5408C17.7163 16.4988 17.221 16.9322 17.1785 17.5359C17.1362 18.1386 17.5698 18.6448 18.118 18.6873C18.6622 18.7293 19.1574 18.2949 19.2 17.6912C19.2421 17.0888 18.8085 16.5834 18.2605 16.5408ZM20.2078 6.71563C19.6635 6.67353 19.1684 7.10702 19.1258 7.71075C19.0835 8.31339 19.517 8.81961 20.0652 8.86211C20.6092 8.904 21.1045 8.47043 21.1472 7.867C21.1897 7.26436 20.7559 6.75826 20.2078 6.71563ZM5.26346 2.91778C4.71908 2.87557 4.22392 3.30997 4.18143 3.91387C4.13926 4.51627 4.57198 5.02157 5.1199 5.06426C5.66415 5.10633 6.15936 4.67288 6.20194 4.06915C6.24432 3.46658 5.81149 2.96049 5.26346 2.91778Z" fill="currentColor"/>
      <path d="M14.8533 5.50762L14.4431 7.28497L12.7293 6.84844L13.1394 5.07208L14.8533 5.50762Z" fill="currentColor"/>
      <path d="M12.3924 4.88262L11.9812 6.65899L10.2683 6.22247L10.6795 4.4461L12.3924 4.88262Z" fill="currentColor"/>
    </svg>
  )
}

/** `cloud-raining-06` — ui-kit/src/icons/glyphs.tsx `SvgCloudRaining_06`. */
function CloudRaining06Icon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M13 20C13.5523 20 14 20.4477 14 21C14 21.5523 13.5523 22 13 22H6C5.44772 22 5 21.5523 5 21C5 20.4477 5.44772 20 6 20H13ZM18 20C18.5523 20 19 20.4477 19 21C19 21.5523 18.5523 22 18 22H16C15.4477 22 15 21.5523 15 21C15 20.4477 15.4477 20 16 20H18ZM7 17C7.55228 17 8 17.4477 8 18C8 18.5523 7.55228 19 7 19H5C4.44772 19 4 18.5523 4 18C4 17.4477 4.44772 17 5 17H7ZM19 17C19.5523 17 20 17.4477 20 18C20 18.5523 19.5523 19 19 19H10C9.44772 19 9 18.5523 9 18C9 17.4477 9.44772 17 10 17H19ZM1 10C1 6.85073 3.42645 4.27005 6.51172 4.02148C7.66356 2.20779 9.68898 1 12 1C14.7138 1 17.0359 2.6629 18.0098 5.02344C20.8083 5.28064 23 7.63432 23 10.5C23 13.5376 20.5376 16 17.5 16H7C3.68629 16 1 13.3137 1 10ZM3 10C3 12.2091 4.79086 14 7 14H17.5C19.433 14 21 12.433 21 10.5C21 8.567 19.433 7 17.5 7C17.4461 7 17.3921 7.00151 17.3389 7.00391C16.8751 7.0246 16.4582 6.72311 16.332 6.27637C15.7989 4.38514 14.0598 3 12 3C10.2524 3 8.73522 3.9961 7.98926 5.45605C7.81516 5.79655 7.46243 6.00829 7.08008 6.00098C7.05355 6.00046 7.02664 6 7 6C4.79086 6 3 7.79086 3 10Z" fill="currentColor"/>
    </svg>
  )
}

/** `alert-octagon` — ui-kit/src/icons/glyphs.tsx `SvgAlertOctagon`. */
function AlertOctagonIcon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M20.998 8.27921C20.9979 8.278 20.997 8.27642 20.997 8.2753C20.9962 8.27449 20.9958 8.27325 20.995 8.27237C20.963 8.23727 20.9167 8.19111 20.8241 8.09855L15.9013 3.17569C15.8087 3.08313 15.7626 3.03683 15.7275 3.0048C15.7262 3.00365 15.7247 3.00288 15.7235 3.00187H15.7206C15.6732 2.99972 15.6079 2.99991 15.4775 2.99991H8.52237C8.39197 2.99991 8.32663 2.99972 8.27921 3.00187C8.27802 3.00192 8.27641 3.00181 8.2753 3.00187C8.27434 3.00274 8.27343 3.00383 8.27237 3.0048C8.23727 3.03683 8.19111 3.08313 8.09855 3.17569L3.17569 8.09855C3.08313 8.19111 3.03683 8.23727 3.0048 8.27237C3.00383 8.27343 3.00274 8.27434 3.00187 8.2753C3.00181 8.27641 3.00192 8.27802 3.00187 8.27921C2.99972 8.32663 2.99991 8.39197 2.99991 8.52237V15.4775C2.99991 15.6079 2.99972 15.6732 3.00187 15.7206V15.7235C3.00288 15.7247 3.00365 15.7262 3.0048 15.7275C3.03683 15.7626 3.08313 15.8087 3.17569 15.9013L8.09855 20.8241C8.19111 20.9167 8.23727 20.963 8.27237 20.995C8.27325 20.9958 8.27449 20.9962 8.2753 20.997C8.27642 20.997 8.278 20.9979 8.27921 20.998C8.32663 21.0001 8.39197 20.9999 8.52237 20.9999H15.4775C15.6079 20.9999 15.6732 21.0001 15.7206 20.998L15.7235 20.997C15.7245 20.9961 15.7264 20.996 15.7275 20.995C15.7626 20.963 15.8087 20.9167 15.9013 20.8241L20.8241 15.9013C20.9167 15.8087 20.963 15.7626 20.995 15.7275C20.996 15.7264 20.9961 15.7245 20.997 15.7235L20.998 15.7206C21.0001 15.6732 20.9999 15.6079 20.9999 15.4775V8.52237C20.9999 8.39197 21.0001 8.32663 20.998 8.27921ZM12.0097 14.9999C12.562 14.9999 13.0097 15.4476 13.0097 15.9999C13.0097 16.5522 12.562 16.9999 12.0097 16.9999H11.9999C11.4476 16.9999 10.9999 16.5522 10.9999 15.9999C10.9999 15.4476 11.4476 14.9999 11.9999 14.9999H12.0097ZM10.9999 11.9999V7.99991C10.9999 7.44763 11.4476 6.99991 11.9999 6.99991C12.5522 6.99991 12.9999 7.44763 12.9999 7.99991V11.9999C12.9999 12.5522 12.5522 12.9999 11.9999 12.9999C11.4476 12.9999 10.9999 12.5522 10.9999 11.9999ZM22.9999 15.4775C22.9999 15.6744 23.0059 15.9355 22.9443 16.1923C22.8953 16.3963 22.8146 16.5915 22.705 16.7704C22.5669 16.9957 22.3775 17.1761 22.2382 17.3153L17.3153 22.2382C17.1761 22.3775 16.9957 22.5669 16.7704 22.705C16.5915 22.8146 16.3963 22.8953 16.1923 22.9443C15.9355 23.0059 15.6744 22.9999 15.4775 22.9999H8.52237C8.32546 22.9999 8.06429 23.0059 7.80753 22.9443C7.6035 22.8953 7.40832 22.8146 7.22941 22.705C7.00413 22.5669 6.82377 22.3775 6.68448 22.2382L1.76163 17.3153C1.62234 17.1761 1.43288 16.9957 1.29484 16.7704C1.18521 16.5915 1.10456 16.3963 1.05558 16.1923C0.993968 15.9355 0.999907 15.6744 0.999914 15.4775V8.52237C0.999907 8.32546 0.993968 8.06429 1.05558 7.80753C1.10456 7.6035 1.18521 7.40832 1.29484 7.22941C1.43288 7.00413 1.62234 6.82377 1.76163 6.68448L6.68448 1.76163C6.82377 1.62234 7.00413 1.43289 7.22941 1.29484C7.40832 1.18521 7.6035 1.10456 7.80753 1.05558C8.06429 0.993968 8.32546 0.999907 8.52237 0.999914H15.4775C15.6744 0.999907 15.9355 0.993968 16.1923 1.05558C16.3963 1.10456 16.5915 1.18521 16.7704 1.29484C16.9957 1.43289 17.1761 1.62234 17.3153 1.76163L22.2382 6.68448C22.3775 6.82377 22.5669 7.00413 22.705 7.22941C22.7872 7.36366 22.8537 7.50676 22.9023 7.65616L22.9443 7.80753L22.9794 7.99991C23.0036 8.19089 22.9999 8.37473 22.9999 8.52237V15.4775Z" fill="currentColor"/>
    </svg>
  )
}

/** `maximize-02` — ui-kit/src/icons/glyphs.tsx `SvgMaximize_02` (corner-brackets fullscreen glyph). */
function Maximize02Icon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M2 16.2002V16C2 15.4477 2.44772 15 3 15C3.55229 15 4 15.4477 4 16V16.2002C4 17.0566 4.00035 17.6388 4.03711 18.0889C4.07293 18.5273 4.13809 18.7518 4.21778 18.9082C4.40951 19.2845 4.71555 19.5905 5.0918 19.7822C5.2482 19.8619 5.47272 19.9271 5.91113 19.9629C6.36117 19.9997 6.94342 20 7.79981 20H8C8.55229 20 9 20.4477 9 21C9 21.5523 8.55229 22 8 22H7.79981C6.97632 22 6.29843 22.001 5.74805 21.9561C5.18599 21.9101 4.6689 21.8117 4.1836 21.5645C3.43109 21.181 2.81902 20.5689 2.43555 19.8164C2.18827 19.3311 2.08988 18.814 2.04395 18.252C1.99898 17.7016 2 17.0237 2 16.2002ZM20 16.2002V16C20 15.4477 20.4477 15 21 15C21.5523 15 22 15.4477 22 16V16.2002C22 17.0237 22.001 17.7016 21.9561 18.252C21.9101 18.814 21.8117 19.3311 21.5645 19.8164C21.181 20.5689 20.5689 21.181 19.8164 21.5645C19.3311 21.8117 18.814 21.9101 18.252 21.9561C17.7016 22.001 17.0237 22 16.2002 22H16C15.4477 22 15 21.5523 15 21C15 20.4477 15.4477 20 16 20H16.2002C17.0566 20 17.6388 19.9997 18.0889 19.9629C18.5273 19.9271 18.7518 19.8619 18.9082 19.7822C19.2845 19.5905 19.5905 19.2845 19.7822 18.9082C19.8619 18.7518 19.9271 18.5273 19.9629 18.0889C19.9997 17.6388 20 17.0566 20 16.2002ZM2 8V7.79981C2 6.97632 1.99898 6.29843 2.04395 5.74805C2.08988 5.18599 2.18827 4.6689 2.43555 4.1836C2.81902 3.43109 3.43109 2.81902 4.1836 2.43555C4.6689 2.18827 5.18599 2.08988 5.74805 2.04395C6.29843 1.99898 6.97632 2 7.79981 2H8C8.55229 2 9 2.44772 9 3C9 3.55229 8.55229 4 8 4H7.79981C6.94342 4 6.36117 4.00035 5.91113 4.03711C5.47272 4.07293 5.2482 4.13809 5.0918 4.21778C4.71555 4.40951 4.40951 4.71555 4.21778 5.0918C4.13809 5.2482 4.07293 5.47272 4.03711 5.91113C4.00035 6.36117 4 6.94342 4 7.79981V8C4 8.55229 3.55229 9 3 9C2.44772 9 2 8.55229 2 8ZM20 8V7.79981C20 6.94342 19.9997 6.36117 19.9629 5.91113C19.9271 5.47272 19.8619 5.2482 19.7822 5.0918C19.5905 4.71555 19.2845 4.40951 18.9082 4.21778C18.7518 4.13809 18.5273 4.07293 18.0889 4.03711C17.6388 4.00035 17.0566 4 16.2002 4H16C15.4477 4 15 3.55229 15 3C15 2.44772 15.4477 2 16 2H16.2002C17.0237 2 17.7016 1.99898 18.252 2.04395C18.814 2.08988 19.3311 2.18827 19.8164 2.43555C20.5689 2.81902 21.181 3.43109 21.5645 4.1836C21.8117 4.6689 21.9101 5.18599 21.9561 5.74805C22.001 6.29843 22 6.97632 22 7.79981V8C22 8.55229 21.5523 9 21 9C20.4477 9 20 8.55229 20 8Z" fill="currentColor"/>
    </svg>
  )
}

/** `minimize-02` — ui-kit/src/icons/glyphs.tsx `SvgMinimize_02` (exit-fullscreen glyph). */
function Minimize02Icon(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M6.99976 21V20.7998C6.99976 19.9434 6.99941 19.3612 6.96265 18.9111C6.92683 18.4727 6.86167 18.2482 6.78198 18.0918C6.59025 17.7155 6.28421 17.4095 5.90796 17.2178C5.75156 17.1381 5.52704 17.0729 5.08862 17.0371C4.63859 17.0003 4.05634 17 3.19995 17H2.99976C2.44747 17 1.99976 16.5523 1.99976 16C1.99976 15.4477 2.44747 15 2.99976 15H3.19995C4.02344 15 4.70133 14.999 5.25171 15.0439C5.81377 15.0899 6.33086 15.1883 6.81616 15.4355C7.56867 15.819 8.18074 16.4311 8.56421 17.1836C8.81148 17.6689 8.90988 18.186 8.95581 18.748C9.00078 19.2984 8.99976 19.9763 8.99976 20.7998V21C8.99976 21.5523 8.55204 22 7.99976 22C7.44747 22 6.99976 21.5523 6.99976 21ZM14.9998 21V20.7998C14.9998 19.9763 14.9987 19.2984 15.0437 18.748C15.0896 18.186 15.188 17.6689 15.4353 17.1836C15.8188 16.4311 16.4308 15.819 17.1833 15.4355C17.6687 15.1883 18.1857 15.0899 18.7478 15.0439C19.2982 14.999 19.9761 15 20.7996 15H20.9998C21.552 15 21.9998 15.4477 21.9998 16C21.9998 16.5523 21.552 17 20.9998 17H20.7996C19.9432 17 19.3609 17.0003 18.9109 17.0371C18.4725 17.0729 18.248 17.1381 18.0916 17.2178C17.7153 17.4095 17.4093 17.7155 17.2175 18.0918C17.1378 18.2482 17.0727 18.4727 17.0369 18.9111C17.0001 19.3612 16.9998 19.9434 16.9998 20.7998V21C16.9998 21.5523 16.552 22 15.9998 22C15.4475 22 14.9998 21.5523 14.9998 21ZM6.99976 3.2002V3C6.99976 2.44772 7.44747 2 7.99976 2C8.55204 2 8.99976 2.44772 8.99976 3V3.2002C8.99976 4.02369 9.00078 4.70157 8.95581 5.25195C8.90988 5.81401 8.81148 6.3311 8.56421 6.81641C8.18074 7.56891 7.56867 8.18098 6.81616 8.56445C6.33086 8.81173 5.81377 8.91013 5.25171 8.95605C4.70133 9.00102 4.02344 9 3.19995 9H2.99976C2.44747 9 1.99976 8.55228 1.99976 8C1.99976 7.44772 2.44747 7 2.99976 7H3.19995C4.05634 7 4.63859 6.99965 5.08862 6.96289C5.52704 6.92707 5.75156 6.86192 5.90796 6.78223C6.28421 6.59049 6.59025 6.28446 6.78198 5.9082C6.86167 5.7518 6.92683 5.52728 6.96265 5.08887C6.99941 4.63883 6.99976 4.05659 6.99976 3.2002ZM14.9998 3.2002V3C14.9998 2.44772 15.4475 2 15.9998 2C16.552 2 16.9998 2.44772 16.9998 3V3.2002C16.9998 4.05659 17.0001 4.63883 17.0369 5.08887C17.0727 5.52728 17.1378 5.7518 17.2175 5.9082C17.4093 6.28446 17.7153 6.59049 18.0916 6.78223C18.248 6.86192 18.4725 6.92707 18.9109 6.96289C19.3609 6.99965 19.9432 7 20.7996 7H20.9998C21.552 7 21.9998 7.44772 21.9998 8C21.9998 8.55228 21.552 9 20.9998 9H20.7996C19.9761 9 19.2982 9.00102 18.7478 8.95605C18.1857 8.91013 17.6687 8.81173 17.1833 8.56445C16.4308 8.18098 15.8188 7.56891 15.4353 6.81641C15.188 6.3311 15.0896 5.81401 15.0437 5.25195C14.9987 4.70157 14.9998 4.02369 14.9998 3.2002Z" fill="currentColor"/>
    </svg>
  )
}

/**
 * ToolTile — LiveMapTools' `ToolButton` / ui-kit `MapIconButton` tile
 * anatomy, copied verbatim: 40×40 painted box, radius `rounded-md`,
 * `Shadow/Map`, resting = white/gray-700 glyph, pressed/active = primary
 * tile with a white glyph. `active` drives both the paint and `aria-pressed`.
 */
function ToolTile({
  label, active, onClick, children,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      data-slot="map-icon-button"
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-md outline-none [&_svg]:size-5',
        'focus-visible:ring-2 focus-visible:ring-ring',
        MAP_SHADOW,
        active ? 'bg-primary text-white hover:bg-primary/90' : 'bg-card text-gray-700 hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

/* ── Basemap switcher, extracted VERBATIM from the design system ────────────
 * Source: fams-design-system/packages/v5-templates/src/map/chrome/
 * LiveMapTools.tsx's `layers` case (renders ui-kit's `MapLayersSwitcher`) and
 * fams-design-system/packages/ui-kit/src/domain/map/MapControls.tsx's
 * `MapLayersSwitcher` (the hover-row anatomy/geometry: a fixed 44×44
 * (`size-11`) wrapper, a collapsed trigger painting the CURRENT style's
 * preview thumbnail behind a white Layers glyph, and — on hover/focus — an
 * absolute row fanning the OTHER style cards out to the start side (selected
 * card stays in the trigger slot), each card `size-11` with a
 * `border-2 border-primary` ring when selected and a bottom `Tooltip` naming
 * the style (ui-kit `MapControls.tsx` ~L612-639) — no caption strip. Escape
 * latches the row shut. The SIX-style set, order, ids, and labels are copied
 * verbatim from `LiveMapTools.tsx`'s `LIVE_MAP_BASEMAP_STYLES` (Grayscale/
 * OSM/Roadmap/Satellite/Terrain/Hybrid, `muted`/Grayscale the default resting
 * style). The per-style thumbnail is `fams-design-system/packages/
 * v5-templates/src/map/chrome/LiveBasemapPreview.tsx`'s fallback path: no
 * raster image asset, a palette-driven vector miniature (water/park/blocks/
 * roads) — its six `PALETTES` entries are copied verbatim below and mapped
 * onto the cockpit's six real, key-free Leaflet raster tile sources (the DS
 * source is MapLibre/vector and has no tile URLs of its own to reuse):
 * Grayscale→Carto Positron, OSM→OSM standard, Roadmap→Carto Voyager,
 * Satellite→Esri World Imagery, Terrain→OpenTopoMap, Hybrid→Carto Dark
 * Matter (its DS palette is already dark-toned, so Dark Matter is the
 * closest key-free equivalent).
 */

/** LiveBasemapPreviewVariant — copied verbatim from LiveBasemapPreview.tsx. */
type BasemapPaletteId = 'grayscale' | 'osm' | 'roadmap' | 'satellite' | 'terrain' | 'hybrid'

/** One selectable basemap: a real Leaflet tile source + its DS-palette preview. */
interface BasemapStyle {
  id: string
  label: string
  tileUrl: string
  tileAttribution: string
  /** `LiveBasemapPreviewVariant` id — selects the palette below. */
  paletteId: BasemapPaletteId
  /** Optional CSS filter applied to the raster tile layer — used when the
   *  underlying source has no key-free style variant of its own (see
   *  PROVENANCE comment below `BASEMAP_STYLES`). */
  tileFilter?: string
}

/** LiveBasemapPreview.tsx `PALETTES` — copied verbatim, all six variants. */
const BASEMAP_PALETTES: Record<BasemapPaletteId, {
  land: string; water: string; park: string; block: string; road: string; street: string
}> = {
  grayscale: {
    land: 'rgb(242,242,242)', water: 'rgb(213,213,213)', park: 'rgb(228,228,228)',
    block: 'rgb(220,220,220)', road: 'rgb(255,255,255)', street: 'rgb(190,190,190)',
  },
  osm: {
    land: 'rgb(242,239,233)', water: 'rgb(170,211,223)', park: 'rgb(200,230,160)',
    block: 'rgb(224,220,211)', road: 'rgb(255,255,255)', street: 'rgb(247,206,123)',
  },
  roadmap: {
    land: 'rgb(249,245,237)', water: 'rgb(174,224,244)', park: 'rgb(215,239,196)',
    block: 'rgb(236,231,220)', road: 'rgb(255,255,255)', street: 'rgb(227,217,198)',
  },
  satellite: {
    land: 'rgb(74,68,51)', water: 'rgb(18,49,76)', park: 'rgb(57,96,44)',
    block: 'rgb(93,86,69)', road: 'rgb(142,135,118)', street: 'rgb(110,103,84)',
  },
  terrain: {
    land: 'rgb(239,231,216)', water: 'rgb(168,203,222)', park: 'rgb(183,206,154)',
    block: 'rgb(222,210,186)', road: 'rgb(255,255,255)', street: 'rgb(199,179,148)',
  },
  hybrid: {
    land: 'rgb(60,58,49)', water: 'rgb(18,48,73)', park: 'rgb(51,86,42)',
    block: 'rgb(78,75,62)', road: 'rgb(242,233,200)', street: 'rgb(154,147,132)',
  },
}

/**
 * Weather station snapshot — verbatim mirror of `tenants/uccp/seeds/
 * rain-sensors.seed.json`'s RSN-01..14 rows (id/title→name/lat+lng→
 * position/systemcol2→tempC/readingRainfallTile→rainMm), so the GIS map's
 * weather layer agrees with the rain-sensors seed for the same station.
 */
/**
 * Per-station readings carry BOTH sources' values (Live Monitoring's own
 * `weatherForecast` data ships an `openMeteo` hourly array and a separate
 * `qmd` daily array that disagree with each other by design — two different
 * models reading the same sky). The cockpit mirrors that shape at the
 * per-station level: `openMeteo` is the seed reading (rain-sensors.seed.json
 * verbatim, see comment above); `qmd` is QMD's own take on the same station,
 * a deterministic +/- delta so the source toggle visibly changes the marker
 * chips rather than relabeling identical numbers.
 */
interface WeatherStationReadingBySource { tempC: number; rainMm: number | undefined }
interface WeatherStationDatum {
  id: string
  name: string
  position: [number, number]
  openMeteo: WeatherStationReadingBySource
  qmd: WeatherStationReadingBySource
}
type WeatherSourceId = 'open-meteo' | 'qmd'
function qmdVariant(tempC: number, rainMm: number | undefined): WeatherStationReadingBySource {
  return {
    tempC: Math.round((tempC - 0.6) * 10) / 10,
    rainMm: rainMm === undefined ? undefined : Math.round((rainMm * 1.15 + 0.4) * 10) / 10,
  }
}
function station(id: string, name: string, position: [number, number], tempC: number, rainMm: number | undefined): WeatherStationDatum {
  return { id, name, position, openMeteo: { tempC, rainMm }, qmd: qmdVariant(tempC, rainMm) }
}
const WEATHER_STATIONS: WeatherStationDatum[] = [
  station('RSN-01', 'Qatar University', [25.382, 51.479], 38.85, 1.9),
  station('RSN-02', 'Hamad International Airport', [25.2731, 51.6086], 37.11, 0.8),
  station('RSN-03', 'Al Khor', [25.6804, 51.4964], 40.08, 14.7),
  station('RSN-04', 'Dukhan', [25.4147, 50.7822], 37.11, 0),
  station('RSN-05', 'Mesaieed', [24.9925, 51.5493], 38.29, 0),
  station('RSN-06', 'Al Wakrah', [25.1659, 51.6039], 38.72, 0),
  station('RSN-07', 'Lusail', [25.4283, 51.4909], 37.4, 5),
  station('RSN-08', 'Al Shamal', [26.1197, 51.2158], 37.74, 32.3),
  station('RSN-09', 'Umm Salal', [25.4067, 51.4067], 38.54, 2.3),
  station('RSN-10', 'Al Rayyan', [25.2919, 51.4244], 39.86, 2.1),
  station('RSN-11', 'Abu Samra', [24.5686, 50.8378], 38.73, 0),
  station('RSN-12', 'Ras Laffan', [25.912, 51.5747], 38.2, 18.2),
  station('RSN-13', 'Doha Port', [25.2769, 51.5497], 37.83, 2.7),
  station('RSN-14', 'Al Sadd', [25.2751, 51.5106], 37.34, 2.6),
]

/** `weather-color.ts`'s `RainBand`/`rainBand`/`rainBandColor` copied
 *  verbatim (thresholds + green→orange→red→dark-red scale). */
type RainBand = 'calm' | 'moderate' | 'heavy' | 'extreme' | 'unknown'
const RAIN_MM_BAND_THRESHOLDS = { moderate: 3, heavy: 10, extreme: 30 } as const
function rainBand(mm: number | undefined | null): RainBand {
  if (typeof mm !== 'number' || !isFinite(mm)) return 'unknown'
  if (mm >= RAIN_MM_BAND_THRESHOLDS.extreme) return 'extreme'
  if (mm >= RAIN_MM_BAND_THRESHOLDS.heavy) return 'heavy'
  if (mm >= RAIN_MM_BAND_THRESHOLDS.moderate) return 'moderate'
  return 'calm'
}
function rainBandColor(band: RainBand): string {
  switch (band) {
    case 'extreme': return 'var(--destructive-emphasis, #d92d20)'
    case 'heavy': return 'var(--status-error, #f04438)'
    case 'moderate': return 'var(--status-warning, #f79009)'
    case 'calm': return 'var(--status-success, #12b76a)'
    default: return 'var(--gray-400, #667085)'
  }
}
/** `stationRainMarkerLabel` — caps an off-scale flood reading at "30+". */
function rainMarkerLabel(mm: number): string {
  return mm >= RAIN_MM_BAND_THRESHOLDS.extreme ? '30+' : mm.toFixed(1)
}

/* ── Weather bar (LM parity, 2026-09-01) — extracted VERBATIM from the
 * design system's `WeatherForecastPanel.tsx` collapsed anatomy: Source:
 * fams-design-system/packages/v5-templates/src/map/WeatherForecastPanel.tsx
 * `RainLegend` + `ModelTabs`. Two content-sized floating pills, right-aligned
 * over the map — the rain-intensity legend (green→amber→red mm gradient) and
 * the dark Open-Meteo/QMD source-toggle pill with its collapse chevron.
 * Chevron here toggles the same station markers' source (`weatherSource`)
 * feeding the legend's own read, rather than opening LM's full hourly/daily
 * timeline grid — the cockpit has no per-station forecast table to expand
 * into, so "expanded" collapses back to the resting pills (a two-state
 * toggle, same chevron glyphs/aria contract as LM's `ModelTabs`).
 */
const WEATHER_LEGEND_STOPS = ['1.5', '2', '3', '7', '10', '20', '30']

function RainLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex h-6 items-center overflow-hidden rounded-md text-[11px] font-semibold text-white', className)}
      style={{
        background:
          'linear-gradient(90deg, var(--color-muted-foreground) 0%, var(--color-success) 30%, var(--color-warning) 62%, var(--color-destructive) 88%, var(--color-primary) 100%)',
      }}
      aria-label="Rain intensity legend (mm)"
    >
      <span className="px-2">mm</span>
      {WEATHER_LEGEND_STOPS.map((s) => (
        <span key={s} className="min-w-8 px-1 text-center">
          {s}
        </span>
      ))}
      <span className="w-1.5" aria-hidden />
    </div>
  )
}

const WEATHER_SOURCE_LABELS: Record<WeatherSourceId, string> = { 'open-meteo': 'Open-Meteo', qmd: 'QMD' }
const WEATHER_SOURCES: WeatherSourceId[] = ['open-meteo', 'qmd']

function WeatherSourceTabs({
  source, onSource, expanded, onToggle,
}: {
  source: WeatherSourceId
  onSource: (s: WeatherSourceId) => void
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-900 px-1.5 py-1 text-white shadow-md">
      {WEATHER_SOURCES.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onSource(id)}
          aria-pressed={source === id}
          className={cn(
            'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            source === id ? 'bg-primary text-primary-foreground' : 'text-white/80 hover:bg-white/10 hover:text-white',
          )}
        >
          {WEATHER_SOURCE_LABELS[id]}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-white/20" aria-hidden />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse forecast panel' : 'Expand forecast panel'}
        className="grid size-7 place-items-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
      >
        {expanded ? <ChevronDown aria-hidden className="size-4" /> : <ChevronUp aria-hidden className="size-4" />}
      </button>
    </div>
  )
}

/**
 * WeatherBar — Live Monitoring's `WeatherForecastPanel`
 * (`fams-design-system/packages/v5-templates/src/map/WeatherForecastPanel
 * .tsx`), copied verbatim onto the cockpit's vendored primitives.
 *
 * COLLAPSED: two content-sized pills only, right-aligned, no strip and no
 * wrapper chrome (`pointer-events-auto flex items-center justify-end gap-2`).
 *
 * EXPANDED: `pointer-events-auto flex w-full flex-col gap-1.5` — the legend
 * (`w-64`) + model tabs float above, end-aligned, and below them a FULL-WIDTH
 * card on the map's bottom edge: the row-label rail on the start side, the
 * horizontally scrolling timeline columns in the middle, the "About Location"
 * rail at the end, and the play/replay scrubber underneath.
 *
 * PROVENANCE (2026-09-01, fix #3). The expanded panel used to be a
 * cockpit-invented per-STATION table (Station · Rain · Temperature · Band
 * over the 14 rain sensors) — four rows where Live Monitoring shows six, and
 * an "About Network" summary where LM shows "About Location". LM's expanded
 * bar is a TIMELINE, not a station table: the Open-Meteo tab lays out 10 days
 * x 3 hour columns with Hours / sky glyph / Temperature °C / Rain mm / Rain
 * Chance % / Wind km/h, the QMD tab lays out its 10-day official outlook, and
 * the right rail carries the location's coordinates, sunrise, sunset and
 * elevation. That is what is rendered here now, over the SAME forecast object
 * LM feeds its own panel (`weatherForecastData.ts` — copied from the
 * live-monitoring blueprint's `uiConfig.map.weather.forecast`), so the two
 * surfaces show identical numbers. The rain STATIONS the map's markers draw
 * are unchanged: they already mirror `rain-sensors.seed.json` 1:1 with LM.
 */

/** `WeatherForecastPanel`'s `rainTone` — data colour → status tokens. */
function rainTone(mm: number): string | undefined {
  if (mm <= 0) return undefined
  if (mm < 2) return 'var(--color-info, var(--color-primary))'
  if (mm < 8) return 'var(--color-warning)'
  return 'var(--color-destructive)'
}

function windToneClass(kmh: number): string {
  if (kmh < 12) return 'bg-success'
  if (kmh < 27) return 'bg-warning'
  return 'bg-destructive'
}

/** One label + unit cell in the expanded panel's row rail. */
function RowLabel({ children, unit }: { children: React.ReactNode; unit?: string }) {
  return (
    <div className="flex h-8 items-center justify-between gap-2 pr-2 text-[11px] text-muted-foreground">
      <span className="truncate">{children}</span>
      {unit ? <span className="shrink-0 font-semibold">{unit}</span> : null}
    </div>
  )
}

/** Sky glyph derived from the row's own numbers (no separate condition field). */
function SkyGlyph({ hour }: { hour: WeatherForecastRow }) {
  if (hour.precipitationMm > 0 || hour.precipitationChance >= 40) {
    return <CloudRaining06Icon className="size-4 text-muted-foreground" />
  }
  return <Sun aria-hidden className="size-4 text-warning" />
}

const OPEN_METEO_ROWS = [
  { label: 'Hours', unit: '' },
  { label: '', unit: '' },
  { label: 'Temperature', unit: '°C' },
  { label: 'Rain', unit: 'mm' },
  { label: 'Rain Chance', unit: '%' },
  { label: 'Wind', unit: 'km/h' },
]

/** Open-Meteo hourly timeline: day headers spanning their hour cells. */
function OpenMeteoGrid({ days, cursor }: { days: WeatherForecastDay[]; cursor: number }) {
  const flat = days.flatMap((d) => d.hours)
  const bounds: number[] = []
  let acc = 0
  for (const d of days) {
    acc += d.hours.length
    bounds.push(acc)
  }
  const rows: { key: string; render: (c: WeatherForecastRow) => React.ReactNode }[] = [
    { key: 'hours', render: (c) => <span className="text-[11px] text-muted-foreground">{c.time}</span> },
    { key: 'sky', render: (c) => <SkyGlyph hour={c} /> },
    { key: 'temp', render: (c) => <span className="text-[11px] font-semibold text-foreground">{Math.round(c.tempC)}°</span> },
    {
      key: 'rain',
      render: (c) => (
        <span className="text-[11px] font-semibold" style={{ color: rainTone(c.precipitationMm) ?? 'var(--color-muted-foreground)' }}>
          {c.precipitationMm > 0 ? c.precipitationMm : 0}
        </span>
      ),
    },
    {
      key: 'chance',
      render: (c) => (
        <span className={cn('text-[11px]', c.precipitationChance > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
          {c.precipitationChance}
        </span>
      ),
    },
    {
      key: 'wind',
      render: (c) => (
        <span className={cn('flex h-3.5 w-9 items-center justify-center rounded-sm text-[11px] font-semibold text-white', windToneClass(c.windKmh))}>
          {Math.round(c.windKmh)}
        </span>
      ),
    },
  ]
  return (
    <div className="min-w-max" data-slot="weather-forecast-open-meteo">
      <div className="flex border-b border-border">
        {days.map((d) => (
          <div
            key={d.day}
            className="shrink-0 border-e border-border py-1.5 text-center text-[11px] font-semibold text-foreground"
            style={{ width: `${d.hours.length * 4}rem` }}
          >
            {d.day}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.key} className="flex">
          {flat.map((c, i) => (
            <div
              key={i}
              className={cn(
                'flex h-8 shrink-0 items-center justify-center',
                bounds.includes(i + 1) && 'border-e border-border',
                i === cursor && 'bg-primary/10',
              )}
              style={{ width: '4rem' }}
            >
              {row.render(c)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

const QMD_ROWS = [
  { label: 'Official Outlook', unit: '' },
  { label: 'Rain', unit: 'mm' },
  { label: 'Min Temp', unit: '°C' },
  { label: 'Max Temp', unit: '°C' },
  { label: 'Range', unit: '' },
]

/** QMD 10-day official outlook: one column per day. */
function QmdGrid({ days, cursor }: { days: WeatherDailyRow[]; cursor: number }) {
  const rows: { key: string; render: (d: WeatherDailyRow) => React.ReactNode }[] = [
    {
      key: 'outlook',
      render: (d) => (
        <span className={cn('text-[11px] font-semibold', /rain|storm|thunder/i.test(d.warning) ? 'text-destructive' : 'text-foreground')}>
          {d.warning}
        </span>
      ),
    },
    {
      key: 'rain',
      render: (d) =>
        d.rainMm === undefined ? (
          <span className="text-[11px] text-muted-foreground">–</span>
        ) : (
          <span className="text-[11px] font-semibold" style={{ color: rainTone(d.rainMm) ?? 'var(--color-muted-foreground)' }}>
            {d.rainMm > 0 ? d.rainMm : 0}
          </span>
        ),
    },
    { key: 'min', render: (d) => <span className="text-[11px] text-foreground">{d.minC.toFixed(1)}°</span> },
    { key: 'max', render: (d) => <span className="text-[11px] font-semibold text-foreground">{d.maxC.toFixed(1)}°</span> },
    {
      key: 'range',
      render: (d) => (
        <span aria-hidden className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <span
            className="absolute inset-y-0 rounded-full bg-primary"
            style={{
              insetInlineStart: `${Math.max(0, Math.min(100, ((d.minC - 20) / 30) * 100))}%`,
              inlineSize: `${Math.max(6, Math.min(100, ((d.maxC - d.minC) / 30) * 100))}%`,
            }}
          />
        </span>
      ),
    },
  ]
  return (
    <div className="min-w-max" data-slot="weather-forecast-qmd">
      <div className="flex border-b border-border">
        {days.map((d) => (
          <div key={d.date} className="shrink-0 border-e border-border py-1.5 text-center text-[11px] font-semibold text-foreground" style={{ width: '6.75rem' }}>
            {d.date}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.key} className="flex">
          {days.map((d, i) => (
            <div
              key={d.date}
              className={cn('flex h-8 shrink-0 items-center justify-center border-e border-border', i === cursor && 'bg-primary/10')}
              style={{ width: '6.75rem' }}
            >
              {row.render(d)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** LM's "About Location" rail — label, coordinates, sunrise, sunset, elevation. */
function AboutLocation({ data }: { data: WeatherForecastPanelData }) {
  const loc = data.location
  if (!loc) return null
  const rows: Array<[string, string | undefined]> = [
    ['', loc.coordinates],
    ['Sunrise', loc.sunrise],
    ['Sunset', loc.sunset],
    ['Elevation', loc.elevation],
  ]
  return (
    <div className="w-44 shrink-0 border-s border-border py-3 pl-4 pr-3">
      <div className="mb-2 text-sm font-semibold text-foreground">About Location</div>
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-medium text-foreground">{loc.label}</div>
        {rows.map(([label, value], i) =>
          value ? (
            <div key={i} className="text-[11px] text-muted-foreground">
              {label ? (
                <>
                  {label}: <span className="font-medium text-foreground">{value}</span>
                </>
              ) : (
                value
              )}
            </div>
          ) : null,
        )}
      </div>
    </div>
  )
}

/** LM's `useReplay` — the timeline scrubber's cursor/play state. */
function useReplay(stepCount: number) {
  const [cursor, setCursor] = useState(-1) // -1 = idle, nothing highlighted
  const [playing, setPlaying] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
  }, [])

  const play = useCallback(() => {
    stop()
    // Replay semantics: finished/idle restarts from 0; paused midway resumes.
    setCursor((c) => (c < 0 || c >= stepCount - 1 ? 0 : c))
    setPlaying(true)
    timer.current = setInterval(() => {
      setCursor((c) => {
        if (c >= stepCount - 1) {
          stop()
          return c
        }
        return c + 1
      })
    }, 450)
  }, [stepCount, stop])

  useEffect(() => stop, [stop])
  useEffect(() => {
    setCursor(-1)
    stop()
  }, [stepCount, stop])

  return { cursor, playing, toggle: () => (playing ? stop() : play()) }
}

function ReplayBar({
  cursor, playing, stepCount, onToggle,
}: {
  cursor: number; playing: boolean; stepCount: number; onToggle: () => void
}) {
  const pct = stepCount <= 0 || cursor < 0 ? 0 : ((cursor + 1) / stepCount) * 100
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? 'Pause forecast replay' : 'Play forecast replay'}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        {playing ? (
          <span className="flex gap-0.5" aria-hidden>
            <span className="h-3 w-1 rounded-sm bg-foreground" />
            <span className="h-3 w-1 rounded-sm bg-foreground" />
          </span>
        ) : (
          <Play aria-hidden className="size-3.5" />
        )}
      </button>
      <div
        className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Forecast timeline"
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function WeatherBar({
  source, onSource, expanded, onToggle, className,
}: {
  source: WeatherSourceId
  onSource: (s: WeatherSourceId) => void
  expanded: boolean
  onToggle: () => void
  className?: string
}) {
  const data = WEATHER_FORECAST
  const days = data.openMeteo ?? []
  const qmd = data.qmd ?? []
  const isDaily = source === 'qmd'
  const stepCount = isDaily ? qmd.length : days.reduce((n, d) => n + d.hours.length, 0)
  const { cursor, playing, toggle } = useReplay(stepCount)

  const rows = isDaily ? QMD_ROWS : OPEN_METEO_ROWS
  const empty = isDaily ? qmd.length === 0 : days.length === 0

  if (!expanded) {
    return (
      <div
        data-slot="weather-bar"
        className={cn('pointer-events-auto flex items-center justify-end gap-2', className)}
      >
        <RainLegend />
        <WeatherSourceTabs source={source} onSource={onSource} expanded={false} onToggle={onToggle} />
      </div>
    )
  }

  return (
    <div data-slot="weather-bar" className={cn('pointer-events-auto flex w-full flex-col gap-1.5', className)}>
      {/* legend + tabs float above the open panel, end-aligned */}
      <div className="flex items-end justify-end gap-2">
        <div className="w-64">
          <RainLegend />
        </div>
        <WeatherSourceTabs source={source} onSource={onSource} expanded onToggle={onToggle} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-md">
        {empty ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No {WEATHER_SOURCE_LABELS[source]} forecast data for this area.
          </p>
        ) : (
          <div className="flex">
            {/* row-label rail — the close button floats so the labels align 1:1
                with the grid rows */}
            <div className="relative w-40 shrink-0 border-e border-border py-1.5 pl-8 pr-1">
              <button
                type="button"
                aria-label="Close forecast panel"
                onClick={onToggle}
                className="absolute left-1 top-1.5 grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden className="size-3.5" />
              </button>
              {/* spacer matching the grids' day-header row so the row labels
                  align 1:1 with the grid rows */}
              {/* NB non-breaking space, not a plain one: a whitespace-only
                  text node inside a FLEX container is dropped as an anonymous
                  item, which collapses this spacer to its padding and pushes
                  every row label ~16px above its grid row. */}
              <div className="flex items-center py-1.5 text-[11px] font-semibold text-foreground" aria-hidden>
                {isDaily ? '10 Day Outlook' : '\u00A0'}
              </div>
              {rows.map((r, i) => (
                <RowLabel key={i} unit={r.unit}>
                  {r.label}
                </RowLabel>
              ))}
            </div>

            {/* timeline columns — scroll INSIDE the panel, never the page */}
            <div className="min-w-0 flex-1 overflow-x-auto py-1.5">
              {isDaily ? <QmdGrid days={qmd} cursor={cursor} /> : <OpenMeteoGrid days={days} cursor={cursor} />}
            </div>

            <AboutLocation data={data} />
          </div>
        )}

        {!empty && (
          <div className="border-t border-border">
            <ReplayBar cursor={cursor} playing={playing} stepCount={stepCount} onToggle={toggle} />
          </div>
        )}
      </div>
    </div>
  )
}

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const CYCLOSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, style: <a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases">CyclOSM</a>'

/**
 * PROVENANCE (2026-09-01, tile-key regression fix): commit 766aae0 wired
 * Grayscale/Roadmap/Hybrid to `{s}.basemaps.cartocdn.com` (light_all /
 * rastertiles/voyager / dark_all). That endpoint now requires a Carto API
 * key for ALL three styles — verified live: every tile comes back 200 but
 * the PNG body is a "API KEY REQUIRED — carto.com/basemaps/apikey"
 * watermark card, which is exactly what the user's screenshot showed.
 * There is no genuinely key-free Carto raster endpoint left, so the 3
 * broken styles were replaced with non-Carto key-free equivalents and
 * re-verified tile-by-tile (curl + rendered PNG, zero watermark):
 *   - Roadmap: CyclOSM (`tile-cyclosm.openstreetmap.fr`) — a real,
 *     road-focused raster style, key-free, closest available substitute
 *     for Carto Voyager's "bright roadmap" look.
 *   - Grayscale: OSM standard raster + CSS `grayscale(1)` filter (an
 *     LM-visual-equivalent per the fix brief — no key-free grayscale
 *     raster tile source exists at all, Carto's Positron included).
 *   - Hybrid: OSM standard raster + CSS `invert(1) hue-rotate(180deg)`
 *     filter to approximate a dark basemap (same reasoning — Carto Dark
 *     Matter has no key-free equivalent).
 * OSM/Satellite/Terrain were untouched by 766aae0's regression and are
 * left as-is.
 */
const OSM_GRAYSCALE_FILTER = 'grayscale(1) brightness(1.05) contrast(0.95)'
const OSM_DARK_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.9)'

/** The cockpit's real, key-free tile sources — a genuinely different raster
 *  per style, one per Live Monitoring style, none requiring an API key.
 *  Order/ids/labels/default mirror `LIVE_MAP_BASEMAP_STYLES` exactly —
 *  Grayscale first and the resting default. See PROVENANCE comment above
 *  for why Grayscale/Roadmap/Hybrid no longer point at Carto. */
const BASEMAP_STYLES: BasemapStyle[] = [
  {
    id: 'muted',
    label: 'Grayscale',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttribution: OSM_ATTRIBUTION,
    paletteId: 'grayscale',
    tileFilter: OSM_GRAYSCALE_FILTER,
  },
  {
    id: 'streets',
    label: 'OSM',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttribution: OSM_ATTRIBUTION,
    paletteId: 'osm',
  },
  {
    id: 'bright',
    label: 'Roadmap',
    tileUrl: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    tileAttribution: CYCLOSM_ATTRIBUTION,
    paletteId: 'roadmap',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    tileAttribution: 'Esri, Maxar, Earthstar Geographics',
    paletteId: 'satellite',
  },
  {
    id: 'terrain',
    label: 'Terrain',
    tileUrl: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    tileAttribution: '&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap (CC-BY-SA)',
    paletteId: 'terrain',
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttribution: OSM_ATTRIBUTION,
    paletteId: 'hybrid',
    tileFilter: OSM_DARK_FILTER,
  },
]

/**
 * BasemapPreview — LiveBasemapPreview's fallback vector-thumbnail geometry,
 * copied verbatim: a water bay, a park, two city blocks, a trunk road and a
 * cross street, painted from a per-style palette rather than a raster asset.
 */
function BasemapPreview({ paletteId, className }: { paletteId: BasemapPaletteId; className?: string }) {
  const p = BASEMAP_PALETTES[paletteId]
  return (
    <span
      aria-hidden="true"
      className={cn('relative block size-full overflow-hidden', className)}
      style={{ backgroundColor: p.land }}
    >
      <span className="absolute" style={{ backgroundColor: p.water, insetInlineStart: '-30%', top: '-34%', width: '160%', height: '48%', transform: 'rotate(20deg)' }} />
      <span className="absolute" style={{ backgroundColor: p.park, insetInlineStart: '58%', top: '52%', width: '34%', height: '30%', borderRadius: '30%' }} />
      <span className="absolute" style={{ backgroundColor: p.block, insetInlineStart: '8%', top: '46%', width: '26%', height: '20%' }} />
      <span className="absolute" style={{ backgroundColor: p.block, insetInlineStart: '8%', top: '72%', width: '38%', height: '18%' }} />
      <span className="absolute" style={{ backgroundColor: p.road, insetInlineStart: '-10%', top: '40%', width: '130%', height: '9%', transform: 'rotate(-9deg)' }} />
      <span className="absolute" style={{ backgroundColor: p.street, insetInlineStart: '46%', top: '18%', width: '7%', height: '90%', transform: 'rotate(11deg)' }} />
      <span className="absolute" style={{ backgroundColor: p.street, insetInlineStart: '-5%', bottom: '10%', width: '80%', height: '5%', transform: 'rotate(15deg)' }} />
    </span>
  )
}

/**
 * BasemapSwitcher — ui-kit `MapLayersSwitcher`'s hover-row anatomy, copied
 * verbatim: a fixed `size-11` (44px) footprint; a collapsed trigger painting
 * the active style's preview behind a white Layers glyph; on hover/focus, an
 * absolute `z-20` row fans the OTHER style cards out to the start side
 * (selected card stays in the trigger slot), each card `size-11` with a
 * `border-2 border-primary` ring when selected (`border border-border`
 * otherwise) and a bottom `Tooltip` naming the style — matching
 * `MapControls.tsx`'s card geometry exactly, no caption strip. Escape
 * latches the row shut.
 */
function BasemapSwitcher({
  styles, activeId, onChange,
}: {
  styles: BasemapStyle[]
  activeId: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const dismissedRef = useRef(false)
  const active = styles.find((s) => s.id === activeId) ?? styles[0]

  const expand = () => {
    if (dismissedRef.current) return
    setOpen(true)
  }
  const leave = () => {
    dismissedRef.current = false
    setOpen(false)
  }

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      dismissedRef.current = true
      setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div
      className="relative size-11 shrink-0"
      onMouseEnter={expand}
      onMouseLeave={leave}
      data-slot="map-layers-switcher"
    >
      {!open ? (
        <button
          type="button"
          aria-label="Map layers"
          aria-expanded={false}
          onFocus={expand}
          onClick={expand}
          className={cn(
            'relative grid size-11 place-items-center overflow-hidden rounded-md text-white outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring',
            MAP_SHADOW,
          )}
        >
          <span className="absolute inset-0 overflow-hidden rounded-md">
            <BasemapPreview paletteId={active.paletteId} />
            <span className="absolute inset-0 bg-gray-900/50" />
          </span>
          <span className="relative"><LayersThree02Icon /></span>
        </button>
      ) : (
        <TooltipProvider delayDuration={150}>
          <div
            role="listbox"
            aria-label="Map layers"
            aria-expanded={true}
            className={cn(
              'absolute z-20 flex items-stretch gap-1.5 overflow-visible rounded-lg',
              'animate-in fade-in slide-in-from-right-2 duration-150',
            )}
            style={{ insetInlineEnd: 0, insetBlockStart: 0 }}
          >
            {/* Row order: OTHERS first (fanning start-ward/left), the SELECTED
                style last — the flex row is anchored `insetInlineEnd: 0`, so
                its last child lands exactly where the trigger sat, keeping the
                selected card "in the first/trigger slot" the spec calls for. */}
            {[...styles.filter((s) => s.id !== active.id), active].map((style) => {
              const selected = style.id === active.id
              return (
                <Tooltip key={style.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onChange(style.id)
                        setOpen(false)
                      }}
                      className={cn(
                        'relative size-11 shrink-0 overflow-hidden rounded-lg outline-none',
                        MAP_SHADOW,
                        selected ? 'border-2 border-primary' : 'border border-border',
                        'focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                    >
                      <BasemapPreview paletteId={style.paletteId} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{style.label}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>
      )}
    </div>
  )
}

// USER SPEC (2026-09-01): the four Live GIS Map tabs — replaces the prior
// Plans/Zones/Stations/Incidents/Events set. Each tab swaps BOTH the panel
// list AND the map's marker set (see the tab-driven marker composition in
// the `<LeafletMap markers=…>` prop below).
const TABS = ['Plans', 'Complaints', 'Inspectors', 'Vehicles'] as const

// Vehicles tab marker → AssetMarker state, mirrors `STATUS_STATE` below but
// keyed by `VehicleActivity` (gisTabsData.ts) instead of `RouteStatus`.
const ACTIVITY_STATE: Record<import('./gisTabsData').VehicleActivity, AssetMarkerState> = {
  moving: 'moving',
  idle: 'idle',
  stopped: 'stopped',
  'non-reporting': 'non-reporting',
}

const MAP_CENTER: [number, number] = [25.28540, 51.53100]

/** A category POI on the map — the DS marker image (48×69 viewBox: teardrop
 *  head + dot foot), anchored at its foot point like `Flag`/`TruckMarker`. */
function PoiCategoryMarker({
  x, y, category, label,
}: {
  x: number; y: number; category: PoiCategory; label: string
}) {
  const meta = POI_CATEGORY_META[category]
  return (
    <div
      className="group pointer-events-auto absolute cursor-pointer"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%)', zIndex: 4 }}
      title={label}
    >
      <img src={meta.src} alt="" className="h-[46px] w-8 drop-shadow-sm" />
      <div className="pointer-events-none absolute bottom-[calc(100%+2px)] left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs font-semibold text-popover-foreground shadow-lg group-hover:block">
        {label}
      </div>
    </div>
  )
}

// Route status → design system AssetMarker state mapping.
const STATUS_STATE: Record<RouteStatus, AssetMarkerState> = {
  Ongoing: 'moving',
  Delayed: 'idle',
  'Action Required': 'stopped',
  Completed: 'non-reporting',
}

// One vehicle per route card (linked by index). Positions ported from the
// prototype's `markerDefs` (its map pixel offsets converted to Abu Dhabi
// lat/lngs); accent derived from the route's status.
const VEHICLE_POSITIONS: [number, number][] = [
  [25.29931, 51.55276],
  [25.26556, 51.57061],
  [25.25118, 51.62108],
  [25.29306, 51.52563],
  [25.31181, 51.51843],
  [25.26431, 51.59018],
  [25.31150, 51.49645],
]

// Actual (travelled) vs planned (intended) route geometry per vehicle. OSRM
// snaps these to real roads at runtime; a straight line shows until it resolves.
const ROUTE_GEO = VEHICLE_POSITIONS.map(([lat, lng]) => ({
  start: [lat + 0.026, lng - 0.020] as [number, number],
  end: [lat - 0.028, lng + 0.040] as [number, number],
}))

// Literal colours — Leaflet paints polylines via an SVG `stroke` attribute,
// which can't resolve CSS vars, so these mirror the status tokens as hex.
const ACTUAL_COLOR = '#12B76A' // green ≈ --status-success
const PLANNED_COLOR = '#1570EF' // blue ≈ --status-info

// Dummy telematics data per vehicle (Figma node 2227:97104), shown above the
// selected truck. Coordinates use the vehicle's real position.
const VEHICLE_MODELS = [
  'Mitsubishi X6734', 'Isuzu FVR900', 'Hino 500 Series', 'Volvo FE',
  'Scania P320', 'MAN TGM', 'Mercedes Actros',
]
// Dummy driver phone numbers, cycled the same way as VEHICLE_MODELS — shown in
// the "Call Driver" contact tooltip.
const DRIVER_PHONES = [
  '+1 000 000 0110', '+971 50 123 4567', '+971 55 234 5678', '+971 52 345 6789',
  '+971 56 567 8901', '+971 54 678 9012', '+971 50 789 0123',
]
function buildTelematics(list: RouteData[]) {
  return list.map((r, i) => {
    const moving = r.status === 'Ongoing'
    const [lat, lng] = VEHICLE_POSITIONS[i]
    return {
      title: VEHICLE_MODELS[i % VEHICLE_MODELS.length],
      plate: `GFU${47893 + i}`,
      location: 'Rahsid Al-Makhtoom International Airport',
      moving,
      /* LM's mobility vocabulary, kept in lockstep with `STATUS_STATE` (and
         therefore with the popup header's tone/coin): Ongoing → Moving,
         Delayed → Idling, Action Required → Stopped, Completed →
         Non-Reporting. It used to read "Stopped" for a Delayed route while
         the tone said idling. */
      state: moving ? 'Moving' : r.status === 'Delayed' ? 'Idling' : r.status === 'Completed' ? 'Non-Reporting' : 'Stopped',
      since: moving ? '2 Mins ago' : r.status === 'Completed' ? '45 Mins ago' : '23 Mins ago',
      driver: r.driver.name,
      phone: DRIVER_PHONES[i % DRIVER_PHONES.length],
      helper1: 'Rehmat Khan',
      helper2: 'Mukaish Khan',
      plan: r.plan || 'RBC9-Shiabat Al Wata_20260',
      speed: moving ? '32 km/h' : '0 km/h',
      coordinates: `${lat.toFixed(3)} , ${lng.toFixed(3)}`,
      sectors: r.sectors ? r.sectors.join(', ') : 'F3, Al Ain',
      fuel: moving ? '85%' : r.status === 'Completed' ? '15%' : '93%',
      odometer: '0',
      sos: '--',
    }
  })
}
export type TelematicsData = ReturnType<typeof buildTelematics>[number]

/**
 * A single truck marker.
 *
 * PROVENANCE (2026-09-01 LM-parity run): this used to compose the vendored
 * `AssetMarker` (a 38px pin with the DS's own generic ring/stem geometry).
 * That was CLOSE to Live Monitoring's marker but not it — LM ships
 * `ui-kit/domain/map/VehicleMarker`, whose anatomy (40px circle, 2px
 * status ring, 14px top-centre badge coin, 1×16px stem onto a 6px
 * coordinate dot, and the 120×20 hover/zoom capsule carrying plate + a
 * trailing value) is now replicated verbatim in `vehicleMapParity.tsx` and
 * rendered here. This component stays as the thin positional adapter the
 * cockpit's projected overlay (and `FleetMap`) already call.
 */
export function TruckMarker({
  x, y, state, active, dim, onClick, label, meta, statusLabel, heading = 0,
}: {
  x: number; y: number; state: AssetMarkerState; active: boolean; dim: boolean
  onClick: (e: React.MouseEvent) => void
  /** Capsule's leading text — the plate. */
  label?: string
  /** Capsule's trailing value (speed / fill level / dwell). */
  meta?: string
  statusLabel?: string
  heading?: number
}) {
  return (
    <VehicleMarker
      x={x}
      y={y}
      label={label ?? ''}
      meta={meta}
      statusLabel={statusLabel}
      tone={toneForState(state)}
      moving={state === 'moving'}
      heading={heading}
      selected={active}
      dimmed={dim}
      onClick={onClick}
    />
  )
}

/** Start/end flag pin (start = dark, end = red), anchored at its pole base. */
function Flag({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <div className="pointer-events-none absolute" style={{ left: x, top: y, transform: 'translate(-2px, -100%)', zIndex: 3 }}>
      <svg width="18" height="26" viewBox="0 0 18 26" fill="none">
        <path d="M3 26V2" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M3 2.5 L15 6 L3 9.5 Z" fill={color} />
      </svg>
    </div>
  )
}

/** One label + value cell in the telematics grid. */
function StatItem({
  icon: Icon, label, children,
}: {
  icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/90">
        <Icon className="size-3.5 shrink-0 text-muted-foreground/80" />
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm font-bold text-foreground min-w-0">{children}</div>
    </div>
  )
}

/** Telematics popup shown above the selected vehicle (Figma 2227:97104).
 *  `x`/`y` is the point it should sit above; anchored by its bottom caret. */
export function TelematicsCard({
  x,
  y,
  data,
  status,
  onClose,
  onReportBreakdown,
  onLocate,
  footer,
}: {
  x: number
  y: number
  data: TelematicsData
  status: string
  onClose: () => void
  onReportBreakdown?: () => void
  /** Header "Center on vehicle" crosshair (LM's `onLocate`). */
  onLocate?: () => void
  /** Replaces the default CTA row — used by surfaces with their own actions
      (Live Monitoring's Immobilize/Mobilize). */
  footer?: React.ReactNode
}) {
  const isMoving = data.moving
  /* Status TONE drives the header tile tint, its corner coin and the status
     word's colour — LM's `VehiclePopupHeader` contract (`TONE_TILE_BG` /
     `TONE_BADGE_BG` / `TONE_TEXT`), which the cockpit previously hard-coded
     to a permanently red `#fee4e2` tile with no coin at all. */
  const tone: VehicleStatusTone = (STATUS_STATE[status as RouteStatus] != null)
    ? toneForState(STATUS_STATE[status as RouteStatus])
    : isMoving ? 'success' : 'error'
  const stateColor = TONE_TEXT[tone]

  const [activeTab, setActiveTab] = useState<'Overview' | 'Critical Events' | 'Trips' | 'Devices'>('Overview')
  const [showContact, setShowContact] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!showContact) return
    const t = setTimeout(() => setShowContact(false), 5000)
    return () => clearTimeout(t)
  }, [showContact])

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(data.coordinates)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className="pointer-events-auto absolute w-[460px]"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div data-slot="vehicle-popup-card" className="rounded-[10px] border border-[#d0d5dd] bg-card shadow-xl overflow-hidden">
        {/* Header — LM's `VehiclePopupHeader` (ui-kit/domain/map), anatomy for
            anatomy: a 68×70 STATUS-TINTED tile carrying the real 3D tanker
            art with a 16px status coin overlapping its bottom-end corner
            (ring-2 ring-card), then title / plate+location meta / status
            line, with the locate · open-external · close actions on the end.
            Provenance: the tile used to be a permanently-red `#fee4e2` box
            holding the generic `/assets/truck-tanker.svg` van glyph and had
            no coin. */}
        <div className="flex items-start justify-between gap-2 border-b border-[#eaecf0] bg-card px-4 py-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="relative shrink-0">
              <div
                data-slot="vehicle-popup-tile"
                style={{ width: 68, height: 70 }}
                className={cn('grid place-items-center rounded', TONE_TILE_BG[tone])}
              >
                <TankerArt size={57} />
              </div>
              <span
                aria-hidden="true"
                data-slot="vehicle-popup-status-badge"
                style={{ insetInlineEnd: -4, insetBlockEnd: -4 }}
                className={cn(
                  'absolute grid size-4 place-items-center rounded-full text-white ring-2 ring-card',
                  TONE_BADGE_BG[tone],
                )}
              >
                {badgeGlyph(tone, isMoving, 0)}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-bold text-foreground leading-tight">{data.title}</h3>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex shrink-0 items-center gap-1">
                  <Tag className="size-3.5" />
                  {data.plate}
                </span>
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate max-w-[200px]">{data.location}</span>
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                {/* Status coin — the SAME tone fill + glyph vocabulary as the
                    map marker's badge (arrow / pause / square). */}
                <span className={cn('flex size-4 items-center justify-center rounded-full text-white', TONE_BADGE_BG[tone])}>
                  {badgeGlyph(tone, isMoving, 0)}
                </span>
                <span className={stateColor}>{data.state}</span>
                <span className="text-muted-foreground font-normal">since {data.since}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
            <button
              type="button"
              aria-label="Center on vehicle"
              onClick={onLocate}
              className="outline-none hover:text-foreground cursor-pointer"
            >
              <LocateFixed className="size-4 text-[color:var(--status-success,#12b76a)]" />
            </button>
            <button type="button" aria-label="Expand details" className="outline-none hover:text-foreground cursor-pointer">
              <ExternalLink className="size-4" />
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="outline-none hover:text-foreground cursor-pointer">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Tab navigation bar */}
        <div className="flex items-center gap-6 border-b border-[#eaecf0] px-4 pt-2.5 bg-card">
          {(['Overview', 'Critical Events', 'Trips', 'Devices'] as const).map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'pb-2.5 text-sm transition-colors border-b-2 cursor-pointer font-medium',
                  isActive
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab}
              </button>
            )
          })}
        </div>

        {/* Tab contents */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-3 gap-x-4 gap-y-5 p-4 border-b border-[#eaecf0]">
            {/* Row 1 */}
            <StatItem icon={User} label="Driver">
              <span className="truncate">{data.driver}</span>
            </StatItem>

            <StatItem icon={Phone} label="Contact">
              <span className="truncate">{data.phone}</span>
            </StatItem>

            <StatItem icon={Gauge} label="Vehicle Speed">
              <span>{data.speed}</span>
            </StatItem>

            {/* Row 2 */}
            <StatItem icon={MapPin} label="Coordinates">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate text-sm font-bold">{data.coordinates}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  title={copied ? 'Copied!' : 'Copy coordinates'}
                  aria-label="Copy coordinates"
                  className="text-primary hover:text-primary/80 shrink-0 cursor-pointer p-0.5"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            </StatItem>

            <StatItem icon={Radio} label="Last Record Recieved">
              <span className="truncate">{data.since}</span>
            </StatItem>

            <StatItem icon={Gauge} label="Odometer">
              <span>{data.odometer ?? '0'}</span>
            </StatItem>

            {/* Row 3 */}
            <StatItem icon={AlertCircle} label="SOS">
              <span>{data.sos ?? '--'}</span>
            </StatItem>

            <StatItem icon={Droplet} label="Fuel Level">
              <div className="flex items-center gap-2.5 w-full">
                <div className="h-2 flex-1 rounded-full bg-[#EAECF0] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#12B76A] transition-all duration-300"
                    style={{ width: data.fuel.endsWith('%') ? data.fuel : `${data.fuel}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-muted-foreground shrink-0">{data.fuel}</span>
              </div>
            </StatItem>
          </div>
        )}

        {activeTab === 'Critical Events' && (
          <div className="p-6 text-center text-sm text-muted-foreground border-b border-[#eaecf0]">
            No critical alerts or events reported in the past 24 hours.
          </div>
        )}

        {activeTab === 'Trips' && (
          <div className="p-6 text-center text-sm text-muted-foreground border-b border-[#eaecf0]">
            3 completed collection trips logged today.
          </div>
        )}

        {activeTab === 'Devices' && (
          <div className="p-6 text-center text-sm text-muted-foreground border-b border-[#eaecf0]">
            GPS Telematics Module (IMEI: 352094089863184) · Status Active
          </div>
        )}

        {/* The Live-GIS-only action pair (2026-09-01 user spec), at the bottom
            of the OVERVIEW tab: one full-width row of two equal outline
            buttons (`flex-1`) — "Report Breakdown" in the error/warning tone
            with an alert-triangle, "Call Driver" in the primary maroon tone
            with a phone. It no longer swaps for an "Action Required" variant:
            the reference shows the SAME pair on every status, so the
            status-conditional third action (Suggest Replacement) is retired
            from this surface — that flow stays reachable from Current Shift
            Issues → Nearby Routes → Suggest Replacement, which is where the
            dispatcher actually picks a replacement vehicle. A `footer` prop
            still replaces the whole row (Live Monitoring's Immobilize /
            Mobilize actions use it) and, because that surface's actions are
            not tab-scoped, a supplied `footer` renders on every tab. */}
        {footer != null || activeTab === 'Overview' ? (
          <div className="bg-card p-4 flex gap-3">
            {footer != null ? (
              footer
            ) : (
              <>
                <button
                  type="button"
                  onClick={onReportBreakdown}
                  className="flex-1 flex items-center justify-center gap-2 rounded border border-[color:var(--status-error,#f04438)] text-[color:var(--status-error,#f04438)] px-3 py-2 text-sm font-semibold bg-transparent hover:bg-[color:var(--status-error,#f04438)]/5 cursor-pointer"
                >
                  <TriangleAlert className="size-4" />
                  Report Breakdown
                </button>
                <button
                  type="button"
                  onClick={() => setShowContact(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded border border-primary text-primary px-3 py-2 text-sm font-semibold bg-transparent hover:bg-primary/5 cursor-pointer"
                >
                  <Phone className="size-4" />
                  Call Driver
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
      {/* Downward caret pointing at the vehicle. */}
      <div className="absolute left-1/2 top-full size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-[#d0d5dd] bg-card" />

      {/* Driver Contact tooltip — opens on "Call Driver", auto-dismisses after
          5s. Rendered as a sibling (not nested in the card's overflow-hidden
          wrapper) so it isn't clipped, centred below the whole card. */}
      {showContact ? (
        <div className="absolute left-1/2 top-[calc(100%+20px)] z-20 w-[230px] -translate-x-1/2 rounded-[10px] bg-[#0b0f1a] p-3 shadow-xl">
          <div className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-[#0b0f1a]" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/50">Driver Contact</span>
            <button
              type="button"
              onClick={() => setShowContact(false)}
              aria-label="Close"
              className="text-white/60 hover:text-white cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            {/* The number is a real `tel:` link — "Call Driver" actually
                places the call on a device that can (2026-09-01 spec). */}
            <a href={`tel:${data.phone.replace(/\s+/g, '')}`} className="text-base font-bold text-white hover:underline">
              {data.phone}
            </a>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(data.phone)}
              aria-label="Copy phone number"
              className="flex size-6 shrink-0 items-center justify-center rounded-[4px] border border-[color:var(--status-success,#12b76a)] text-[color:var(--status-success,#12b76a)] hover:bg-[color:var(--status-success,#12b76a)]/10 cursor-pointer"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * IncidentDrawerList — the Incidents drawer's body. A separate component so
 * it can own the effect that REPORTS the currently search∩tag-narrowed row
 * set upward: LM's `IncidentsDrawer` does exactly this
 * (`onVisibleItemsChange`), because the drawer owns its own search/filter
 * state (the self-contained `MapToolDrawer` convention Zones/POI follow) and
 * that is how the caller keeps the map's pin set in lockstep with what the
 * card list is showing.
 */
function IncidentDrawerList({
  rows, selectedId, onSelect, onAdvance, onLocate, onVisibleIdsChange,
}: {
  rows: ComplaintRow[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onAdvance: (id: string) => void
  onLocate: (row: ComplaintRow) => void
  onVisibleIdsChange: (ids: string[]) => void
}) {
  const ids = rows.map((r) => r.id).join('|')
  useEffect(() => {
    onVisibleIdsChange(ids === '' ? [] : ids.split('|'))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report on change only
  }, [ids])

  if (rows.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-xs text-muted-foreground">
        No incidents match your search.
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-3 p-3">
      {rows.map((row) => (
        <li key={row.id}>
          <IncidentDrawerCard
            row={row}
            selected={selectedId === row.id}
            onSelect={() => onSelect(selectedId === row.id ? null : row.id)}
            onAdvance={() => onAdvance(row.id)}
            onLocate={() => onLocate(row)}
          />
        </li>
      ))}
    </ul>
  )
}

type Pt = { x: number; y: number } | null

export function LiveGisMap({
  onReportBreakdown,
  onSuggestReplacement,
  routes = defaultRoutes,
}: {
  onReportBreakdown?: (r: BreakdownReport) => void
  onSuggestReplacement?: (r: BreakdownReport) => void
  routes?: RouteData[]
} = {}) {
  const telematics = useMemo(() => buildTelematics(routes), [routes])
  const [tab, setTab] = useState<(typeof TABS)[number]>('Plans')
  const [selected, setSelected] = useState<number | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  // Search field filters the ACTIVE tab's list and its markers (per spec).
  const [search, setSearch] = useState('')
  // Selection is per-tab — switching tabs clears it so a Plans-tab
  // telematics popup never lingers over the Vehicles/Inspectors markers.
  useEffect(() => {
    setSelected(null)
    setShowTooltip(false)
    setSearch('')
  }, [tab])
  const [filterStatuses, setFilterStatuses] = useState({
    Scheduled: true,
    Ongoing: true,
    Delayed: true,
    Completed: true,
  })

  // Live GIS Map tool stack — each tile toggles a real overlay built from
  // data this panel already has (mirrors Live Monitoring's control anatomy).
  const [activeBasemapId, setActiveBasemapId] = useState(BASEMAP_STYLES[0].id)
  const activeBasemap = BASEMAP_STYLES.find((s) => s.id === activeBasemapId) ?? BASEMAP_STYLES[0]
  const [showTraffic, setShowTraffic] = useState(false)

  /* Map tool DRAWERS — LM parity (2026-09-01). In Live Monitoring the
     Zones / POI / Incidents tools do not toggle a floating card each: they
     open ONE right-docked drawer at a time, and re-clicking the active tool
     (or Escape, or the drawer's Close button) shuts it. `activeTool` is that
     single-slot state — `LiveMapView`'s `zonesOpen`/`poiOpen`/`incidentsOpen`
     expressed as one value, which is what makes "one panel at a time" a
     property of the state rather than three booleans kept in step by hand.
     Traffic and Weather stay independent BOOLEANS on purpose: in LM they are
     map LAYERS with no drawer, exactly as here. */
  type MapToolId = 'zones' | 'poi' | 'incidents'
  const [activeTool, setActiveTool] = useState<MapToolId | null>(null)
  const toggleTool = (id: MapToolId) => setActiveTool((prev) => (prev === id ? null : id))
  const closeTool = useCallback(() => setActiveTool(null), [])
  /** The drawer docks flush to the map pane's end edge, so the tool stack /
   *  zoom cluster / weather bar all step inboard by exactly its width —
   *  `LiveMapTools`' `endInset` (LiveMapView.tsx L1058) and the forecast
   *  bar's `toolEndInset` padding (L1213). */
  const toolEndInset = activeTool ? MAP_TOOL_DRAWER_WIDTH : 0

  // Zones drawer — CHECKED ids draw their polygons on the map (LM's
  // `ZonesDrawer` contract: `checkedIds` is the shown set, not a hidden set).
  // Everything starts checked so the tool opens showing the zones it names.
  const allZoneIds = useMemo(() => flattenZones(ZONES).map((z) => z.id), [])
  const [checkedZoneIds, setCheckedZoneIds] = useState<string[]>(allZoneIds)
  // Weather layer is ENABLED BY DEFAULT (2026-09-01, user spec): the tool
  // starts pressed and the layer + bottom weather bar are visible on load.
  const [showWeather, setShowWeather] = useState(true)
  const [weatherSource, setWeatherSource] = useState<WeatherSourceId>('open-meteo')
  const [weatherBarExpanded, setWeatherBarExpanded] = useState(false)

  /* Incidents drawer — Requests & Complaints, ACTIONABLE. The stage lives in
     component state so the dispatcher's Acknowledge/Resolve actually moves
     the row (and its pin's tint) the way it would against a live record. */
  const [incidentRows, setIncidentRows] = useState<ComplaintRow[]>(seedComplaints)
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)
  const advanceIncident = (id: string) =>
    setIncidentRows((prev) => prev.map((r) => {
      if (r.id !== id) return r
      const next: ComplaintStatus | null = nextComplaintStage(r.status)
      return next ? { ...r, status: next } : r
    }))

  // Map route statuses to filters:
  // - Delayed -> Delayed filter
  // - Ongoing -> Ongoing filter
  // - Completed -> Completed filter
  // - Action Required -> Scheduled filter
  const filteredRoutes = routes.map((r, i) => ({ route: r, originalIndex: i })).filter(({ route }) => {
    if (route.status === 'Ongoing' && !filterStatuses.Ongoing) return false
    if (route.status === 'Delayed' && !filterStatuses.Delayed) return false
    if (route.status === 'Completed' && !filterStatuses.Completed) return false
    if (route.status === 'Action Required' && !filterStatuses.Scheduled) return false
    return true
  })

  // Per-tab search-filtered lists (search field filters the ACTIVE tab's
  // list and its markers).
  const q = search.trim().toLowerCase()
  const visiblePlans = planCards.filter((p) => !q || `${p.id} ${p.title} ${p.tanker} ${p.driver} ${p.zone} ${p.status}`.toLowerCase().includes(q))
  const visibleComplaints = incidentRows.filter((c) => !q || `${c.id} ${c.driver} ${c.tanker} ${c.text} ${c.zone} ${c.severity} ${c.status}`.toLowerCase().includes(q))
  const visibleInspectors = inspectors.filter((i) => !q || `${i.name} ${i.employeeId} ${i.designation} ${i.zone} ${i.status}`.toLowerCase().includes(q))
  const visibleVehicles = vehicleFleet.filter((v) => !q || `${v.plate} ${v.model} ${v.driver} ${v.status}`.toLowerCase().includes(q))

  const selectRoute = (i: number | null) => {
    setSelected(i)
    setShowTooltip(i !== null)
  }
  const mapRef = useRef<LeafletMapHandle>(null)

  /** Inspectors/Vehicles render LM's list TABLES, not the card lists the
   *  Plans/Complaints tabs use — the scroll viewport drops its card gutter
   *  for them so the table can run edge to edge. */
  const isTableTab = tab === 'Inspectors' || tab === 'Vehicles'
  /** Inspectors row click focuses/selects that person's marker (LM's list↔map
   *  selection sync), the same way a Vehicles row selects its truck. */
  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null)
  const selectInspector = (id: string) => {
    const next = selectedInspectorId === id ? null : id
    setSelectedInspectorId(next)
    const row = inspectors.find((i) => i.id === next)
    if (row) mapRef.current?.flyTo(row.position)
  }
  // Selection is per-tab (same contract the vehicle selection follows).
  useEffect(() => setSelectedInspectorId(null), [tab])
  const [points, setPoints] = useState<Pt[]>([])
  const [flags, setFlags] = useState<{ start: Pt; end: Pt } | null>(null)
  /** Live map zoom, refreshed with the projection on every viewport change —
   *  the marker clustering's `maxZoom` cutoff reads it. */
  const [mapZoom, setMapZoom] = useState<number | null>(null)
  /** LM ships a clustering on/off toggle on its map control column
   *  ("Disable clustering"); the Live GIS tool stack carries the same one,
   *  defaulting ON exactly as LM does. */
  const [clusteringEnabled, setClusteringEnabled] = useState(true)

  // `selected` is read inside the (once-bound) viewport handler, so mirror it
  // into a ref to avoid rebinding.
  const selRef = useRef<number | null>(null)

  // The Plans tab's truck-marker overlay reuses the routes/vehicle geometry
  // (existing mechanism, per spec: "Map markers for this tab: the plan
  // routes/zone positions — reuse existing routes layer"). The Vehicles tab
  // extends the SAME overlay mechanism with the 18-tanker fleet's positions
  // instead — "Switching updates markers to vehicle positions (the truck
  // markers the map already has)".
  const vehicleTabPositions = useMemo(() => vehicleFleet.map((v) => v.position), [])
  const activePositions = tab === 'Vehicles' ? vehicleTabPositions : VEHICLE_POSITIONS

  // Points of interest — the response-base clusters + discharge point MBR
  // already tracks for this fleet, plus a small set of civic/road POIs typical
  // of the corridor, EACH tagged with its DS marker category (2026-09-01
  // addendum: replaces the two-kind `plant`/`site` generic squircle/circle
  // chips with the actual FAMS V5 POI marker set — see `POI_CATEGORY_META`
  // above). Rendered as an HTML overlay (`PoiCategoryMarker`, projected
  // below, same mechanism as `TruckMarker`/`Flag`) rather than through the
  // vendored `LeafletMap`'s generic `markers` prop, so the exact DS pin art
  // (teardrop + squircle head + dot foot) shows instead of that renderer's
  // grey-square/plain-circle fallback.
  interface PoiPoint { id: string; position: [number, number]; category: PoiCategory; name: string; detail: string }
  const poiPoints: PoiPoint[] = useMemo(
    () => [
      { id: 'discharge-point', position: DISCHARGE_POINT, category: 'depot', name: 'Discharge Station', detail: 'Doha South Discharge Point' },
      ...AB_CLUSTERS.map((c, i) => ({
        id: `station-${i}`,
        position: c.center,
        category: 'service' as const,
        name: `Station ${i + 1}`,
        detail: `${c.bins} bins · ${c.distance}`,
      })),
      { id: 'fuel-1', position: [25.2419, 51.5486] as [number, number], category: 'fuel', name: 'Al Wakrah Fuel Station', detail: 'Diesel · Open 24h' },
      { id: 'fuel-2', position: [25.3312, 51.4952] as [number, number], category: 'fuel', name: 'West Bay Fuel Station', detail: 'Diesel · Open 24h' },
      { id: 'rest-1', position: [25.2988, 51.5674] as [number, number], category: 'rest-stop', name: 'Ras Abu Aboud Rest Stop', detail: 'Driver rest area' },
      { id: 'civic-1', position: [25.2842, 51.5311] as [number, number], category: 'civic', name: 'Doha Corniche Precinct', detail: 'Civic waterfront zone' },
    ],
    [],
  )
  /* POI drawer rows — LM's `PoiDrawer` shape (`LivePoiDatum`: id, name,
     position, plus `tags`). The CATEGORY is the row's tag, so the drawer's
     square tag button gives per-CATEGORY enable/disable through exactly LM's
     own mechanism: pick a category tag to narrow the list, then the header
     select-all checkbox turns that whole category on or off at once (LM's
     `SelectAllCell` deliberately applies to the CURRENTLY LISTED rows only,
     and filtering never touches checks made outside the query — UX-15).
     Individual rows stay independently checkable, as in LM. */
  const poiDrawerRows = useMemo(
    () => poiPoints.map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      category: p.category,
      tags: [POI_CATEGORY_META[p.category].label],
    })),
    [poiPoints],
  )
  const poiDrawerTags = useMemo(() => collectTags(poiDrawerRows), [poiDrawerRows])
  const [checkedPoiIds, setCheckedPoiIds] = useState<string[]>(() => poiPoints.map((p) => p.id))
  const [poiPixelPoints, setPoiPixelPoints] = useState<Pt[]>([])


  // Re-project every vehicle (and the selected route's flags) to container
  // pixels — the markers are an HTML overlay, repositioned on every pan/zoom.
  // POI pins reproject the same way, independent of `tab`/`activePositions`
  // (they're visible on every tab whenever the POI tool is toggled on).
  const reproject = useCallback(() => {
    const h = mapRef.current
    if (!h) return
    setPoints(activePositions.map((p) => h.project(p)))
    setPoiPixelPoints(poiPoints.map((p) => h.project(p.position)))
    // Clustering needs the live zoom (LM never clusters past zoom 16).
    setMapZoom(h.getZoom())
    const s = selRef.current
    if (s != null && tab === 'Plans') {
      const g = ROUTE_GEO[s]
      setFlags({ start: h.project(g.start), end: h.project(g.end) })
    } else {
      setFlags(null)
    }
  }, [activePositions, poiPoints, tab])

  // Leaflet loads asynchronously; `project` returns null until the map is
  // ready. Retry on animation frames until the first projection succeeds.
  useEffect(() => {
    let raf = 0
    let tries = 0
    const attempt = () => {
      const p = mapRef.current?.project(activePositions[0])
      if (p) reproject()
      else if (tries++ < 180) raf = requestAnimationFrame(attempt)
    }
    attempt()
    return () => cancelAnimationFrame(raf)
  }, [reproject, activePositions])

  // Re-project immediately when the selection changes (place/remove flags).
  useEffect(() => {
    selRef.current = selected
    reproject()
    if (selected != null && tab === 'Plans') {
      const [lat, lng] = VEHICLE_POSITIONS[selected]
      // Offset center slightly North so the vehicle renders lower on screen,
      // keeping the tall telematics tooltip fully visible within container bounds.
      mapRef.current?.flyTo([lat + 0.0090, lng])
    }
  }, [selected, reproject, tab])

  // Actual (green) + planned (blue) lines for the selected vehicle only.
  const activeRoutes: MapRoute[] =
    selected == null
      ? []
      : [
          { id: 'planned', points: [ROUTE_GEO[selected].start, ROUTE_GEO[selected].end], color: PLANNED_COLOR, weight: 4, osrm: true },
          { id: 'actual', points: [ROUTE_GEO[selected].start, VEHICLE_POSITIONS[selected]], color: ACTUAL_COLOR, weight: 4, osrm: true },
        ]

  /* ── vehicle markers + LM-parity clustering ────────────────────────────
   * One marker descriptor per VISIBLE vehicle on the active tab, carrying
   * everything LM's `VehicleMarker` renders (plate for the capsule's leading
   * slot, a trailing value, the status word for the accessible name) plus
   * the container-pixel projection the overlay positions it at. Both tabs
   * feed the SAME list so clustering, selection and dimming behave
   * identically whichever one is open.
   */
  interface VehicleMarkerDatum {
    key: string
    index: number
    state: AssetMarkerState
    label: string
    meta: string
    statusLabel: string
  }
  const vehicleMarkerItems = useMemo(() => {
    if (tab === 'Vehicles') {
      return vehicleFleet
        .map((v, i) => ({ v, i }))
        .filter(({ v }) => visibleVehicles.some((vv) => vv.plate === v.plate))
        .map(({ v, i }) => ({
          point: points[i] ?? null,
          tone: toneForState(ACTIVITY_STATE[v.activity]),
          datum: {
            key: v.plate,
            index: i,
            state: ACTIVITY_STATE[v.activity],
            label: v.plate,
            meta: `${v.fillPct}%`,
            statusLabel: v.status,
          } satisfies VehicleMarkerDatum,
        }))
    }
    if (tab !== 'Plans') return []
    return filteredRoutes.map(({ route, originalIndex }) => ({
      point: points[originalIndex] ?? null,
      tone: toneForState(STATUS_STATE[route.status]),
      datum: {
        key: `route-${originalIndex}`,
        index: originalIndex,
        state: STATUS_STATE[route.status],
        label: telematics[originalIndex]?.plate ?? route.id,
        meta: telematics[originalIndex]?.speed ?? '',
        statusLabel: telematics[originalIndex]?.state ?? route.status,
      } satisfies VehicleMarkerDatum,
    }))
  }, [tab, points, filteredRoutes, visibleVehicles, telematics])

  /* A SELECTED vehicle never disappears into a cluster — its popup is open
     on top of it, so it stays an individual marker (LM's own carve-out:
     selection beats chip/cluster suppression). */
  const clusterInput = useMemo(
    () => vehicleMarkerItems.filter((m) => m.datum.index !== selected),
    [vehicleMarkerItems, selected],
  )
  const { clusters: vehicleClusters, loose } = useVehicleClusters(clusterInput, mapZoom, clusteringEnabled)
  const looseVehicles = useMemo(() => {
    const sel = vehicleMarkerItems.filter((m) => m.datum.index === selected && m.point)
    return [...loose, ...sel]
  }, [loose, vehicleMarkerItems, selected])

  /** LM's click-to-zoom cluster expansion: fly to the cluster's centroid two
   *  zoom steps in, which is what breaks it apart. */
  const expandCluster = useCallback((c: { members: { datum: VehicleMarkerDatum }[] }) => {
    const positions = c.members
      .map((m) => (tab === 'Vehicles' ? vehicleFleet[m.datum.index]?.position : VEHICLE_POSITIONS[m.datum.index]))
      .filter(Boolean) as [number, number][]
    if (!positions.length) return
    const lat = positions.reduce((s, p) => s + p[0], 0) / positions.length
    const lng = positions.reduce((s, p) => s + p[1], 0) / positions.length
    const z = Math.min((mapZoom ?? 12) + 2, 18)
    mapRef.current?.flyTo([lat, lng], z)
  }, [tab, mapZoom])

  // Bundle the selected route + its telematics vehicle for the breakdown /
  // replacement handlers.
  const buildReport = (i: number): BreakdownReport => {
    const d = telematics[i]
    return {
      route: routes[i],
      vehicle: {
        model: d.title,
        plate: d.plate,
        driver: d.driver,
        location: d.location,
        coordinates: d.coordinates,
        plan: d.plan,
        route: routes[i].id,
      },
    }
  }

  // Zones overlay — reuses the Zones Management module's real polygon
  // geometry. Rows unchecked in the Zones panel drop out of the overlay.
  const zoneOverlays: MapZone[] = useMemo(
    () => ZONES
      .filter((z) => checkedZoneIds.includes(z.id))
      .map((z) => ({ id: z.id, points: z.points, color: z.color, label: z.name, fillOpacity: 0.14 })),
    [checkedZoneIds],
  )

  // Zones drawer list — flat (root + children). Same catalogue the map
  // overlay draws from; the drawer owns its own search/tag state (LM's
  // self-contained `MapToolDrawer` convention).
  const zoneDrawerRows = useMemo(() => flattenZones(ZONES), [])
  const zoneDrawerTags = useMemo(() => collectTags(zoneDrawerRows), [zoneDrawerRows])

  // Complaints tab markers — one dot per driver-reported complaint, tinted
  // by severity (critical→error/red, high→warning/amber, medium→info/blue).
  const complaintMarkers: MapMarker[] = useMemo(
    () => visibleComplaints.map((c) => ({
      id: `complaint-${c.id}`,
      position: c.position,
      kind: 'dot' as const,
      status: c.severity === 'Critical' ? 'critical' as const : c.severity === 'High' ? 'warning' as const : 'reporting' as const,
      label: c.tanker,
      tooltip: `${c.driver} · ${c.text}`,
    })),
    [visibleComplaints],
  )

  // Inspectors tab markers — the DS map's `kind: 'asset'` person pin
  // (`assetType: 'workforce'`, real worker art — see `asset-vectors.tsx`'s
  // 2026-09-01 `workforce` alias provenance comment for why this used to
  // render an empty circle), distinct from the truck markers vehicles use.
  // Status→ring-state mirrors LM's own 3-value vocabulary: In Transit
  // (moving, green) / Clocked In (idle-tint, static) / Not Clocked In
  // (non-reporting, grey).
  const inspectorMarkers: MapMarker[] = useMemo(
    () => visibleInspectors.map((i) => ({
      id: `inspector-${i.id}`,
      position: i.position,
      kind: 'asset' as const,
      assetType: 'workforce',
      assetState: (i.status === 'In Transit' ? 'moving' : i.status === 'Clocked In' ? 'idle' : 'non-reporting') as AssetMarkerState,
      label: i.name,
      tooltip: `${i.employeeId} · ${i.designation} · ${i.status}`,
    })),
    [visibleInspectors],
  )

  /* Incidents overlay — LM's `IncidentsDrawer` contract (`incidentMapPins`):
     the pins the map plots are exactly the rows the drawer is currently
     showing, so its search/filter narrows the card list AND the pins
     together. The set is the Requests & Complaints roster, tinted by stage
     (Open = the #F79009 Intake anchor); the Current Shift Issues sites stay
     available for a caller that wants them but are no longer what the "!"
     tool paints. */
  const incidentDrawerRows = useMemo(
    () => incidentRows.map((r) => ({ ...r, tags: [r.severity, r.status] })),
    [incidentRows],
  )
  const incidentDrawerTags = useMemo(() => collectTags(incidentDrawerRows), [incidentDrawerRows])
  const [visibleIncidentIds, setVisibleIncidentIds] = useState<string[] | null>(null)
  const incidentMarkers: MapMarker[] = useMemo(
    () => incidentRows
      .filter((r) => visibleIncidentIds === null || visibleIncidentIds.includes(r.id))
      .map((r) => ({
        id: `incident-${r.id}`,
        position: r.position,
        kind: 'dot' as const,
        status: r.status === 'Resolved'
          ? 'reporting' as const
          : r.severity === 'Critical' ? 'critical' as const : 'warning' as const,
        label: r.id,
        tooltip: `${r.id} · ${r.severity} · ${r.status} — ${r.text}`,
      })),
    [incidentRows, visibleIncidentIds],
  )
  /** Locate action — fly the map to the complaint and select its pin. */
  const locateIncident = (row: ComplaintRow) => {
    setSelectedIncidentId(row.id)
    mapRef.current?.flyTo(row.position)
  }

  // Weather overlay markers — PROVENANCE (2026-09-01, LM parity fix):
  // supersedes the prior soft-heat-blob `weatherHeat` stand-in. Replicates
  // LM's actual `WeatherStationMarker` anatomy (rain-mm chip, coloured by
  // `weather-color.ts`'s rain band) over a small station set mirrored
  // verbatim from `tenants/uccp/seeds/rain-sensors.seed.json` (RSN-01..14 —
  // id/name/position/temp/rainfall), so the cockpit's readings agree with
  // whatever a rain-sensors surface shows for the same station. See
  // `RAIN_BAND_THRESHOLDS`/`rainBandColor` below (copied from
  // `weather-color.ts`) and the `leaflet-map.tsx` `kind: 'weather'`
  // provenance comment for why there is no legend/checkbox chrome.
  // The active source (`weatherSource`, driven by the weather bar's
  // Open-Meteo/QMD toggle) picks which of the station's two mirrored
  // readings the markers/chips render — LM's data behavior mirrored: the
  // toggle swaps the station readings source, not just a forecast table.
  const weatherMarkers: MapMarker[] = useMemo(
    () => WEATHER_STATIONS.map((s) => {
      const reading = weatherSource === 'open-meteo' ? s.openMeteo : s.qmd
      const color = rainBandColor(rainBand(reading.rainMm))
      return {
        id: `weather-${s.id}`,
        position: s.position,
        kind: 'weather' as const,
        weatherColor: color,
        weatherLabel: reading.rainMm === undefined ? '–' : rainMarkerLabel(reading.rainMm),
        tooltip: `${s.name} (${WEATHER_SOURCE_LABELS[weatherSource]}) — ${reading.rainMm === undefined ? 'No reading' : `${reading.rainMm} mm rain`} · ${reading.tempC.toFixed(1)}°C`,
      }
    }),
    [weatherSource],
  )

  // Traffic overlay — colours each vehicle's actual-vs-planned corridor by
  // congestion risk (Delayed routes render as a heavier amber line).
  const trafficRoutes: MapRoute[] = useMemo(
    () => routes.map((r, i) => ({
      id: `traffic-${i}`,
      points: [ROUTE_GEO[i].start, ROUTE_GEO[i].end],
      color: r.status === 'Delayed' ? '#F79009' : '#98A2B3',
      weight: r.status === 'Delayed' ? 5 : 2,
    })),
    [routes],
  )

  return (
    <div className="mx-6 mb-6 flex h-[calc(100vh-80px)] min-h-[700px] max-h-[920px] overflow-hidden rounded-md border border-border bg-card">
      {/* Routes panel */}
      <div className="flex w-[440px] shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-lg font-semibold text-foreground">Live GIS Map</h2>
          <button className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted" aria-label="Collapse panel">
            <PanelLeft className="size-4" />
          </button>
        </div>

        <div className="flex gap-5 border-b border-border px-4">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative py-3 text-sm font-semibold transition-colors ${t === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t}
              {t === tab ? <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
            </button>
          ))}
        </div>

        <div className="p-4">
          <div className="flex h-9 items-center gap-2 rounded-md border border-border px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Tab body — content AND the map's marker set both key off `tab`
            (spec: "each tab switch swaps BOTH panel content and map marker
            set"). Plans/Complaints keep their card lists (they are run and
            report RECORDS, which LM renders as cards too). Inspectors and
            Vehicles are LM's own list TABLES — a real column set with
            headers, not cards (see `gisTabTables.tsx`'s provenance note) —
            so they drop the card list's `gap-3` rhythm and horizontal
            padding: the table owns its own row pitch and cell padding, and
            its header row sticks to the top of the scroll region. */}
        <CustomScrollbar
          className="min-h-0 flex-1"
          viewportClassName={isTableTab ? 'pb-4' : 'flex flex-col gap-3 px-4 pb-4'}
        >
          {tab === 'Plans' && visiblePlans.map((row) => (
            <PlanCard key={row.id} row={row} selected={false} onClick={() => {}} />
          ))}
          {tab === 'Complaints' && visibleComplaints.map((row) => (
            <ComplaintCard key={row.id} row={row} selected={false} onClick={() => {}} />
          ))}
          {tab === 'Inspectors' ? (
            <InspectorsTable
              rows={visibleInspectors}
              selectedId={selectedInspectorId}
              onSelect={selectInspector}
            />
          ) : null}
          {tab === 'Vehicles' ? (
            <VehiclesTable
              rows={visibleVehicles}
              selectedPlate={selected == null ? null : vehicleFleet[selected]?.plate ?? null}
              onSelect={(plate) => {
                const i = vehicleFleet.findIndex((v) => v.plate === plate)
                selectRoute(selected === i ? null : i)
              }}
            />
          ) : null}
        </CustomScrollbar>
      </div>

      {/* Map — `isolate` traps Leaflet's high pane z-indexes in their own
          stacking context so an open side sheet's overlay covers the map.
          Clicking the map background (not a truck) clears the selection. */}
      <div className="relative min-w-0 flex-1 isolate" onClick={() => selectRoute(null)}>
        <LeafletMap
          ref={mapRef}
          center={MAP_CENTER}
          zoom={12}
          routes={tab === 'Plans' ? [...activeRoutes, ...(showTraffic ? trafficRoutes : [])] : []}
          zones={activeTool === 'zones' ? zoneOverlays : undefined}
          markers={[
            ...(tab === 'Complaints' ? complaintMarkers : []),
            ...(tab === 'Inspectors' ? inspectorMarkers : []),
            ...(activeTool === 'incidents' ? incidentMarkers : []),
            ...(showWeather ? weatherMarkers : []),
          ]}
          onViewportChange={reproject}
          tileUrl={activeBasemap.tileUrl}
          tileAttribution={activeBasemap.tileAttribution}
          tileFilter={activeBasemap.tileFilter}
          className="h-full w-full"
        />

        {/* Top Map Filters Card */}
        <div className="absolute left-4 top-4 z-[900] rounded bg-white shadow-md border border-border flex items-center p-1.5 gap-1 select-none" onClick={(e) => e.stopPropagation()}>
          {/* Scheduled */}
          <label className="flex items-center gap-2 cursor-pointer border-r border-[#eaecf0] pr-4 pl-2 h-7 text-[12px] font-semibold text-[#1d2939]">
            <Checkbox
              checked={filterStatuses.Scheduled}
              onCheckedChange={(checked) => setFilterStatuses({ ...filterStatuses, Scheduled: !!checked })}
            />
            <span>Scheduled</span>
            <Truck className="size-4 text-muted-foreground opacity-60" />
          </label>

          {/* Ongoing */}
          <label className="flex items-center gap-2 cursor-pointer border-r border-[#eaecf0] px-4 h-7 text-[12px] font-semibold text-[#1d2939]">
            <Checkbox
              checked={filterStatuses.Ongoing}
              onCheckedChange={(checked) => setFilterStatuses({ ...filterStatuses, Ongoing: !!checked })}
            />
            <span>Ongoing</span>
            <Truck className="size-4 text-muted-foreground opacity-60" />
          </label>

          {/* Delayed */}
          <label className="flex items-center gap-2 cursor-pointer border-r border-[#eaecf0] px-4 h-7 text-[12px] font-semibold text-[#1d2939]">
            <Checkbox
              checked={filterStatuses.Delayed}
              onCheckedChange={(checked) => setFilterStatuses({ ...filterStatuses, Delayed: !!checked })}
            />
            <span>Delayed</span>
            <Truck className="size-4 text-muted-foreground opacity-60" />
          </label>

          {/* Completed */}
          <label className="flex items-center gap-2 cursor-pointer pl-4 pr-2 h-7 text-[12px] font-semibold text-[#1d2939]">
            <Checkbox
              checked={filterStatuses.Completed}
              onCheckedChange={(checked) => setFilterStatuses({ ...filterStatuses, Completed: !!checked })}
            />
            <span>Completed</span>
            <Truck className="size-4 text-muted-foreground opacity-60" />
          </label>
        </div>

        {/* Right-Side Tool Stack — LiveMapTools' top-end stack, exact order/
            icons: layers/basemap · traffic · POI · zones · weather ·
            incidents. Traffic and Weather toggle map LAYERS; POI, Zones and
            Incidents each open the ONE right-docked drawer (LM parity —
            `LiveMapView` L1040-1058: `onZonesToggle`/`onPoiToggle`/
            `onIncidentsToggle` all flip a single open-drawer slot, and the
            stack steps inboard by exactly `MAP_TOOL_DRAWER_WIDTH` so the tool
            that opened the drawer stays visible AND clickable and the three
            can be switched directly — LM interaction 21b). */}
        <div
          className={cn('pointer-events-auto absolute top-4 z-[900] flex flex-col transition-[inset-inline-end] duration-150', TOOL_TILE_GAP)}
          style={{ insetInlineEnd: 16 + toolEndInset }}
          onClick={(e) => e.stopPropagation()}
        >
          <BasemapSwitcher styles={BASEMAP_STYLES} activeId={activeBasemapId} onChange={setActiveBasemapId} />
          <ToolTile label={showTraffic ? 'Hide traffic overlay' : 'Traffic overlay'} active={showTraffic} onClick={() => setShowTraffic((v) => !v)}>
            <TrafficLightsIcon />
          </ToolTile>
          <ToolTile label="Points of interest" active={activeTool === 'poi'} onClick={() => toggleTool('poi')}>
            <MarkerPin06Icon />
          </ToolTile>
          <ToolTile label="Zones" active={activeTool === 'zones'} onClick={() => toggleTool('zones')}>
            <ZonesIcon />
          </ToolTile>
          <ToolTile label={showWeather ? 'Hide weather layer' : 'Weather layer'} active={showWeather} onClick={() => setShowWeather((v) => !v)}>
            <CloudRaining06Icon />
          </ToolTile>
          <ToolTile label="Incidents" active={activeTool === 'incidents'} onClick={() => toggleTool('incidents')}>
            <AlertOctagonIcon />
          </ToolTile>
          {/* LM ships this toggle on its own map ("Disable clustering",
              default ON). Same label + same default here; it lives in this
              tool column rather than LM's separate bottom-start button so the
              cockpit keeps ONE control stack. */}
          <ToolTile
            label={clusteringEnabled ? 'Disable clustering' : 'Enable clustering'}
            active={!clusteringEnabled}
            onClick={() => setClusteringEnabled((v) => !v)}
          >
            {clusteringEnabled ? <EyeOff /> : <Eye />}
          </ToolTile>
          {/* Notification bell removed (2026-09-01, user addendum) — this
              map control stack no longer carries an alerts affordance; no
              other app-level notification UI was touched. */}
        </div>

        {/* Weather bar — LM's forecast dock, geometry copied verbatim from
            `LiveMapView.tsx` L1187-1223. COLLAPSED: the two content-sized
            pills, end-aligned, resting 32px off the floor and clear of the
            zoom/fullscreen column (`bottom-8 pe-14`). EXPANDED: the card is
            FULL WIDTH of the map pane — `bottom-4` so its bottom edge reads
            as part of the same floating-action row as the zoom stack, and
            `ps-14 pe-14` so the 68px end gutter is mirrored at the start
            edge. (The 2026-09-01 defect this fixes: the cockpit pinned
            `bottom-8 pe-14 justify-end` in BOTH states, so the expanded card
            stayed a content-sized `w-72` box in the corner instead of
            expanding across the map.) An open tool drawer covers the default
            end gutter, so the bar shifts inboard with the tool stack —
            LM's `toolEndInset` padding, L1210-1213. */}
        {showWeather ? (
          <div
            className={cn(
              'pointer-events-none absolute inset-x-3 z-[900] flex justify-end',
              weatherBarExpanded ? 'bottom-4 ps-14 pe-14' : 'bottom-8 pe-14',
            )}
            /* LM shifts the bar by `toolEndInset + 12` because there the
               inset comes from a HOST-docked column that covers the zoom
               controls outright. Here the inset comes from the map's OWN
               drawer, which moves the zoom/fullscreen column inboard with
               the tool stack instead of covering it — so the bar mirrors
               that column's new position and keeps the SAME 56px (`pe-14`)
               clearance it has at rest, rather than landing on top of the
               fullscreen tile. */
            style={toolEndInset ? { paddingInlineEnd: toolEndInset + 56 } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <WeatherBar
              source={weatherSource}
              onSource={setWeatherSource}
              expanded={weatherBarExpanded}
              onToggle={() => setWeatherBarExpanded((v) => !v)}
            />
          </div>
        ) : null}

        {/* POI drawer — LM's `PoiDrawer` (ZonesDrawer.tsx L492-550): the
            shared `MapToolDrawer` shell, then a `w-full table-fixed` checkbox
            table whose header is select-all · NAME · COORDINATES and whose
            NAME cell leads with the POI's own category art. Checked POIs plot
            their pins; the square tag button filters BY CATEGORY, and
            select-all then enables/disables that whole category at once. */}
        <MapToolDrawer
          title="POI"
          searchPlaceholder="Search POI"
          tags={poiDrawerTags}
          open={activeTool === 'poi'}
          onClose={closeTool}
        >
          {({ query, tags: selectedTags }) => {
            const pq = query.trim().toLowerCase()
            const rows = poiDrawerRows.filter((p) => matchesTags(p, selectedTags) && (!pq || p.name.toLowerCase().includes(pq)))
            return (
              <table className="w-full table-fixed" data-slot="poi-table">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <SelectAllCell
                      label="Show all points of interest on map"
                      ids={rows.map((p) => p.id)}
                      checkedIds={checkedPoiIds}
                      onCheckedIdsChange={setCheckedPoiIds}
                    />
                    <HeaderCell>Name</HeaderCell>
                    <HeaderCell className="w-32">Coordinates</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((poi) => (
                    <CheckRow
                      key={poi.id}
                      checked={checkedPoiIds.includes(poi.id)}
                      onCheckedChange={(c) =>
                        setCheckedPoiIds((prev) => (c ? [...new Set([...prev, poi.id])] : prev.filter((p) => p !== poi.id)))
                      }
                      label={`Show ${poi.name} on map`}
                      cells={
                        <>
                          <td className="overflow-hidden px-3">
                            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <PoiChip category={poi.category} />
                              <span className="block truncate" title={poi.name}>{poi.name}</span>
                            </span>
                          </td>
                          <td className="overflow-hidden px-3 text-[11px] text-muted-foreground">
                            <span className="block truncate">
                              {poi.position[1].toFixed(4)}, {poi.position[0].toFixed(4)}
                            </span>
                          </td>
                        </>
                      }
                    />
                  ))}
                </tbody>
              </table>
            )
          }}
        </MapToolDrawer>

        {/* Zones drawer — LM's `ZonesDrawer` (ZonesDrawer.tsx L405-479):
            select-all · COLOR · NAME · TAG. The COLOR cell is LM's own 8px
            status-triad dot (`statusDotColor` snaps the zone's arbitrary
            palette colour onto green/amber/red by hue rather than passing
            raw brand colour through). TAG replaces LM's PARENT column per
            the 2026-09-01 user spec (commits c2f9800/b5af3d2) — each zone's
            classification as a tinted chip. Checked zones draw their
            polygons; search and the tag filter never touch the checked set
            (LM UX-15). */}
        <MapToolDrawer
          title="Zones"
          searchPlaceholder="Search Zones"
          tags={zoneDrawerTags}
          open={activeTool === 'zones'}
          onClose={closeTool}
        >
          {({ query, tags: selectedTags }) => {
            const zq2 = query.trim().toLowerCase()
            const rows = zoneDrawerRows.filter(
              (z) => matchesTags(z, selectedTags) && (!zq2 || `${z.id} ${z.name}`.toLowerCase().includes(zq2)),
            )
            return (
              <table className="w-full table-fixed" data-slot="zones-table">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <SelectAllCell
                      label="Show all zones on map"
                      ids={rows.map((z) => z.id)}
                      checkedIds={checkedZoneIds}
                      onCheckedIdsChange={setCheckedZoneIds}
                    />
                    <HeaderCell className="w-14">Color</HeaderCell>
                    <HeaderCell>Name</HeaderCell>
                    <HeaderCell className="w-28">Tag</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((zone) => (
                    <CheckRow
                      key={zone.id}
                      checked={checkedZoneIds.includes(zone.id)}
                      onCheckedChange={(c) =>
                        setCheckedZoneIds((prev) => (c ? [...new Set([...prev, zone.id])] : prev.filter((z) => z !== zone.id)))
                      }
                      label={`Show ${zone.name} on map`}
                      cells={
                        <>
                          <td className="px-3">
                            <span
                              aria-hidden="true"
                              data-slot="zone-color-dot"
                              className="inline-block size-2 rounded-full"
                              style={{ backgroundColor: statusDotColor(zone.id, zone.color) }}
                            />
                          </td>
                          <td className="overflow-hidden px-3 text-sm font-medium text-foreground">
                            <span className="block truncate" title={zone.name}>{zone.name}</span>
                          </td>
                          <td className="overflow-hidden px-3">
                            <span className={cn('inline-block max-w-full truncate rounded-[2px] border px-1.5 py-0.5 text-[10px] font-semibold', ZONE_TYPE_TINT[zone.zoneType])}>
                              {zone.zoneType}
                            </span>
                          </td>
                        </>
                      }
                    />
                  ))}
                </tbody>
              </table>
            )
          }}
        </MapToolDrawer>

        {/* Incidents drawer — LM's `IncidentsDrawer` (same shell as Zones/POI,
            a scrollable CARD list rather than a checkbox table). Rows are the
            Requests & Complaints roster with solid severity/status chips
            (Intake/Open anchors on #F79009) and the two dispatcher actions —
            Acknowledge→Resolve, and Locate. LM's contract: the drawer's own
            search/tag narrowing drives the visible PINS too. */}
        <MapToolDrawer
          title="Incidents"
          searchPlaceholder="Search Incidents"
          tags={incidentDrawerTags}
          open={activeTool === 'incidents'}
          onClose={closeTool}
        >
          {({ query, tags: selectedTags }) => {
            const iq = query.trim().toLowerCase()
            const rows = incidentDrawerRows.filter(
              (r) => matchesTags(r, selectedTags)
                && (!iq || `${r.id} ${r.driver} ${r.tanker} ${r.text} ${r.zone}`.toLowerCase().includes(iq)),
            )
            return (
              <IncidentDrawerList
                rows={rows}
                selectedId={selectedIncidentId}
                onSelect={setSelectedIncidentId}
                onAdvance={advanceIncident}
                onLocate={locateIncident}
                onVisibleIdsChange={setVisibleIncidentIds}
              />
            )
          }}
        </MapToolDrawer>

        {/* Bottom Right — ui-kit `MapZoomControl`'s "figma" cluster: one
            40×70 pill (Plus above a hairline divider above Minus) with the
            corner-brackets fullscreen `MapIconButton` detached below it.
            Steps inboard with the tool stack while a drawer is docked. */}
        <div
          className={cn('pointer-events-auto absolute bottom-4 z-[900] flex flex-col items-center transition-[inset-inline-end] duration-150', TOOL_TILE_GAP)}
          style={{ insetInlineEnd: 16 + toolEndInset }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{ height: 70, padding: 7 }}
            className={cn('flex w-10 flex-col items-center justify-between overflow-hidden rounded-md bg-card', MAP_SHADOW)}
          >
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => mapRef.current?.zoomIn()}
              className="relative grid w-full flex-1 place-items-center text-gray-700 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&_svg]:size-5"
            >
              <Plus />
            </button>
            <div style={{ width: 26 }} className="h-px shrink-0 bg-border" />
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => mapRef.current?.zoomOut()}
              className="relative grid w-full flex-1 place-items-center text-gray-700 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&_svg]:size-5"
            >
              <Minus />
            </button>
          </div>

          <ToolTile label="Fullscreen">
            <Maximize02Icon />
          </ToolTile>
        </div>

        {/* Truck + flag overlay (positioned from the map's projection). z-[800]
            sits above Leaflet's marker/tooltip panes but below its controls.
            Plans tab: existing route/vehicle overlay. Vehicles tab: the SAME
            truck-marker mechanism, extended over the 18-tanker fleet.
            CLUSTERED (2026-09-01) exactly as Live Monitoring's map is —
            markers that land within 60px of each other collapse into LM's
            `ClusterBadge`, and clicking one zooms into it. */}
        <div className="pointer-events-none absolute inset-0 z-[800] overflow-hidden">
          {vehicleClusters.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-label={`Cluster of ${c.members.length} vehicles`}
              onClick={(e) => {
                e.stopPropagation()
                expandCluster(c)
              }}
              className="pointer-events-auto absolute cursor-pointer outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
              style={{ left: c.x, top: c.y, transform: 'translate(-50%, -50%)', zIndex: 3 }}
            >
              <ClusterBadge count={c.members.length} segments={c.segments} />
            </button>
          ))}
          {looseVehicles.map((m) => (
            <TruckMarker
              key={m.datum.key}
              x={m.point!.x}
              y={m.point!.y}
              state={m.datum.state}
              label={m.datum.label}
              meta={m.datum.meta}
              statusLabel={m.datum.statusLabel}
              active={selected === m.datum.index}
              dim={selected != null && selected !== m.datum.index}
              onClick={(e) => {
                e.stopPropagation()
                selectRoute(selected === m.datum.index ? null : m.datum.index)
              }}
            />
          ))}
          {tab === 'Plans' && flags?.start ? <Flag x={flags.start.x} y={flags.start.y} color="#1D2939" /> : null}
          {tab === 'Plans' && flags?.end ? <Flag x={flags.end.x} y={flags.end.y} color="#F04438" /> : null}
          {/* POI category markers — visible on every tab while the POI tool
              is open (`activeTool === 'poi'`) — only the CHECKED rows, LM's
              `PoiDrawer` contract — positioned by the same projection
              mechanism as the truck markers/flags above. */}
          {activeTool === 'poi' && poiPoints.map((poi, i) => {
            const p = poiPixelPoints[i]
            return p && checkedPoiIds.includes(poi.id) ? (
              <PoiCategoryMarker key={poi.id} x={p.x} y={p.y} category={poi.category} label={poi.name} />
            ) : null
          })}
        </div>

        {/* Telematics popup for the selected vehicle — Plans tab only
            (separate overlay so it isn't clipped by the marker overlay's
            overflow-hidden). */}
        {tab === 'Plans' && selected != null && showTooltip && points[selected] ? (
          <div className="pointer-events-none absolute inset-0 z-[900]">
            <TelematicsCard
              key={selected}
              x={points[selected]!.x}
              y={points[selected]!.y - 70}
              data={telematics[selected]}
              status={routes[selected].status}
              onClose={() => setShowTooltip(false)}
              onReportBreakdown={onReportBreakdown ? () => onReportBreakdown(buildReport(selected)) : undefined}
              onLocate={() => mapRef.current?.flyTo(VEHICLE_POSITIONS[selected])}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
