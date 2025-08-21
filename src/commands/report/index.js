const BaseCommand = require('../../lib/base-command') // <-- CHANGE THIS
const chalk = require('chalk')

class ReportIndexCommand extends BaseCommand { // <-- CHANGE THIS
  static summary = 'Commands for managing reports.';
  // ... (description can stay the same)

  async run() {
    // The header is now printed automatically. We remove the old RPT-CLI art.
    this.log(chalk.blueBright.bold('\n╭─ REPORT COMMANDS'));
    this.log(chalk.cyan('  ├─ megacli report:import'));
    this.log(chalk.gray('  │  └─ Import reports, datasets, filters, etc., from a patch folder.'));
    
    this.log(chalk.blueBright.bold('\n╰─ Run a command with --help for more info.'));
  }
}

module.exports = ReportIndexCommand