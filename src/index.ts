import fs from "fs/promises";
import { Token, Lexer, TokenType } from "./lexer";

abstract class Value {}

class Environment {
  parent?: Environment;
  underlying: Map<string, Value>;

  constructor(parent?: Environment) {
    this.parent = parent;
  }

  getValue(name: string) {
    if (this.underlying.has(name)) return this.underlying.get(name);
    else if (this.parent) return this.parent.getValue(name);
    else throw new Error("Undefined variable");
  }
}

class Interpreter {
  environment: Environment;
}

abstract class Statement {
  abstract visit(interpreter: Interpreter);
}

const accessModifiers = ["public", "private", "protected", "package-private"] as const;
type AccessModifier = (typeof accessModifiers)[number];
const isAccessModifier = (keyword: string): keyword is AccessModifier =>
  accessModifiers.includes(keyword as AccessModifier);

type TypeDefinition = { base: Token; dim: number };

class ImportStatement extends Statement {
  path: string[] = [];

  constructor(path: string[]) {
    super();
    this.path = path;
  }

  visit(interpreter: Interpreter) {}
}

class Parser {
  tokens: Token[];
  statements: Statement[] = [];
  currentTokenIndex = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseRootLevel() {
    this.statements = [];

    while (this.currentTokenIndex < this.tokens.length) {
      const currentToken = this.tokens[this.currentTokenIndex];

      if (currentToken.type === "KEYWORD" && currentToken.keyword === "import") this.parseImportStatement();
      else if (currentToken.type === "KEYWORD" && currentToken.keyword === "class") this.parseClassDeclaration();
      else {
        console.log("Unhandled token", currentToken);
        this.currentTokenIndex++;
      }
    }

    return this.statements;
  }

  parseImportStatement() {
    this.currentTokenIndex++;

    // build the fully qualified path
    const path = [] as string[];

    while (this.currentTokenIndex < this.tokens.length) {
      const part = this.expect("IDENTIFIER", "STAR");
      path.push(part.lexeme);

      if (!this.isNext("DOT")) break;
      else if (this.isNext("DOT")) this.currentTokenIndex++;
    }

    this.expect("SEMICOLON");
    this.statements.push(new ImportStatement(path));
  }

  parseClassDeclaration() {
    this.currentTokenIndex++;
    const name = this.expect("IDENTIFIER");
    console.log("Parsing class declaration", name);
    this.expect("LBRACE");

    while (!this.isNext("RBRACE")) {
      // parse methods
      const methodDeclaration = this.parseMethodDeclaration();
    }

    this.expect("RBRACE");
    console.log(name);
  }

  parseMethodDeclaration() {
    console.log("Parsing method declaration", this.tokens[this.currentTokenIndex]);

    let accessModifier: AccessModifier = "package-private";
    let isStatic = false;

    if (this.isNext("IDENTIFIER") && isAccessModifier(this.tokens[this.currentTokenIndex].lexeme)) {
      accessModifier = this.tokens[this.currentTokenIndex].lexeme as AccessModifier;
      this.currentTokenIndex++;
    }

    if (this.isNext("IDENTIFIER") && this.tokens[this.currentTokenIndex].lexeme === "static") {
      isStatic = true;
      this.currentTokenIndex++;
    }

    const returnType = this.expect("IDENTIFIER");
    const methodName = this.expect("IDENTIFIER");
    const parameters = this.parseParameterList();

    console.log({ accessModifier, isStatic, returnType, methodName, parameters });

    this.expect("LBRACE");
    const body: Statement[] = [];

    // begin parsing method body
    while (!this.isNext("RBRACE")) {
      const statement = this.parseRootLevel();
      body.push(...statement);
    }

    this.currentTokenIndex++;
  }

  parseType(): TypeDefinition {
    const base = this.expect("IDENTIFIER");
    let dim = 0;

    while (this.isNext("LBRACKET")) {
      this.currentTokenIndex++;
      this.expect("RBRACKET");
      dim++;
    }

    return { base, dim };
  }

  parseParameterList() {
    this.expect("LPAREN");
    const parameters = [] as { type: TypeDefinition; name: Token }[];

    while (!this.isNext("RPAREN")) {
      const type = this.parseType();
      const name = this.expect("IDENTIFIER");

      parameters.push({ type, name });
      if (this.isNext("COMMA")) {
        this.currentTokenIndex++;
        continue;
      } else if (this.isNext("RPAREN")) {
        this.currentTokenIndex++;
        break;
      } else throw new Error("Unexpected token");
    }

    return parameters;
  }

  expect(...type: TokenType[]) {
    const currentToken = this.tokens[this.currentTokenIndex];

    if (type.includes(currentToken.type)) {
      this.currentTokenIndex++;
      return currentToken;
    } else {
      console.log(currentToken);
      throw new Error(`Expected ${type}, got ${currentToken.type}`);
    }
  }

  isNext(type: TokenType) {
    if (this.currentTokenIndex >= this.tokens.length) throw new Error("Unexpected end of file");
    const currentToken = this.tokens[this.currentTokenIndex];
    return currentToken.type === type;
  }
}

async function main() {
  const file = await fs.readFile("./examples/RunMe.java", "utf8");
  const lexer = new Lexer(file);
  const tokens = lexer.lex();
  const parser = new Parser(tokens);
  const statements = parser.parseRootLevel();

  console.log(statements);
}

main();
