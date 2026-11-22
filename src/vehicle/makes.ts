/**
 * Manual vehicle pick data (T2.2, FR-1.2b).
 * Common makes are surfaced first; the rest of the list is alphabetical.
 * Models are a curated (non-exhaustive) list per common make — free-text
 * entry is allowed everywhere so users are never blocked.
 */

/** Ordered common makes shown before the alphabetical tail (FR-1.2b). */
export const COMMON_MAKES: string[] = [
  'Toyota',
  'Kia',
  'Hyundai',
  'Ford',
  'Volkswagen',
  'BMW',
  'Mercedes-Benz',
  'Nissan',
  'Honda',
  'Chevrolet',
];

/** Curated model list per common make (filtered by search on step 2). */
export const MODELS_BY_MAKE: Record<string, string[]> = {
  Toyota: ['Corolla', 'Camry', 'RAV4', 'Highlander', 'Yaris', 'Prius', 'Hilux', 'Land Cruiser'],
  Kia: ['Rio', 'Forte', 'Cerato', 'Sportage', 'Sorento', 'Seltos', 'Picanto', 'Carnival'],
  Hyundai: ['Accent', 'Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'i10', 'i20', 'Creta'],
  Ford: ['Focus', 'Fiesta', 'Fusion', 'Escape', 'Explorer', 'Mustang', 'F-150', 'Ranger'],
  Volkswagen: ['Golf', 'Jetta', 'Passat', 'Polo', 'Tiguan', 'Touareg', 'Beetle', 'Touran'],
  BMW: ['3 Series', '5 Series', 'X1', 'X3', 'X5', '1 Series', '7 Series', 'M3'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'A-Class', 'CLA'],
  Nissan: ['Sentra', 'Altima', 'Maxima', 'X-Trail', 'Qashqai', 'Juke', 'Micra', 'Patrol'],
  Honda: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Jazz', 'Fit', 'City', 'Pilot'],
  Chevrolet: ['Spark', 'Aveo', 'Cruze', 'Malibu', 'Tahoe', 'Onix', 'Trax', 'Silverado'],
};

/** All makes: common first, then an alphabetical tail of other popular brands. */
export const ALL_MAKES: string[] = [
  ...COMMON_MAKES,
  ...[
    'Acura', 'Audi', 'Chery', 'Chrysler', 'Citroën', 'Dacia', 'Dodge', 'Fiat',
    'Geely', 'GMC', 'Haval', 'Infiniti', 'Isuzu', 'Jaguar', 'Jeep', 'Land Rover',
    'Lexus', 'Mazda', 'Mini', 'Mitsubishi', 'Opel', 'Peugeot', 'Porsche',
    'Ram', 'Renault', 'Seat', 'Škoda', 'Subaru', 'Suzuki', 'Tesla',
    'Volvo', 'Zotye',
  ].sort((a, b) => a.localeCompare(b)),
];

/** Min year accepted for manual entry. */
export const MIN_YEAR = 1990;

/** Max year accepted: current year + 1 (next model year). */
export const MAX_YEAR = new Date().getFullYear() + 1;
