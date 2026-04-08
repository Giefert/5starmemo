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

// Strip HTML tags for plain text preview
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
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
