#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';

// Parámetros:
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: <poFile> <textFile>');
    process.exit(1);
}

const poFilePath = path.resolve(args[0]);
if (!fs.existsSync(poFilePath)) {
    console.log(`File "${poFilePath}" does not exist.`);
    process.exit(1);
}
const poFileRS = readline.createInterface({
    input: fs.createReadStream(poFilePath)
});

const textFilePath = path.resolve(args[1]);
const textFileWS = fs.createWriteStream(textFilePath, {
    encoding: 'utf8'
});

(async () => {
    let ref = 0, match, comment;
    for await (const line of poFileRS) {
        if (match = line.match(/^#\s(.*)/)) {
            comment = match[1];
        } else if (match = line.match(/^msgid\s"(.+)"/)) {
            if (ref > 0) {
                textFileWS.write('\n');
            }
            textFileWS.write(`[[[#${++ref}]]]\n`);
            if (comment) {
                textFileWS.write(`[[[${comment}]]]\n`);
            }
            textFileWS.write(`${match[1].replaceAll('\\"', '"')}\n`);
        } else if (match = line.match(/^msgid_plural\s"(.+)"/)) {
            textFileWS.write(`[[[#${ref}p]]]\n`);
            textFileWS.write(`${match[1].replaceAll('\"', '"')}\n`);
        } else if (line === '') {
            comment = null;
        }
    }
    textFileWS.end();
})();
