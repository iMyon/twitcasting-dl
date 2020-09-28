#!/usr/bin/env node

const program = require('commander');
const {TwitcastingDownloader} = require('./twitcasting-dl');

program.version(require('./package.json').version);

program
  .description('download twitcasting video')
  .option('<string>', 'url')
  .action(async ({args}) => {
    const url = args[0];
    await TwitcastingDownloader.download(url);
  })

program.parse(process.argv);
