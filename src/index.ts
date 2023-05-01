#!/usr/bin/env node
import yargs from "yargs/yargs";
import chalk from "chalk";
import inquirer from "inquirer";
import selfge from "./selfge.js";
import Conf from "conf";

const config = new Conf<{ username: string; password: string }>({
  projectName: "self-cli",
});

const subDomain: string = config.get("subDomain");

const self = selfge(subDomain);

async function auth(username?: string, password?: string) {
  if (!username || !password) {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "username",
        message: "Enter your username:",
        when: () => !username,
      },
      {
        type: "password",
        name: "password",
        message: "Enter your password:",
        when: () => !password,
      },
    ]);

    username = answers.username || username;
    password = answers.password || password;

    if (!username || !password) {
      console.log(chalk.red("You must provide username and password"));
      process.exit(1);
    }
  }

  await self.login(username, password);

  config.set("username", username);
  config.set("password", password);

  console.log(chalk.green(`Authenticated as ${username}`));
}

async function status() {
  const username = config.get("username");
  const password = config.get("password");

  if (!username || !password) {
    console.log(
      chalk.red(
        "You must authenticate first. Run `self-cli auth` to authenticate"
      )
    );

    process.exit(1);
  }

  await self.login(username, password);

  const status = await self.getJobStatus();

  console.log(
    chalk.green(`${username}'s status is currently set to`),
    chalk.bold.underline(status)
  );
}

async function setStatus(newStatus: "on" | "off") {
  const username = config.get("username");
  const password = config.get("password");

  if (!username || !password) {
    console.log(
      chalk.red(
        "You must authenticate first. Run `self-cli auth` to authenticate"
      )
    );

    process.exit(1);
  }

  await self.login(username, password);

  if (newStatus === "on") {
    await self.startJob();
  } else {
    await self.endJob();
  }

  console.log(
    chalk.green(`${username}'s status is now set to`),
    chalk.bold.underline(newStatus)
  );
}

yargs(process.argv.slice(2))
  .middleware((argv) => {
    if (argv._[0] !== "init") {
      const subDomain = config.get("subDomain");

      if (!subDomain) {
        console.log(
          chalk.red(
            "You must initialize the CLI first. Run `self-cli init <subdomain>` to initialize"
          )
        );
      }
    }
  })
  .usage("Usage: $0 <command> [options]")
  .command<{ subdomain: string }>(
    "init <subdomain>",
    "Initialize the CLI",
    (yargs) => {
      yargs.positional("subdomain", {
        type: "string",
        description: "Your self.ge subdomain",
      });
    },
    (argv) => {
      config.set("subDomain", argv.subdomain);
    }
  )
  .command<{ username: string; password: string }>(
    "auth",
    "Authenticate with your credentials",
    (yargs) => {
      yargs
        .option("username", {
          alias: "u",
          type: "string",
          description: "Your username",
        })
        .option("password", {
          alias: "p",
          type: "string",
          description: "Your password",
        });
    },
    (argv) => {
      auth(argv.username, argv.password);
    }
  )
  .command(
    "status",
    "Display the user status",
    () => {},
    () => {
      status();
    }
  )
  .command<{
    status: "on" | "off";
  }>(
    "set-status <status>",
    "Set the user status",
    (yargs) => {
      yargs.positional("status", {
        type: "string",
        choices: ["on", "off"],
        description: "The new status to set",
      });
    },
    (argv) => {
      setStatus(argv.status);
    }
  )
  .help()
  .alias("help", "h")
  .demandCommand(1, "You need at least one command before moving on")
  .strict().argv;
