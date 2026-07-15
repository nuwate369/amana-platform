/**
 * قائمة الشركات الصانعة وموديلاتها — تُستخدم في قوائم منسدلة قابلة للبحث بشاشة KYC.
 * تُخزَّن القيمة المختارة كنصّ في `drivers.vehicle_make` / `vehicle_model`.
 * أسماء لاتينية (متعارف عليها عالميًّا) مرتّبة أبجديًّا؛ ركّزنا على السوق السعودي.
 */
export interface CarMake {
  make: string;
  models: string[];
}

export const CAR_MAKES: CarMake[] = [
  { make: 'Audi', models: ['A3', 'A4', 'A6', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron'] },
  { make: 'BMW', models: ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'X7'] },
  { make: 'BYD', models: ['Atto 3', 'Han', 'Seal', 'Song', 'Tang', 'Dolphin'] },
  { make: 'Cadillac', models: ['CT4', 'CT5', 'Escalade', 'XT4', 'XT5', 'XT6'] },
  { make: 'Changan', models: ['CS35', 'CS75', 'CS85', 'CS95', 'Eado', 'Alsvin', 'UNI-K', 'UNI-T'] },
  { make: 'Chery', models: ['Arrizo 5', 'Tiggo 4', 'Tiggo 7', 'Tiggo 8'] },
  { make: 'Chevrolet', models: ['Aveo', 'Blazer', 'Camaro', 'Captiva', 'Cruze', 'Malibu', 'Silverado', 'Suburban', 'Tahoe', 'Traverse', 'Trailblazer'] },
  { make: 'Chrysler', models: ['300', 'Pacifica'] },
  { make: 'Dodge', models: ['Challenger', 'Charger', 'Durango', 'Ram'] },
  { make: 'Ford', models: ['Bronco', 'Edge', 'Escape', 'Expedition', 'Explorer', 'F-150', 'Figo', 'Focus', 'Fusion', 'Mustang', 'Taurus', 'Territory'] },
  { make: 'Genesis', models: ['G70', 'G80', 'G90', 'GV70', 'GV80'] },
  { make: 'GMC', models: ['Acadia', 'Sierra', 'Terrain', 'Yukon'] },
  { make: 'Honda', models: ['Accord', 'City', 'Civic', 'CR-V', 'HR-V', 'Odyssey', 'Pilot'] },
  { make: 'Hyundai', models: ['Accent', 'Azera', 'Creta', 'Elantra', 'Palisade', 'Santa Fe', 'Sonata', 'Staria', 'Tucson', 'Venue', 'H-1'] },
  { make: 'Infiniti', models: ['Q50', 'Q60', 'QX50', 'QX60', 'QX80'] },
  { make: 'Isuzu', models: ['D-Max', 'MU-X'] },
  { make: 'Jaguar', models: ['E-Pace', 'F-Pace', 'XE', 'XF'] },
  { make: 'Jeep', models: ['Cherokee', 'Compass', 'Grand Cherokee', 'Wrangler'] },
  { make: 'Kia', models: ['Carnival', 'Cerato', 'K5', 'Pegas', 'Picanto', 'Rio', 'Seltos', 'Sonet', 'Sorento', 'Sportage', 'Telluride'] },
  { make: 'Land Rover', models: ['Defender', 'Discovery', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar'] },
  { make: 'Lexus', models: ['ES', 'GX', 'IS', 'LS', 'LX', 'NX', 'RX', 'UX'] },
  { make: 'Mazda', models: ['CX-3', 'CX-30', 'CX-5', 'CX-9', 'Mazda2', 'Mazda3', 'Mazda6'] },
  { make: 'Mercedes-Benz', models: ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'CLA', 'GLA', 'GLC', 'GLE', 'GLS', 'G-Class'] },
  { make: 'MG', models: ['MG5', 'MG6', 'RX5', 'ZS', 'HS'] },
  { make: 'Mitsubishi', models: ['ASX', 'Attrage', 'Eclipse Cross', 'L200', 'Montero Sport', 'Outlander', 'Pajero', 'Xpander'] },
  { make: 'Nissan', models: ['Altima', 'Kicks', 'Maxima', 'Micra', 'Navara', 'Pathfinder', 'Patrol', 'Sentra', 'Sunny', 'X-Trail'] },
  { make: 'Peugeot', models: ['2008', '3008', '301', '5008', '508'] },
  { make: 'Porsche', models: ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'] },
  { make: 'Renault', models: ['Captur', 'Duster', 'Koleos', 'Megane', 'Symbol'] },
  { make: 'Suzuki', models: ['Baleno', 'Ciaz', 'Dzire', 'Ertiga', 'Jimny', 'Swift', 'Vitara'] },
  { make: 'Toyota', models: ['4Runner', 'Avalon', 'Camry', 'Corolla', 'Fortuner', 'Hiace', 'Highlander', 'Hilux', 'Land Cruiser', 'Prado', 'RAV4', 'Rush', 'Yaris'] },
  { make: 'Volkswagen', models: ['Golf', 'Jetta', 'Passat', 'Tiguan', 'Touareg'] },
  { make: 'Volvo', models: ['S60', 'S90', 'XC40', 'XC60', 'XC90'] },
  { make: 'Other', models: ['Other'] },
];

/** أسماء الشركات فقط (لقائمة الاختيار الأولى). */
export const CAR_MAKE_NAMES: string[] = CAR_MAKES.map((m) => m.make);

/** موديلات شركة معيّنة (فارغة إن لم تُختَر شركة أو كانت غير معروفة). */
export function modelsForMake(make: string): string[] {
  return CAR_MAKES.find((m) => m.make === make)?.models ?? [];
}

/** سنوات الصنع من 2015 إلى العام الحالي (تنازليًّا: الأحدث أولًا). */
export function manufactureYears(currentYear: number): string[] {
  const years: string[] = [];
  for (let y = currentYear; y >= 2015; y--) years.push(String(y));
  return years;
}
