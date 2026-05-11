const fs = require('fs');
const path = require('path');

function replaceFile(filePath, replacements) {
    const p = path.resolve(__dirname, filePath);
    if (!fs.existsSync(p)) return;
    let content = fs.readFileSync(p, 'utf8');
    for (const { regex, replace } of replacements) {
        content = content.replace(regex, replace);
    }
    fs.writeFileSync(p, content, 'utf8');
}

replaceFile('src/components/ide/FileExplorer.jsx', [
    { regex: /headerBg,/g, replace: '' },
    { regex: /const { bg, panelBg, borderCol, textColor, accent } = themeDef;/g, replace: 'const { bg, borderCol, textColor, accent } = themeDef;' },
    { regex: /"Are you sure you want to delete "/g, replace: '"Are you sure you want to delete &quot;' },
    { regex: /"\?"/g, replace: '&quot;?"' }
]);
replaceFile('src/components/ide/SourceControlPanel.jsx', [
    { regex: /'s state/g, replace: "&apos;s state" },
    { regex: /'s sync/g, replace: "&apos;s sync" }
]);
replaceFile('src/components/ide/TerminalPanel.jsx', [
    { regex: /catch \(_\) { }/g, replace: 'catch (_) { /* ignore */ }' }
]);
replaceFile('src/components/ui/DiffModal.jsx', [
    { regex: /const { bg, borderCol, textColor, accent, inputBg } = themeDef;/g, replace: 'const { bg, borderCol, textColor, accent } = themeDef;' }
]);
replaceFile('src/hooks/useIDERoom.js', [
    { regex: /catch \(_\) { }/g, replace: 'catch (_) { /* ignore */ }' },
    { regex: /catch \(_\) \{\}/g, replace: 'catch (_) { /* ignore */ }' }
]);

console.log("More fixed");
