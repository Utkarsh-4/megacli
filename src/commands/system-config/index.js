const BaseCommand = require('../../lib/base-command') // <-- CHANGE THIS
const chalk = require('chalk')
const boxen = require('boxen')

class SystemConfigIndexCommand extends BaseCommand { // <-- CHANGE THIS
  static description = 'Commands for one-click system configuration.';

  async run() {
    // The header is now handled by the BaseCommand.
    // This method just displays the status of this topic.
    this.log(boxen(
      `${chalk.yellow.bold('Feature Coming Soon')}\n\nThis command topic is currently under development.`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'yellow',
        title: 'System Configuration',
        titleAlignment: 'center',
      }
    ));
  }
}

module.exports = SystemConfigIndexCommand;