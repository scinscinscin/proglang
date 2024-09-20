import fs from "fs/promises";
import { Lexer } from "./lexer";
import { Parser } from "./Parser";
import { createStandardLibrary, Interpreter } from "./Interpreter";
import { ExecuteMainStatement } from "./Statement";

async function main() {
  const file = await fs.readFile("./examples/RunMe.java", "utf8");
  const lexer = new Lexer(file);
  const tokens = lexer.lex();

  const parser = new Parser(tokens);
  const statements = [...parser.parseRootLevel(), new ExecuteMainStatement()];

  const standardLibrary = createStandardLibrary();
  const interpreter = new Interpreter(standardLibrary);

  // console.log({ tokens, statements, standardLibrary, interpreter });
  for (const statement of statements) {
    statement.visit(interpreter);
  }
}

main();
