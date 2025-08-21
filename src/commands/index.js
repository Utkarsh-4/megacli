const BaseCommand = require('../lib/base-command') // <-- CHANGE THIS
const chalk = require('chalk')

class IndexCommand extends BaseCommand { // <-- CHANGE THIS
  static description = 'Main entry point for the Mega CLI tool.';

  async run() {
    // The header is now printed automatically by the BaseCommand.
    // This method just needs to print the topic list.
    this.log(chalk.cyan('      A unified tool for system operations and automation.\n'));

    this.log(chalk.blueBright.bold('╭─ AVAILABLE TOPICS'));
    this.log(chalk.green('  ├─ report'));
    this.log(chalk.gray('  │  └─ Tools for importing and managing report configurations.'));
    
    this.log(chalk.yellow('\n  ├─ jmeter ') + chalk.dim('[Coming Soon]'));
    this.log(chalk.gray('  │  └─ Automate JMeter performance testing scripts.'));

    this.log(chalk.yellow('\n  ├─ system-config ') + chalk.dim('[Coming Soon]'));
    this.log(chalk.gray('  │  └─ Configure any product in One Go (One-Click).'));
    
    this.log(chalk.blueBright.bold('\n╰─ Type a topic name for more specific commands (e.g., megacli report)'));
  }
}

module.exports = IndexCommand;