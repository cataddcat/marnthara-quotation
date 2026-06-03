// scripts/babel-plugin-data-loc.cjs
//
// Dev-only Babel plugin: เติม attribute  data-loc="<relativePath>:<line>:<col>"
// ให้ JSX host element (เช่น <div>, <span>) เพื่อให้ DevInspector แม็พ
// "สิ่งที่เห็นบนจอ" → "ไฟล์:บรรทัด" ได้
//
// เปิดใช้เฉพาะตอน `vite serve` (ดู vite.config.ts) — prod build ไม่โหลด plugin นี้
// React 19 ไม่มี Fiber _debugSource แล้ว จึงต้องฝังตำแหน่งลง DOM แทนการไต่ Fiber

const path = require('path');

const ATTR = 'data-loc';

module.exports = function babelPluginDataLoc({ types: t }) {
  return {
    name: 'data-loc',
    visitor: {
      JSXOpeningElement(nodePath, state) {
        const nameNode = nodePath.node.name;
        // เฉพาะ host element: ชื่อเป็น JSXIdentifier ขึ้นต้นด้วยตัวพิมพ์เล็ก
        // (ตัวพิมพ์ใหญ่ = React component, member expr = ข้าม — attribute จะไม่ลง DOM)
        if (!nameNode || nameNode.type !== 'JSXIdentifier') return;
        if (!/^[a-z]/.test(nameNode.name)) return;

        // ข้ามถ้ามี data-loc อยู่แล้ว
        const exists = nodePath.node.attributes.some(
          (a) => t.isJSXAttribute(a) && a.name && a.name.name === ATTR
        );
        if (exists) return;

        const loc = nodePath.node.loc;
        const filename = state.file && state.file.opts && state.file.opts.filename;
        if (!loc || !filename) return;

        const rel = path.relative(process.cwd(), filename).split(path.sep).join('/');
        const value = `${rel}:${loc.start.line}:${loc.start.column + 1}`;

        nodePath.node.attributes.push(
          t.jsxAttribute(t.jsxIdentifier(ATTR), t.stringLiteral(value))
        );
      },
    },
  };
};
