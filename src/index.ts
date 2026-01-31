#!/usr/bin/env bun
import { Command } from "commander";
import { createAuthCommand } from "./commands/auth";
import { createGetCommand } from "./commands/get";
import { createExportCommand } from "./commands/export";
import { createUpdateCommand } from "./commands/update";

const program = new Command();

program
  .name("oura")
  .description("CLI tool for accessing Oura Ring data")
  .version("1.0.0");

// Add commands
program.addCommand(createAuthCommand());
program.addCommand(createGetCommand());
program.addCommand(createExportCommand());
program.addCommand(createUpdateCommand());

// Parse arguments
program.parse();
