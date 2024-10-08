export type TokenType =
  | "IDENTIFIER"
  | "NUMBER"
  | "STRING"
  | "KEYWORD"
  | (typeof symbolMapping)[keyof typeof symbolMapping];

const keywords = ["if", "else", "while", "for", "return", "true", "false", "class", "import", "new"] as const;
export type Keyword = (typeof keywords)[number];
const isKeyword = (keyword: string): keyword is Keyword => keywords.includes(keyword as Keyword);

export class Token {
  type: TokenType;
  lexeme: string;
  keyword?: Keyword;
}

const isAlphabetic = (character: string) => character.match(/[a-zA-Z]/);
const isNumeric = (character: string) => character.match(/[0-9]/);
const isAlphanumeric = (character: string) => isAlphabetic(character) || isNumeric(character);
const isWhitespace = (character: string) => character.match(/\s/);
const symbolMapping = {
  "+": "PLUS",
  "-": "MINUS",
  ".": "DOT",
  "(": "LPAREN",
  ")": "RPAREN",
  "{": "LBRACE",
  "}": "RBRACE",
  ";": "SEMICOLON",
  ",": "COMMA",
  "=": "ASSIGN",
  "*": "STAR",
  "/": "SLASH",
  "%": "PERCENT",
  "[": "LBRACKET",
  "]": "RBRACKET",
} as const;

export class Lexer {
  input: string;
  currentCharacterIndex = 0;
  tokens: Token[] = [];

  constructor(input: string) {
    this.tokens = [];
    this.input = input;
  }

  lex() {
    while (this.currentCharacterIndex < this.input.length) {
      const currentCharacter = this.input[this.currentCharacterIndex];

      if (isWhitespace(currentCharacter)) this.whitespace();
      else if (isAlphabetic(currentCharacter)) this.identifier();
      else if (isNumeric(currentCharacter)) this.number();
      else if (currentCharacter === '"') this.string();
      else {
        const symbol = symbolMapping[currentCharacter];
        if (symbol) {
          this.tokens.push({ type: symbol, lexeme: currentCharacter });
          this.currentCharacterIndex++;
        }
      }
    }

    return this.tokens;
  }

  identifier() {
    let identifier = "";

    do {
      const currentCharacter = this.input[this.currentCharacterIndex];
      identifier += currentCharacter;

      this.currentCharacterIndex++;
    } while (isAlphanumeric(this.input[this.currentCharacterIndex]));

    if (isKeyword(identifier)) {
      this.tokens.push({ type: "KEYWORD", lexeme: identifier, keyword: identifier as Keyword });
    } else {
      this.tokens.push({ type: "IDENTIFIER", lexeme: identifier });
    }
  }

  string() {
    this.currentCharacterIndex++;
    let string = "";

    while (this.input[this.currentCharacterIndex] !== '"') {
      string += this.input[this.currentCharacterIndex];
      this.currentCharacterIndex++;
    }

    this.tokens.push({ type: "STRING", lexeme: string });
    this.currentCharacterIndex++;
  }

  number() {
    /** NO OP */
    let numberString = "";
    let fractionalPart = "";

    do {
      numberString += this.input[this.currentCharacterIndex];
      this.currentCharacterIndex++;
    } while (isNumeric(this.input[this.currentCharacterIndex]));

    if (this.input[this.currentCharacterIndex] === ".") {
      this.currentCharacterIndex++;

      if (!isNumeric(this.input[this.currentCharacterIndex]))
        throw new Error("Failed to create number, expected digit after decimal point");

      while (isNumeric(this.input[this.currentCharacterIndex])) {
        fractionalPart += this.input[this.currentCharacterIndex];
        this.currentCharacterIndex++;
      }
    }

    return this.tokens.push({ type: "NUMBER", lexeme: numberString + "." + fractionalPart });
  }

  whitespace() {
    do {
      this.currentCharacterIndex++;
    } while (this.currentCharacterIndex < this.input.length && isWhitespace(this.input[this.currentCharacterIndex]));
  }
}
