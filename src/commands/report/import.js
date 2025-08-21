const BaseCommand = require('../../lib/base-command');
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');
const FormData = require('form-data');
const https = require('https');
const ora = require('ora');
const boxen = require('boxen');
const logger = require('../../lib/logger');

class ImportCommand extends BaseCommand {
  static summary = 'Import and merge report configurations from a patch folder.';
  static description = `
This command performs a full import process for a given report patch.
It backs up existing standard files, imports new report designs (.zip),
and intelligently merges or updates datasets, filters, wrappers, and global SQL files.
  `;
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '# Oclif will prompt you to select one or more patch folders from ./data/report/patch/',
  ];

  async run() {
    logger.info('Import command started.');
    try {
      this.logSection('📂 Select Patch');
      // const reportDataPath = path.resolve('data/report');
      // NEW WAY (Correct)
      const reportDataPath = path.join(this.config.root, 'data/report');
      const configPath = path.join(reportDataPath, 'config.json');
      if (!fs.existsSync(configPath)) this.error(chalk.red(`❌ config.json not found.`));
      const config = fs.readJsonSync(configPath);
      const stdPaths = config.paths;

      const patchRoot = path.join(reportDataPath, 'patch');
      if (!fs.existsSync(patchRoot)) this.error(chalk.red(`❌ Patch folder not found.`));

      const patchFolders = fs.readdirSync(patchRoot).filter(f => fs.statSync(path.join(patchRoot, f)).isDirectory());
      if (patchFolders.length === 0) this.error(chalk.red('❌ No patch folders found in ./data/report/patch'));

      const { chosenPatches } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'chosenPatches',
        message: 'Select the patch folder(s) to import (use spacebar to select):',
        choices: patchFolders,
      }]);

      logger.info(`User selected patches: ${chosenPatches.join(', ')}`);

      if (chosenPatches.length === 0) {
        this.log('\nNo patch folders selected. Exiting.');
        logger.warn('No patches selected by user. Exiting.');
        return;
      }

      for (const chosenPatch of chosenPatches) {
        logger.info(`--- Processing Patch: ${chosenPatch} ---`);
        this.log(chalk.magenta.bold(`\n\n--- Processing Patch: ${chosenPatch} ---`));
        const patchPath = path.join(patchRoot, chosenPatch);

        this.logSection('📦 Backing up standard files');
        const backupSpinner = ora('Preparing backup...').start();
        const backupDir = path.join(reportDataPath, 'backup', `backup-${Date.now()}`);
        fs.ensureDirSync(backupDir);
        let backupCount = 0;
        for (const key of Object.keys(stdPaths)) {
          if (fs.existsSync(stdPaths[key])) {
            fs.copyFileSync(stdPaths[key], path.join(backupDir, path.basename(stdPaths[key])));
            backupCount++;
          }
        }
        backupSpinner.succeed(`Backed up ${backupCount} files to ${chalk.dim(backupDir)}`);
        logger.info(`Backed up ${backupCount} files to ${backupDir}`);

        this.logSection('📤 Importing Reports');
        const designFolder = path.join(patchPath, 'design');
        if (fs.existsSync(designFolder)) {
          const zipFiles = fs.readdirSync(designFolder).filter(f => f.endsWith('.zip'));
          if (zipFiles.length > 0) {
            for (const chosenFile of zipFiles) {
              await this.importReport(designFolder, chosenFile);
            }
          } else {
            this.log(chalk.gray('  └─ No .zip files found to import.'));
            logger.info('No .zip files found to import.');
          }
        } else {
          this.log(chalk.gray('  └─ No design folder found.'));
          logger.info('No design folder found in patch.');
        }

        this.logSection('🔄 Merging Files');
        await this.performMerge('Datasets', 'datasets', '.js', stdPaths.datasets, patchPath, this.mergeDataset);
        await this.performMerge('Filters', 'filters', '.json', stdPaths.filters, patchPath, this.mergeJson);
        await this.performMerge('Wrappers', 'wrappers', '.js', stdPaths.wrappers, patchPath, this.mergeJs);
        await this.performMerge('GlobalSQL', 'globalsql', '.js', stdPaths.globalsql, patchPath, this.mergeJs);
      }
      
      this.logSection('🎉 Finished');
      this.log(boxen(chalk.green.bold('✨ All selected patches processed successfully!'), { padding: 1, margin: {left: 2}, borderStyle: 'round', borderColor: 'green' }));
      logger.info('All selected patches processed successfully!');

    } catch (err) {
      logger.error('An unexpected error occurred in the run method.', { error: err.message, stack: err.stack });
      this.error(boxen(`${chalk.red.bold('An unexpected error occurred.')}\n\n${chalk.gray(err.stack || err.message)}`, {
        padding: 1, margin: 1, borderStyle: 'double', borderColor: 'red', title: 'Fatal Error', titleAlignment: 'center',
      }));
    }
  }

  logSection(title) {
    this.log(chalk.blueBright.bold(`\n╭─ ${title}`));
  }

  async performMerge(title, folderName, extension, stdFile, patchRoot, mergeFn) {
    const spinner = ora(`Checking for ${title}...`).start();
    const patchFolder = path.join(patchRoot, folderName);

    if (!fs.existsSync(patchFolder) || !fs.existsSync(stdFile)) {
      spinner.info(chalk.gray(`Skipping ${title} (source or destination missing).`));
      logger.warn(`Skipping merge for ${title} because source or destination is missing.`);
      return;
    }

    const patchFiles = fs.readdirSync(patchFolder).filter(f => f.endsWith(extension));
    if (patchFiles.length === 0) {
      spinner.info(`No ${title} found to merge.`);
      logger.info(`No ${title} files found to merge in patch.`);
      return;
    }
    
    spinner.text = `Processing ${patchFiles.length} ${title} file(s)...`;
    let changedCount = 0;
    let skippedCount = 0;

    for (const file of patchFiles) {
      const wasChanged = mergeFn.call(this, stdFile, path.join(patchFolder, file));
      if (wasChanged) {
        changedCount++;
      } else {
        skippedCount++;
      }
    }

    let resultMessage = title + ': ';
    if (changedCount > 0) resultMessage += `${changedCount} changed. `;
    if (skippedCount > 0) resultMessage += `${skippedCount} skipped.`;
    if (changedCount === 0 && skippedCount > 0) resultMessage = `${title}: No changes found.`;
    
    spinner.succeed(resultMessage.trim());
    logger.info(`Merge result for ${title}: ${resultMessage.trim()}`);
  }

  async importReport(designFolder, chosenFile) {
    const spinner = ora(`Importing report: ${chalk.cyan(chosenFile)}`).start();
    const sessionid = 'idealonline';
    const form = new FormData();
    form.append('txtRptimport', fs.createReadStream(path.join(designFolder, chosenFile)));
    const url = `https://127.0.0.1/REPORTING/Framewrk/Event.jsp?m=V218&v=V218&event=iRM.importReportConfig&filename=${chosenFile}&sessionid=${sessionid}`;
    
    try {
      const res = await axios.post(url, form, { 
        headers: form.getHeaders(), 
        httpsAgent: new https.Agent({ rejectUnauthorized: false }) ,
        timeout: 10000
      });

      if (res.status === 200 && res.data) {
        const responseMessage = typeof res.data === 'object' ? JSON.stringify(res.data) : String(res.data);
        if (responseMessage.toLowerCase().includes('success') && !responseMessage.toLowerCase().includes('unsuccess')) {
          spinner.succeed(`Imported: ${chalk.cyan(chosenFile)}`);
          logger.info(`[Import] Successfully imported report: ${chosenFile}`);
        } else if (responseMessage.toLowerCase().includes('exist')) {
          spinner.warn(`Skipped (already exists): ${chalk.cyan(chosenFile)}`);
          logger.warn(`[Import] Skipped report (already exists): ${chosenFile}`);
        } else {
          spinner.fail(`Failed ${chalk.cyan(chosenFile)}: ${responseMessage.trim()}`);
          logger.error(`[Import] Failed to import report: ${chosenFile}`, { response: responseMessage.trim() });
        }
      } else {
        spinner.fail(`API request failed for ${chalk.cyan(chosenFile)} (Status: ${res.status})`);
        logger.error(`[Import] API request failed for ${chosenFile}`, { status: res.status });
      }
    } catch (error) {
      spinner.fail(`Network error for ${chalk.cyan(chosenFile)}`);
      logger.error(`[Import] Network error for ${chosenFile}`, { error: error.message });
      this.log(chalk.gray(`  └─ Reason: ${error.message}`));
    }
  }

  mergeDataset(stdFile, patchFile) {
    let stdContent = fs.readFileSync(stdFile, 'utf-8');
    const patchContent = fs.readFileSync(patchFile, 'utf-8').trim();
    const keyMatch = patchContent.match(/^\s*"([^"]+)"/);
    if (!keyMatch) return false;
    const datasetKey = keyMatch[1];
    const blockRegex = new RegExp(`"${datasetKey}"\\s*:\\s*\\{([^{}]|\\{[^{}]*\\})*\\}`, 'g');

    if (blockRegex.test(stdContent)) {
      const existingBlock = stdContent.match(blockRegex)[0];
      const normalizedExisting = existingBlock.replace(/\s/g, '');
      const normalizedPatch = patchContent.replace(/\s/g, '');

      if (normalizedExisting === normalizedPatch) {
        logger.info(`[Merge-Dataset] Skipped (no changes): ${datasetKey}`);
        return false;
      } else {
        const updatedContent = stdContent.replace(blockRegex, patchContent);
        fs.writeFileSync(stdFile, updatedContent, 'utf-8');
        logger.info(`[Merge-Dataset] Updated: ${datasetKey}`);
        return true;
      }
    } else {
      const updatedContent = stdContent.replace(/}\);?\s*$/, match => `,\n${patchContent}\n${match}`);
      fs.writeFileSync(stdFile, updatedContent, 'utf-8');
      logger.info(`[Merge-Dataset] Inserted new: ${datasetKey}`);
      return true;
    }
  }

  mergeJson(stdFile, patchFile) {
    let stdContent = fs.readFileSync(stdFile, 'utf-8');
    const patchContent = fs.readFileSync(patchFile, 'utf-8').trim();
    const keyMatch = patchContent.match(/^\s*"([^"]+)"/);
    if (!keyMatch) return false;
    const filterKey = keyMatch[1];
    const blockRegex = new RegExp(`"${filterKey}"\\s*:\\s*\\{([^{}]|\\{[^{}]*\\})*\\}`, 'g');

    if (blockRegex.test(stdContent)) {
      const existingBlock = stdContent.match(blockRegex)[0];
      const normalizedExisting = existingBlock.replace(/\s/g, '');
      const normalizedPatch = patchContent.replace(/\s/g, '');

      if (normalizedExisting === normalizedPatch) {
        logger.info(`[Merge-Filter] Skipped (no changes): ${filterKey}`);
        return false;
      } else {
        const updatedContent = stdContent.replace(blockRegex, patchContent);
        fs.writeFileSync(stdFile, updatedContent, 'utf-8');
        logger.info(`[Merge-Filter] Updated: ${filterKey}`);
        return true;
      }
    } else {
      const updatedContent = stdContent.replace(/}\s*$/, match => `,\n${patchContent}\n${match}`);
      fs.writeFileSync(stdFile, updatedContent, 'utf-8');
      logger.info(`[Merge-Filter] Inserted new: ${filterKey}`);
      return true;
    }
  }

  mergeJs(stdFile, patchFile) {
    const stdContent = fs.readFileSync(stdFile, 'utf-8');
    const patchContent = fs.readFileSync(patchFile, 'utf-8').trim();
    const patchFileName = path.basename(patchFile);
    if (stdContent.includes(patchContent)) {
      logger.info(`[Merge-JS] Skipped (already exists): ${patchFileName}`);
      return false;
    }
    const updated = `${stdContent.trim()}\n\n// --- merged from ${patchFileName} ---\n${patchContent}\n`;
    fs.writeFileSync(stdFile, updated, 'utf-8');
    logger.info(`[Merge-JS] Appended content from: ${patchFileName}`);
    return true;
  }
}

module.exports = ImportCommand;