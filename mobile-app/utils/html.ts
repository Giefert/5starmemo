import {
  HTMLElementModel,
  HTMLContentModel,
} from 'react-native-render-html';

// Custom element model to ensure span is treated as textual/phrasing content
export const customHTMLElementModels = {
  span: HTMLElementModel.fromCustomModel({
    tagName: 'span',
    contentModel: HTMLContentModel.textual,
  }),
};

// Decode the HTML entities TipTap commonly emits
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&'); // last, so double-encoded entities survive
}

// Strip HTML tags to plain text, preserving line breaks between blocks
export function stripHtml(html: string): string {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n') // line breaks
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n') // block boundaries
    .replace(/<[^>]*>/g, '');
  return decodeEntities(text)
    .replace(/[ \t]+/g, ' ') // collapse runs of spaces/tabs
    .replace(/ *\n */g, '\n') // trim spaces around line breaks
    .replace(/\n{2,}/g, '\n') // collapse blank lines
    .trim();
}

// Convert inline font-size styles to classes for reliable rendering
function convertFontSizeToClass(html: string): string {
  return html
    .replace(/style="[^"]*font-size:\s*32px[^"]*"/g, 'class="font-largest"')
    .replace(/style="[^"]*font-size:\s*24px[^"]*"/g, 'class="font-larger"')
    .replace(/style="[^"]*font-size:\s*20px[^"]*"/g, 'class="font-large"');
}

// Clean up HTML from TipTap - preserve line breaks and normalize list structure
export function cleanHtml(html: string): string {
  let cleaned = html
    .replace(/<p><\/p>/g, '<p>&nbsp;</p>')
    .replace(/<p>\s*<\/p>/g, '<p>&nbsp;</p>')
    .replace(/<p><br\s*\/?><\/p>/g, '<p>&nbsp;</p>')
    .replace(/<br\s*\/?>\s*<li>/g, '<li>')
    .replace(/<li>\s*<p[^>]*>/g, '<li>')
    .replace(/<\/p>\s*<\/li>/g, '</li>')
    .replace(/>\s+</g, '><')
    .trim();

  return convertFontSizeToClass(cleaned);
}
