import { FlowerCatalogMeta, FLOWER_CATALOG } from '../types/bouquet';

export type SeasonEventId =
  | 'christmas_holiday'
  | 'valentines_romance'
  | 'spring_blossom'
  | 'mothers_day_bloom'
  | 'autumn_harvest';

export interface SeasonalEventWindow {
  id: SeasonEventId;
  name: string;
  shortLabel: string;
  subtitle: string;
  /** Start month (1-12) and day (1-31) when the upcoming/active window opens */
  startMonth: number;
  startDay: number;
  /** End month (1-12) and day (1-31) when the seasonal event concludes */
  endMonth: number;
  endDay: number;
}

/**
 * Curated calendar of seasonal & holiday events.
 * The 'Seasonal' studio category only appears when the date falls within an
 * active or upcoming seasonal event window.
 */
export const SEASONAL_EVENT_WINDOWS: SeasonalEventWindow[] = [
  {
    id: 'christmas_holiday',
    name: 'Christmas & Winter Holidays',
    shortLabel: 'Seasonal · Holiday',
    subtitle: 'Festive Yuletide blooms, frosted evergreens & holiday keepsake charms',
    startMonth: 10,
    startDay: 25,
    endMonth: 1,
    endDay: 6,
  },
  {
    id: 'valentines_romance',
    name: "Valentine's & Season of Love",
    shortLabel: 'Seasonal · Romance',
    subtitle: 'Romantic keepsakes & winter-to-spring celebration accents',
    startMonth: 1,
    startDay: 18,
    endMonth: 2,
    endDay: 18,
  },
  {
    id: 'spring_blossom',
    name: 'Spring Equinox & Easter Bloom',
    shortLabel: 'Seasonal · Spring',
    subtitle: 'Vernal equinox blossoms & festive spring accents',
    startMonth: 3,
    startDay: 10,
    endMonth: 4,
    endDay: 22,
  },
  {
    id: 'mothers_day_bloom',
    name: "Mother's Day & May Garden",
    shortLabel: 'Seasonal · May',
    subtitle: 'Special celebration picks for Mother’s Day & spring milestones',
    startMonth: 4,
    startDay: 25,
    endMonth: 5,
    endDay: 20,
  },
  {
    id: 'autumn_harvest',
    name: 'Autumn Equinox & Harvest',
    shortLabel: 'Seasonal · Autumn',
    subtitle: 'Warm spiced botanicals, harvest citrus & golden equinox charms',
    startMonth: 9,
    startDay: 15,
    endMonth: 10,
    endDay: 24,
  },
];

function isMonthDayInRange(
  month: number,
  day: number,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number
): boolean {
  const current = month * 100 + day;
  const start = startMonth * 100 + startDay;
  const end = endMonth * 100 + endDay;

  if (start <= end) {
    return current >= start && current <= end;
  }
  // Crosses year boundary (e.g., Oct 25 -> Jan 6)
  return current >= start || current <= end;
}

/**
 * Returns the active or upcoming seasonal event for a given date, or `null` if
 * no seasonal event window is currently active/upcoming.
 */
export function getActiveSeasonalEvent(
  date: Date = new Date(),
  windows: SeasonalEventWindow[] = SEASONAL_EVENT_WINDOWS
): SeasonalEventWindow | null {
  const month = date.getMonth() + 1; // 1..12
  const day = date.getDate(); // 1..31

  for (const win of windows) {
    if (isMonthDayInRange(month, day, win.startMonth, win.startDay, win.endMonth, win.endDay)) {
      return win;
    }
  }
  return null;
}

/**
 * Returns true only when there is an active or upcoming season/event.
 */
export function isSeasonalCategoryAvailable(
  date: Date = new Date(),
  windows: SeasonalEventWindow[] = SEASONAL_EVENT_WINDOWS
): boolean {
  return getActiveSeasonalEvent(date, windows) !== null;
}

/**
 * Returns the seasonal catalog items when an upcoming/active season is present,
 * or an empty array when outside any seasonal window.
 */
export function getAvailableSeasonalCatalog(
  date: Date = new Date(),
  catalog: FlowerCatalogMeta[] = FLOWER_CATALOG,
  windows: SeasonalEventWindow[] = SEASONAL_EVENT_WINDOWS
): FlowerCatalogMeta[] {
  const activeEvent = getActiveSeasonalEvent(date, windows);
  if (!activeEvent) return [];
  return catalog.filter((item) => Boolean(item.isSeasonal));
}
