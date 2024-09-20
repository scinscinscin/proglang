import { Interpreter } from "./Interpreter";
import { Token } from "./lexer";
import { Value } from "./Value";

export abstract class Expression {
  abstract evaluate(interpreter: Interpreter): Value;
}

export class IdentifierExpression extends Expression {
  identifier: Token;
  constructor(identifier: Token) {
    super();
    this.identifier = identifier;
  }

  evaluate(interpreter: Interpreter): Value {
    return interpreter.environment.getValue(this.identifier.lexeme);
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

  evaluate(interpreter: Interpreter): Value {
    const parentValue = this.parentExpr.evaluate(interpreter);
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

  evaluate(interpreter: Interpreter): Value {
    const methodValue = this.method.evaluate(interpreter);
    return methodValue.callFunction(this.args.map((arg) => arg.evaluate(interpreter)));
  }
}

export class LiteralExpression extends Expression {
  constructor(public value: Value) {
    super();
  }

  evaluate(interpreter: Interpreter): Value {
    return this.value;
  }
}

// export class NewExpression extends MethodCallExpression {
//   constructor(method: Expression, args: Expression[]) {
//     super(method, args);
//   }
// }
