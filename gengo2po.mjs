#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';

// Parámetros:
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: <textFile> <poFile>');
    process.exit(1);
}

// Se resuelven las rutas:
const txtFilePath = path.resolve(args[0]);
if (!fs.existsSync(txtFilePath)) {
    console.log(`File "${txtFilePath}" does not exist.`);
    process.exit(1);
}

const poFilePath = path.resolve(args[1]);
if (!fs.existsSync(poFilePath)) {
    console.log(`File "${poFilePath}" does not exist.`);
    process.exit(1);
}

// Se leen las cadenas traducidas del fichero de texto en formato Gengo:
const strMap = await (async () => {
    const txtFileRS = readline.createInterface({
        input: fs.createReadStream(txtFilePath)
    });
    const map = {};
    let ref, match;
    for await (const line of txtFileRS) {
        if (!line) {
            continue;
        }
        if (match = line.match(/^\[\[\[(?:#(\d+p?)\]\]\])?/)) {
            if (match[1]) {
                ref = match[1];
            }
        } else if (ref) {
            map[ref] = line;
        }
    }
    return map;
})();
console.log(`${Object.keys(strMap).length} strings.`);


const poExt = path.extname(poFilePath);
const poFile2Path = path.resolve(path.dirname(poFilePath), `${path.basename(poFilePath, poExt)}.tmp${poExt}`);

(async () => {
    const poFile2WS = fs.createWriteStream(poFile2Path, {
        encoding: 'utf8'
    });

    // Leemos el fichero .po destino línea por línea generando el nuevo fichero introduciendo las cadenas traducidas.
    let ref = 0, str, match;
    const poFileRS = readline.createInterface({
        input: fs.createReadStream(poFilePath)
    });
    for await (const line of poFileRS) {
        if (match = line.match(/^msgid\s"(.+)"/)) {
            ref++;
        } else if (ref && (match = line.match(/^msgstr(?:\[([0-1])\])?\s".*"/))) {
            str = strMap[`${ref}${match[1] === '1' && 'p' || ''}`].replace('"', '\\"');
            poFile2WS.write(`msgstr${match[1] && `[${match[1]}]` || ''} "${str}"\n`)
            continue;
        }
        poFile2WS.write(`${line}\n`);
    }

    // Se guarda el fichero original añadiendo la extensión .bak y renombramos el fichero creado.
    fs.renameSync(poFilePath, `${poFilePath}.bak`);
    fs.renameSync(poFile2Path, poFilePath);
})();