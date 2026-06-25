export function parseMarkdownToHtml(md: string): string {
  // Normalize line endings
  let html = md.replace(/\r\n/g, '\n');

  // Let's parse block elements
  // 1. Code blocks (```lang ... ```)
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre class="bg-slate-900 text-slate-100 p-4 rounded-lg my-4 overflow-x-auto font-mono text-xs"><code class="block whitespace-pre">${code.trim()}</code></pre>`;
  });

  // 2. Headings
  html = html.replace(/^###### (.*$)/gim, '<h6 class="text-xs font-bold text-white mt-4 mb-2">$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5 class="text-sm font-bold text-white mt-4 mb-2">$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4 class="text-base font-bold text-white mt-5 mb-2">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-white mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-8 mb-4 border-b border-slate-800 pb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-10 mb-6">$1</h1>');

  // 3. Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-indigo-500 pl-4 py-1 my-4 text-slate-400 italic">$1</blockquote>');

  // 4. List items processing line-by-line
  const lines = html.split('\n');
  let inList = false;
  let inNumList = false;
  let resultLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check code blocks or pre-processed html blocks
    if (line.startsWith('<pre') || line.startsWith('<h') || line.startsWith('<blockquote') || line.startsWith('</pre>') || line.startsWith('</code>') || line.startsWith('<div')) {
      if (inList) { resultLines.push('</ul>'); inList = false; }
      if (inNumList) { resultLines.push('</ol>'); inNumList = false; }
      resultLines.push(line);
      continue;
    }

    // Check bullet list
    const bulletMatch = line.match(/^[\*\-\+] (.*)/);
    if (bulletMatch) {
      if (inNumList) { resultLines.push('</ol>'); inNumList = false; }
      if (!inList) { resultLines.push('<ul class="list-disc list-inside space-y-1 my-3 text-slate-300">'); inList = true; }
      resultLines.push(`  <li>${bulletMatch[1]}</li>`);
      continue;
    }

    // Check numbered list
    const numMatch = line.match(/^\d+\. (.*)/);
    if (numMatch) {
      if (inList) { resultLines.push('</ul>'); inList = false; }
      if (!inNumList) { resultLines.push('<ol class="list-decimal list-inside space-y-1 my-3 text-slate-300">'); inNumList = true; }
      resultLines.push(`  <li>${numMatch[1]}</li>`);
      continue;
    }

    // Paragraph handling or empty lines
    if (line.trim() === '') {
      if (inList) { resultLines.push('</ul>'); inList = false; }
      if (inNumList) { resultLines.push('</ol>'); inNumList = false; }
      resultLines.push('');
    } else {
      if (inList) { resultLines.push('</ul>'); inList = false; }
      if (inNumList) { resultLines.push('</ol>'); inNumList = false; }
      // Wrap normal line in a paragraph if it's not already block html
      if (!line.startsWith('<') && !line.startsWith(' ') && !line.startsWith('\t')) {
        resultLines.push(`<p class="my-3 text-slate-300 leading-relaxed">${line}</p>`);
      } else {
        resultLines.push(line);
      }
    }
  }

  if (inList) resultLines.push('</ul>');
  if (inNumList) resultLines.push('</ol>');

  html = resultLines.join('\n');

  // Inline styling
  // Bold: **text** or __text__
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Inline code: `code`
  html = html.replace(/`(.*?)`/g, '<code class="bg-slate-900/60 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-[11px]">$1</code>');

  // Links: [text](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-indigo-400 hover:text-indigo-300 underline font-semibold transition-colors">$1</a>');

  return html;
}
