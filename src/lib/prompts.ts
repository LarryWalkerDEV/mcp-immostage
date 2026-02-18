export const VALID_STYLES = [
  'modern',
  'scandinavian',
  'classic',
  'minimal',
  'luxury',
] as const;

export const VALID_ROOM_TYPES = [
  'living_room',
  'bedroom',
  'kitchen',
  'bathroom',
  'office',
  'other',
] as const;

export type StagingStyle = (typeof VALID_STYLES)[number];
export type RoomType = (typeof VALID_ROOM_TYPES)[number];

export function STAGING_PROMPT_TEMPLATE(style: string): string {
  return `stage this image in a ${style} style and change only the interior keep image consistent`;
}

export const FLOOR_PLAN_PROMPT = `Transform this 2D floor plan into a stunning 3D isometric cutaway view.

**Style**: Clean, professional architectural rendering with soft lighting
**Perspective**: 45-degree isometric angle with roof removed for interior visibility
**Walls**: Visible internal walls at half-height showing room divisions
**Flooring**: Realistic materials - hardwood for living areas, tile for bathrooms/kitchen
**Furniture**: Tasteful, modern furniture placement matching room functions
**Colors**: Warm, inviting palette with neutral walls and accent furnishings
**Lighting**: Soft ambient light suggesting daytime, subtle shadows for depth
**Quality**: High-resolution, publication-ready real estate marketing material

Keep room proportions accurate to the original floor plan.`;

export const CLASSIFICATION_PROMPT = `Classify this image for a real estate virtual staging app. Return ONLY valid JSON:
{
  "classification": "interior_empty" | "interior_furnished" | "floor_plan" | "exterior" | "not_real_estate",
  "roomType": "living_room" | "bedroom" | "kitchen" | "bathroom" | "office" | "other",
  "confidence": 0.0-1.0,
  "suggestedStyle": "modern" | "scandinavian" | "classic" | "minimal" | "luxury",
  "isEmpty": true/false,
  "rejectReason": null | "not_real_estate" | "exterior" | "blurry" | "too_dark"
}
Rules:
- interior_empty: Room with no/minimal furniture → ACCEPT
- interior_furnished: Room with furniture → ACCEPT
- floor_plan: 2D architectural drawing → ACCEPT (roomType "other")
- exterior: Outdoor/building photo → REJECT
- not_real_estate: Not property photo → REJECT
Return ONLY JSON, no markdown.`;

export const LISTING_SYSTEM_PROMPT = `Du bist ein erfahrener Immobilienmakler in Deutschland mit 15 Jahren Erfahrung.
Deine Aufgabe ist es, aus einfachen Objektdaten einen ansprechenden, emotionalen Beschreibungstext zu erstellen.

Wichtige Regeln:
- Schreibe auf Deutsch, professionell aber warm
- Keine übertriebenen Superlative oder leere Phrasen
- Fokus auf echte Vorteile und Lifestyle-Aspekte

Antworte als JSON:
{
  "tldr": "Kurze Zusammenfassung (2-3 Sätze)",
  "description": "Der vollständige Beschreibungstext",
  "keyFeatures": ["Feature 1", "Feature 2", ...]
}`;
