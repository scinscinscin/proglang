import { Token } from "./lexer";
import { MethodDeclaration } from "./Statement";
import { ClassInstanceValue, InternalMethodValue, StringValue, Value } from "./Value";

export class Environment {
  parent?: Environment;
  underlying: Map<string, Value>;

  constructor(parent?: Environment) {
    this.parent = parent;
    this.underlying = new Map();
  }

  getValue(name: string): Value {
    if (this.underlying.has(name)) return this.underlying.get(name)!;
    else if (this.parent) return this.parent.getValue(name);
    else throw new Error("Undefined variable");
  }

  setValue(name: string, value: Value) {
    this.underlying.set(name, value);
  }

  getKeys(): string[] {
    return [...this.underlying.keys(), ...(this.parent ? this.parent.getKeys() : [])] as string[];
  }
}

export function createStandardLibrary() {
  const environment = new Environment();

  const println = new InternalMethodValue<[StringValue]>(
    environment,
    [{ name: "value", type: { base: new Token(), dim: 0 } }],
    (value) => {
      console.log(value.value);
      return null as any as Value; // TODO will break
    }
  );

  const out = new ClassInstanceValue(new Map([["println", println]]));
  const System = new ClassInstanceValue(new Map([["out", out]]));
  environment.setValue("System", System);

  return environment;
}

export class Interpreter {
  public environment: Environment;
  constructor(environment: Environment) {
    this.environment = environment;
  }
}
