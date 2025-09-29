#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const argv = yargs(hideBin(process.argv))
  .option('in', {
    alias: 'i',
    type: 'string',
    describe: 'Path to the input CSV file',
    demandOption: true,
  })
  .option('out', {
    alias: 'o',
    type: 'string',
    describe: 'Filename to output the result CSV to',
    demandOption: true,
  })
  .help().argv;

const inputPath = path.resolve(argv.in);
const outputPath = path.resolve(argv.out);

const lfbisMap = new Map();

const rl = readline.createInterface({
  input: fs.createReadStream(inputPath),
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  const [inspirePath, lfbisPrimary, lfbisSecondary] = line.split(',');
  const parts = inspirePath.split('/');
  const localId = parts[parts.length - 2];

  if (lfbisPrimary) {
    lfbisMap.set(`${lfbisPrimary}|${localId}`, { lfbis: lfbisPrimary, localId });
  }
  if (lfbisSecondary) {
    lfbisMap.set(`${lfbisSecondary}|${localId}`, { lfbis: lfbisSecondary, localId });
  }
});

rl.on('close', () => {
  const output = ['lfbis,localId'];
  for (const { lfbis, localId } of lfbisMap.values()) {
    output.push(`${lfbis},${localId}`);
  }
  const outputStream = fs.createWriteStream(outputPath);
  outputStream.write(output[0] + '\n');
  for (let i = 1; i < output.length; i++) {
    outputStream.write(output[i] + '\n');
  }
  outputStream.end();
  outputStream.on('finish', () => {
    console.log(`Output written to ${outputPath}`);
  });
});
