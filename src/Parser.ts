import { Token, TokenType } from "./lexer";
import { NumberValue, StringValue, Value } from "./Value";
import {
  ClassDeclarationStatement,
  ExpressionStatement,
  ImportStatement,
  MethodDeclaration,
  Statement,
  VariableDeclarationStatement,
} from "./Statement";
import {
  AssignmentExpression,
  BinaryExpression,
  BinaryOperator,
  DotAccessExpression,
  Expression,
  IdentifierExpression,
  LiteralExpression,
  MethodCallExpression,
} from "./Expression";

const accessModifiers = ["public", "private", "protected", "package-private"] as const;
type AccessModifier = (typeof accessModifiers)[number];
const isAccessModifier = (keyword: string): keyword is AccessModifier =>
  accessModifiers.includes(keyword as AccessModifier);

type TypeDefinition = { base: Token; dim: number };

export class Parser {
  tokens: Token[];
  currentTokenIndex = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseRootLevel() {
    const statements = [] as Statement[];
    while (this.currentTokenIndex < this.tokens.length) statements.push(this.parseStatement());
    return statements;
  }

  parseStatement(): Statement {
    const currentToken = this.tokens[this.currentTokenIndex];
    if (currentToken.type === "KEYWORD" && currentToken.keyword === "import") return this.parseImportStatement();
    else if (currentToken.type === "KEYWORD" && currentToken.keyword === "class") return this.parseClassDeclaration();

    const variableDeclaration = this.tryParseVariableDeclaration();
    if (variableDeclaration) return variableDeclaration;

    return this.parseExpressionStatement();
  }

  tryParseVariableDeclaration() {
    const _shadowCurrentTokenIndex = this.currentTokenIndex;
    try {
      const type = this.parseType();
      const variableName = this.expect("IDENTIFIER");

      if (this.isNext("SEMICOLON")) {
        this.currentTokenIndex++;
        return new VariableDeclarationStatement(type, variableName, null);
      } else if (this.isNext("ASSIGN")) {
        this.currentTokenIndex++;

        const value = this.parseExpression();
        this.expect("SEMICOLON");
        return new VariableDeclarationStatement(type, variableName, value);
      } else throw new Error("Was not able to build variable declaration");
    } catch (err) {
      this.currentTokenIndex = _shadowCurrentTokenIndex;
      return null;
    }
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
    return new ImportStatement(path);
  }

  parseClassDeclaration(): ClassDeclarationStatement {
    this.currentTokenIndex++;
    const name = this.expect("IDENTIFIER");
    this.expect("LBRACE");

    const methods = [] as MethodDeclaration[];

    while (!this.isNext("RBRACE")) {
      const methodDeclaration = this.parseMethodDeclaration();
      methods.push(methodDeclaration);
    }

    this.expect("RBRACE");
    return new ClassDeclarationStatement(name, methods);
  }

  parseExpressionStatement() {
    const expression = this.parseExpression();
    this.expect("SEMICOLON");
    return new ExpressionStatement(expression);
  }

  parseExpression() {
    return this.parseTerm();
  }

  parseTerm() {
    let expression = this.parseFactor();

    while (this.isNext("PLUS") || this.isNext("MINUS")) {
      const operator = this.expect("PLUS", "MINUS");
      const right = this.parseFactor();
      expression = new BinaryExpression(expression, right, operator.type as BinaryOperator);
    }

    return expression;
  }

  parseFactor() {
    let expression = this.parseExpressionEndpoint();

    while (this.isNext("STAR") || this.isNext("SLASH") || this.isNext("PERCENT")) {
      const operator = this.expect("STAR", "SLASH", "PERCENT");
      const right = this.parseExpressionEndpoint();
      expression = new BinaryExpression(expression, right, operator.type as BinaryOperator);
    }

    return expression;
  }

  parseAssignmentExpression() {
    const left = this.parseIdentifierStack();

    if (this.isNext("ASSIGN")) {
      this.currentTokenIndex++;
      const right = this.parseExpression();
      return new AssignmentExpression(left, right);
    }

    return left;
  }

  parseExpressionEndpoint() {
    if (this.isNext("IDENTIFIER")) return this.parseAssignmentExpression();
    else if (this.isNext("STRING") || this.isNext("NUMBER")) return this.parseLiteralExpression();
    else if (this.isNext("KEYWORD") && this.tokens[this.currentTokenIndex].keyword === "new")
      return this.parseNewExpression();

    throw new Error("Was unable to build expression");
  }

  parseIdentifierStack() {
    const identifier = this.expect("IDENTIFIER");

    let expression: Expression = new IdentifierExpression(identifier);
    if (this.isNext("DOT")) expression = this.parseDotAccessExpression(expression);

    while (this.isNext("LPAREN")) {
      this.expect("LPAREN");
      let args = [] as Expression[];
      if (!this.isNext("RPAREN")) args = this.parseArgumentList();
      this.expect("RPAREN");

      expression = new MethodCallExpression(expression, args);
    }

    return expression;
  }

  parseNewExpression() {
    this.currentTokenIndex++;
    return this.parseIdentifierStack();
  }

  // TODO: parse other literals
  parseLiteralExpression() {
    if (this.isNext("STRING")) return new LiteralExpression(new StringValue(this.expect("STRING").lexeme));
    else if (this.isNext("NUMBER"))
      return new LiteralExpression(new NumberValue(parseFloat(this.expect("NUMBER").lexeme)));
    else throw new Error("Was not able to build literal");
  }

  parseArgumentList() {
    const argList = [] as Expression[];

    while (true) {
      const expression = this.parseExpression();
      argList.push(expression);

      if (this.isNext("COMMA")) {
        this.currentTokenIndex++;
        continue;
      } else if (this.isNext("RPAREN")) break;
    }

    return argList;
  }

  parseDotAccessExpression(parentExpression: Expression) {
    this.expect("DOT");
    const identifier = this.expect("IDENTIFIER");
    const dotAccessExpression = new DotAccessExpression(identifier, parentExpression);
    if (this.isNext("DOT")) return this.parseDotAccessExpression(dotAccessExpression);
    else return dotAccessExpression;
  }

  parseMethodDeclaration() {
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

    const returnType = this.parseType();
    const methodName = this.expect("IDENTIFIER");
    const parameters = this.parseParameterList();

    this.expect("LBRACE");
    const body: Statement[] = [];

    // begin parsing method body
    while (!this.isNext("RBRACE")) {
      const statement = this.parseStatement();
      body.push(statement);
    }

    this.currentTokenIndex++;

    return new MethodDeclaration(accessModifier, isStatic, returnType, methodName, parameters, body);
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
      throw new Error(`Expected ${type}, got ${currentToken.type}, lexeme: ${currentToken.lexeme}`);
    }
  }

  isNext(type: TokenType) {
    if (this.currentTokenIndex >= this.tokens.length) throw new Error("Unexpected end of file");
    const currentToken = this.tokens[this.currentTokenIndex];
    return currentToken.type === type;
  }
}
