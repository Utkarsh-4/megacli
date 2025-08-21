const { Command } = require('@oclif/core')
const chalk = require('chalk')

// This is our shared header. All commands will use this.
const MEGA_CLI_HEADER = chalk.cyanBright(`
███╗   ███╗███████╗ ██████╗  █████╗        ██████╗██╗     ██╗
████╗ ████║██╔════╝██╔════╝ ██╔══██╗      ██╔════╝██║     ██║
██╔████╔██║█████╗  ██║  ███╗███████║█████╗██║     ██║     ██║
██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║╚════╝██║     ██║     ██║
██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║      ╚██████╗███████╗██║
╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝       ╚═════╝╚══════╝╚═╝
`)

class BaseCommand extends Command {
  async init() {
    // The init() method runs before the run() method of any command that extends it.
    // We clear the console for a cleaner look, then print the header.
    process.stdout.write('\u001B[2J\u001B[0;0f')
    this.log(MEGA_CLI_HEADER)
  }
}

module.exports = BaseCommand