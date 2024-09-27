import { Interpreter } from "./Interpreter";
import { Token } from "./lexer";
import { NumberValue, StringValue, Value } from "./Value";

export abstract class Expression {
  abstract evaluate(interpreter: Interpreter): Promise<Value>;
  public isLValue = (): this is AssignableExpression => false;
}

interface AssignableExpression {
  assign(interpreter: Interpreter, newValue: Value): void;
}

export class IdentifierExpression extends Expression implements AssignableExpression {
  identifier: Token;
  public isLValue = (): this is AssignableExpression => true;

  constructor(identifier: Token) {
    super();
    this.identifier = identifier;
  }

  async evaluate(interpreter: Interpreter): Promise<Value> {
    return interpreter.environment.get(this.identifier.lexeme);
  }

  assign(interpreter: Interpreter, newValue: Value) {
    interpreter.environment.setValue(this.identifier.lexeme, newValue);
  }
}

export class AssignmentExpression extends Expression {
  left: Expression;
  right: Expression;

  constructor(left: Expression, right: Expression) {
    super();
    this.left = left;
    this.right = right;
  }

  async evaluate(interpreter: Interpreter): Promise<Value> {
    if (!this.left.isLValue()) throw new Error("Left side of assignment must be assignable");

    const rightValue = await this.right.evaluate(interpreter);
    this.left.assign(interpreter, rightValue);
    return rightValue;
  }
}

export type BinaryOperator = "PLUS" | "MINUS" | "STAR" | "SLASH" | "PERCENT";

export class BinaryExpression extends Expression {
  left: Expression;
  right: Expression;
  operator: BinaryOperator;

  constructor(left: Expression, right: Expression, operator: BinaryOperator) {
    super();
    this.left = left;
    this.right = right;
    this.operator = operator;
  }

  number_number(leftValue: NumberValue, rightValue: NumberValue) {
    const result =
      this.operator === "PLUS"
        ? leftValue.value + rightValue.value
        : this.operator === "MINUS"
        ? leftValue.value - rightValue.value
        : this.operator === "STAR"
        ? leftValue.value * rightValue.value
        : this.operator === "SLASH"
        ? leftValue.value / rightValue.value
        : this.operator === "PERCENT"
        ? leftValue.value % rightValue.value
        : (null as any);

    if (result === null) throw new Error("Binary expressions can only be performed on numbers");
    return new NumberValue(result);
  }

  string_string(left: string, right: string) {
    return new StringValue(left + right);
  }

  async evaluate(interpreter: Interpreter): Promise<Value> {
    const leftValue = await this.left.evaluate(interpreter);
    const rightValue = await this.right.evaluate(interpreter);

    if (leftValue instanceof NumberValue && rightValue instanceof NumberValue)
      return this.number_number(leftValue, rightValue);
    else if (leftValue instanceof StringValue) return this.string_string(leftValue.toString(), rightValue.toString());

    throw new Error("Unsupported binary expresion types");
  }
}

export class DotAccessExpression extends Expression {
  identifier: Token;
  parentExpr: Expression;

  constructor(identifier: Token, parentExpr: Expression) {
    super();
    this.identifier = identifier;
    this.parentExpr = parentExpr;
  }

  async evaluate(interpreter: Interpreter): Promise<Value> {
    const parentValue = await this.parentExpr.evaluate(interpreter);
    return parentValue.dotAccess(this.identifier.lexeme);
  }
}

export class MethodCallExpression extends Expression {
  method: Expression;
  args: Expression[];

  constructor(method: Expression, args: Expression[]) {
    super();
    this.method = method;
    this.args = args;
  }

  async evaluate(interpreter: Interpreter): Promise<Value> {
    const methodValue = await this.method.evaluate(interpreter);
    return methodValue.callFunction(await Promise.all(this.args.map((arg) => arg.evaluate(interpreter))));
  }
}

export class LiteralExpression extends Expression {
  constructor(public value: Value) {
    super();
  }

  async evaluate(interpreter: Interpreter): Promise<Value> {
    return this.value;
  }
}

// export class NewExpression extends MethodCallExpression {
//   constructor(method: Expression, args: Expression[]) {
//     super(method, args);
//   }
// }
