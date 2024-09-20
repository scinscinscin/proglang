import { Expression } from "./Expression";
import { Interpreter } from "./Interpreter";
import { Token } from "./lexer";
import { UserDefinedClassValue, StringValue, UserDefinedMethodValue, NullValue } from "./Value";

export abstract class Statement {
  abstract visit(interpreter: Interpreter);
}

const accessModifiers = ["public", "private", "protected", "package-private"] as const;
type AccessModifier = (typeof accessModifiers)[number];

export const isAccessModifier = (keyword: string): keyword is AccessModifier =>
  accessModifiers.includes(keyword as AccessModifier);

export type TypeDefinition = { base: Token; dim: number };

export class ImportStatement extends Statement {
  path: string[] = [];

  constructor(path: string[]) {
    super();
    this.path = path;
  }

  visit(interpreter: Interpreter) {
    console.log("Importing", this.path);
  }
}

export class MethodDeclaration {
  constructor(
    public accessModifier: AccessModifier,
    public isStatic: boolean,
    public returnType: TypeDefinition,
    public name: Token,
    public parameters: { type: TypeDefinition; name: Token }[],
    public body: Statement[]
  ) {}
}

export class ClassDeclarationStatement extends Statement {
  constructor(public name: Token, public methods: MethodDeclaration[]) {
    super();
  }

  visit(interpreter: Interpreter) {
    const newClass = new UserDefinedClassValue(this.methods, interpreter.environment);
    interpreter.environment.setValue(this.name.lexeme, newClass);
  }
}

export class ExpressionStatement extends Statement {
  constructor(public expression: Expression) {
    super();
  }
  visit(interpreter: Interpreter) {
    this.expression.evaluate(interpreter);
  }
}

export class ExecuteMainStatement extends Statement {
  visit(interpreter: Interpreter) {
    // Find a class with a main method and execute it
    const environmentKeys = interpreter.environment.getKeys();
    for (const key of environmentKeys) {
      const classValue = interpreter.environment.getValue(key);
      if (classValue instanceof UserDefinedClassValue && classValue.hasMainMethod()) {
        const mainMethod = classValue.statics.get("main");

        if (mainMethod instanceof UserDefinedMethodValue) {
          mainMethod.callFunction([new StringValue("Hello World")]);
          return;
        }
      }
    }

    throw new Error("No main method found");
  }
}

export class VariableDeclarationStatement extends Statement {
  constructor(public type: TypeDefinition, public name: Token, public value: Expression | null) {
    super();
  }

  visit(interpreter: Interpreter) {
    interpreter.environment.setValue(this.name.lexeme, this.value ? this.value.evaluate(interpreter) : new NullValue());
  }
}
