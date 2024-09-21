import { extname } from "path";
import { Environment, Interpreter } from "./Interpreter";
import { Token } from "./lexer";
import { MethodDeclaration, Statement, TypeDefinition } from "./Statement";
import { Expression } from "./Expression";

export abstract class Value {
  abstract value;
  abstract dotAccess(key: string): Value; // throws an error if the value is not dot accessible
  abstract callFunction(args: Value[]): Value; // throws an error if the value is not callable
}

export class StringValue extends Value {
  constructor(public value: string) {
    super();
  }

  dotAccess(key: string): Value {
    throw new Error("Strings are not dot accessible");
  }

  callFunction(args: Value[]): Value {
    throw new Error("Strings are not callable");
  }
}

export class NullValue extends Value {
  value = "[INTERNAL] NullValue";

  dotAccess(key: string): Value {
    throw new Error("Null is not dot accessible");
  }

  callFunction(args: Value[]): Value {
    throw new Error("Null is not callable");
  }
}

export interface Hashmapish {
  get(key: string): Value;
  getAllKeys(): string[];
}

export class PackageValue extends Value implements Hashmapish {
  value = "[INTERNAL] PackageValue";

  constructor(public underlying: Map<string, Value>) {
    super();
  }

  dotAccess(key: string): Value {
    return this.get(key);
  }

  get(key: string): Value {
    const ret = this.underlying.get(key);
    if (ret) return ret;
    else throw new Error("No value with key");
  }

  getAllKeys(): string[] {
    return [...this.underlying.keys()];
  }

  callFunction(args: Value[]): Value {
    throw new Error("Packages are not callable");
  }
}

export abstract class ClassValue extends Value {
  public statics: Map<string, Value> = new Map();
  public nonStatics: Map<string, Value> = new Map();
  value = "[INTERNAL] ClassValue";

  dotAccess(key: string): Value {
    if (this.statics.has(key)) return this.statics.get(key)!;
    else throw new Error("No value with key");
  }

  hasMainMethod(): boolean {
    return this.statics.has("main") && this.statics.get("main")! instanceof UserDefinedMethodValue;
  }
}

export class InternalClassValue extends ClassValue {
  constructor(statics: Map<string, Value>, nonStatics: Map<string, Value>) {
    super();
    this.statics = statics;
    this.nonStatics = nonStatics;
  }

  callFunction(args: Value[]): Value {
    return new ClassInstanceValue(this.nonStatics);
  }
}

export class UserDefinedClassValue extends ClassValue {
  constructor(methods: MethodDeclaration[], public environment: Environment) {
    super();

    for (const method of methods) {
      const methodName = method.name.lexeme;
      const value = new UserDefinedMethodValue(this.environment, method);

      if (method.isStatic) this.statics.set(methodName, value);
      else this.nonStatics.set(methodName, value);
    }
  }

  callFunction(args: Value[]): Value {
    return new UserDefinedClassInstanceValue(this, this.nonStatics);
  }
}

export class ClassInstanceValue extends Value {
  value = "[INTERNAL] ClassInstanceValue";
  underlying: Map<string, Value> = new Map();

  constructor(properties: Map<string, Value>) {
    super();
    for (const [key, value] of properties) {
      this.underlying.set(key, value);
    }
  }

  dotAccess(key: string): Value {
    if (this.underlying.has(key)) return this.underlying.get(key)!;
    else throw new Error("No value with key");
  }

  callFunction(args: Value[]): Value {
    throw new Error("Class instances are not callable");
  }
}

export class UserDefinedClassInstanceValue extends ClassInstanceValue {
  constructor(public classConstructor: UserDefinedClassValue, properties: Map<string, Value>) {
    super(properties);
  }

  dotAccess(key: string): Value {
    if (key === "$class") return this.classConstructor;
    else return super.dotAccess(key);
  }
}

export abstract class MethodValue extends Value {
  value = "[INTERNAL] MethodValue";

  environment: Environment;
  abstract parameters: { type: TypeDefinition; name: string }[];

  constructor(environment: Environment) {
    super();
    this.environment = environment;
  }

  dotAccess(key: string): Value {
    throw new Error("Methods are not dot accessible");
  }

  abstract callFunction(args: Value[]): Value;
}

export class UserDefinedMethodValue extends MethodValue {
  body: Statement[];
  parameters: { type: TypeDefinition; name: string }[];

  constructor(environment: Environment, methodDeclaration: MethodDeclaration) {
    super(environment);
    this.body = methodDeclaration.body;
    this.parameters = methodDeclaration.parameters.map((e) => ({ type: e.type, name: e.name.lexeme }));
  }

  callFunction(args: Value[]): Value {
    if (args.length !== this.parameters.length)
      throw new Error(`Wrong number of arguments. Expected ${this.parameters.length}, got ${args.length}`);

    const newEnvironment = new Environment(this.environment);
    for (let i = 0; i < this.parameters.length; i++) {
      const parameter = this.parameters[i];
      newEnvironment.setValue(parameter.name, args[i]);
    }

    for (const statement of this.body) {
      statement.visit(new Interpreter(newEnvironment));
    }

    return null as any;
  }
}

export class InternalMethodValue<ArgValues extends Value[]> extends MethodValue {
  constructor(
    environment: Environment,
    public parameters: { type: TypeDefinition; name: string }[],
    public implementation: (...parameters: ArgValues) => Value
  ) {
    super(environment);
  }

  callFunction(args: Value[]): Value {
    if (args.length !== this.parameters.length)
      throw new Error(`Wrong number of arguments. Expected ${this.parameters.length}, got ${args.length}`);

    const newEnvironment = new Environment(this.environment);
    for (let i = 0; i < this.parameters.length; i++) {
      const parameter = this.parameters[i];
      newEnvironment.setValue(parameter.name, args[i]);
    }

    return this.implementation(...(args as any));
  }
}
